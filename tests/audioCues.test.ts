import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const bgmCalls: string[] = []
const state = { current: null as string | null, stopped: 0 }
vi.mock('@/audio', () => ({
  audio: {
    sfx: () => {},
    bgm: (id: string) => {
      bgmCalls.push(id)
      state.current = id
    },
    stopBgm: () => {
      state.stopped++
      state.current = null
    },
    get currentBgm() {
      return state.current
    },
  },
}))

import { isSimScreen, MINIGAME_BGM, SIM_BGM, weeklyReportSfx } from '@/audio/cues'
import { BGM_IDS, BGM_TRACKS, SFX_IDS } from '@/audio/synth'
import { parseManifest } from '@/audio/manifest'
import { loadScene, SCENE_IDS } from '@/content/scenes'
import type { Cmd } from '@/engine/types'
import { enterMinigameBgm } from '@/minigames/minigameBgm'
import { useGame } from '@/store/game'

function* walk(cmds: Cmd[]): Generator<Cmd> {
  for (const c of cmds) {
    yield c
    if (c.k === 'choice') for (const o of c.options) yield* walk(o.then ?? [])
    if (c.k === 'if') {
      yield* walk(c.then)
      yield* walk(c.else ?? [])
    }
  }
}

beforeEach(() => {
  bgmCalls.length = 0
  state.current = null
  state.stopped = 0
  useGame.setState({ pause: { kind: 'end' } })
  useGame.setState((s) => ({ stage: { ...s.stage, bgm: null } }))
})

describe('BGM / SFX id 表', () => {
  it('每個 BGM id 都有合成備援（旋律與低音等長），新 id 與 daily 不同', () => {
    for (const id of BGM_IDS) {
      const t = BGM_TRACKS[id]
      expect(t, id).toBeDefined()
      expect(t.notes.length, id).toBe(t.bass.length)
      expect(t.notes.some((n) => n > 0), id).toBe(true)
    }
    for (const id of ['sim', 'minigame', 'melancholy', 'comedy', 'theme_rin', 'theme_hare', 'theme_mirai'] as const) {
      expect(BGM_TRACKS[id].notes, id).not.toEqual(BGM_TRACKS.daily.notes)
    }
  })
  it('包含報告 6.1 的 12 首與新增音效 shock', () => {
    expect([...BGM_IDS].sort()).toEqual(
      ['title', 'daily', 'sim', 'minigame', 'warm', 'melancholy', 'tense', 'comedy', 'festival', 'theme_rin', 'theme_hare', 'theme_mirai'].sort(),
    )
    expect(SFX_IDS).toContain('shock')
  })
})

describe('全部劇本的 bgm()／sfx() 都用合法 id', () => {
  it('39 份劇本', async () => {
    const bad: string[] = []
    const used = new Set<string>()
    for (const id of SCENE_IDS) {
      const sc = await loadScene(id)
      for (const c of walk(sc.cmds)) {
        if (c.k === 'bgm') {
          used.add(c.id)
          if (!(BGM_IDS as readonly string[]).includes(c.id)) bad.push(`${id}: bgm ${c.id}`)
        }
        if (c.k === 'sfx' && !(SFX_IDS as readonly string[]).includes(c.id)) bad.push(`${id}: sfx ${c.id}`)
      }
    }
    expect(bad).toEqual([])
    // 12 首都有被劇本用到（sim／minigame 是介面與 weekend-rest 用，weekend-rest 也算劇本）
    for (const id of BGM_IDS) if (id !== 'minigame') expect(used.has(id), `${id} 沒被任何劇本使用`).toBe(true)
  })
  it('每份劇本第一個 bgm 之前沒有任何畫面指令會被音樂接錯（開場就有 bgm）', async () => {
    for (const id of SCENE_IDS) {
      const sc = await loadScene(id)
      const firstBgm = sc.cmds.findIndex((c) => c.k === 'bgm')
      expect(firstBgm, id).toBeGreaterThanOrEqual(0)
      expect(firstBgm, id).toBeLessThan(3)
    }
  })
  it('三位女主角的約會場景與結局使用各自的 theme_*', async () => {
    const first = async (id: string) => (await loadScene(id)).cmds.find((c) => c.k === 'bgm') as { id: string }
    for (const [who, theme] of [['rin', 'theme_rin'], ['hare', 'theme_hare'], ['mirai', 'theme_mirai']] as const) {
      for (const n of ['1', '2', '3', 'casual']) expect((await first(`date-${who}-${n}`)).id).toBe(theme)
      expect((await first(`end-${who}`)).id).toBe(theme)
    }
    expect((await first('weekend-rest')).id).toBe(SIM_BGM)
    expect((await first('end-blackhat')).id).toBe('comedy')
    expect((await first('end-bad')).id).toBe('melancholy')
  })
})

describe('非劇本畫面', () => {
  it('養成畫面：沒有劇本在演的 schedule／board／weekend／report 才播 sim', () => {
    for (const p of ['schedule', 'board', 'weekend', 'report']) {
      expect(isSimScreen(p, false)).toBe(true)
      expect(isSimScreen(p, true)).toBe(false)
    }
    for (const p of ['story', 'ending']) expect(isSimScreen(p, false)).toBe(false)
  })
})

describe('MinigameHost 的配樂（enterMinigameBgm）', () => {
  it('劇情中：開啟播 minigame，卸載淡回 stage.bgm，不改寫 stage.bgm', () => {
    useGame.setState({ pause: { kind: 'minigame', lineId: 'x', id: 'w1-quiz' } as never })
    useGame.setState((s) => ({ stage: { ...s.stage, bgm: 'melancholy' } }))
    state.current = 'melancholy'
    const leave = enterMinigameBgm()
    expect(state.current).toBe(MINIGAME_BGM)
    expect(useGame.getState().stage.bgm).toBe('melancholy')
    leave()
    expect(state.current).toBe('melancholy')
    expect(useGame.getState().stage.bgm).toBe('melancholy')
  })
  it('劇情中、stage.bgm 還沒設過 → 回 daily', () => {
    useGame.setState({ pause: { kind: 'minigame', lineId: 'x', id: 'w1-quiz' } as never })
    const leave = enterMinigameBgm()
    leave()
    expect(state.current).toBe('daily')
  })
  it('劇本在結算後立刻換曲：卸載時以最新的 stage.bgm 為準', () => {
    useGame.setState({ pause: { kind: 'minigame', lineId: 'x', id: 'w1-quiz' } as never })
    useGame.setState((s) => ({ stage: { ...s.stage, bgm: 'daily' } }))
    const leave = enterMinigameBgm()
    useGame.setState((s) => ({ stage: { ...s.stage, bgm: 'warm' } })) // 後面的 bgm('warm') 先執行
    state.current = 'warm'
    leave()
    expect(state.current).toBe('warm')
  })
  it('圖鑑練習（沒有劇本在等）：回到進場前正在播的曲子；進場前沒有音樂就停止', () => {
    state.current = 'title'
    const leave = enterMinigameBgm()
    expect(state.current).toBe(MINIGAME_BGM)
    leave()
    expect(state.current).toBe('title')
    state.current = null
    enterMinigameBgm()()
    expect(state.current).toBeNull()
    expect(state.stopped).toBe(1)
  })
})

describe('週報進場音效', () => {
  const prev = { rin: 20, hare: 20, mirai: 20 }
  it('淨進步 grow、淨退步 fail、持平不播', () => {
    expect(weeklyReportSfx(prev, { rin: 25, hare: 20, mirai: 20 })).toBe('grow')
    expect(weeklyReportSfx(prev, { rin: 25, hare: 10, mirai: 20 })).toBe('fail')
    expect(weeklyReportSfx(prev, { rin: 20.2, hare: 19.8, mirai: 20 })).toBeNull()
    expect(weeklyReportSfx({}, { rin: 12, hare: 12, mirai: 12 })).toBeNull()
  })
})

describe('小遊戲音效接線', () => {
  it('過關播 win、失敗播 fail；不再與 unlockCard 重複播 card', () => {
    for (const f of ['Quiz', 'Spot', 'Serp']) {
      const src = readFileSync(join(__dirname, `../src/minigames/${f}.tsx`), 'utf8')
      expect(src, f).toContain("audio.sfx(passed ? 'win' : 'fail')")
      expect(src, f).not.toContain("passed ? 'card'")
    }
  })
})

describe('v2 定案預設版本（manifest default）', () => {
  const m = parseManifest(JSON.parse(readFileSync(join(__dirname, '../public/audio/manifest.json'), 'utf8')))
  it('全 12 首 BGM 與重製／新增 SFX 預設為 c1，沿用的 win 維持 c2', () => {
    for (const id of ['title', 'daily', 'sim', 'minigame', 'warm', 'melancholy', 'tense', 'comedy', 'festival', 'theme_rin', 'theme_hare', 'theme_mirai']) {
      expect(m[`bgm/${id}`].default, `bgm/${id}`).toBe('c1')
    }
    for (const id of ['click', 'blip', 'choice', 'card', 'grow', 'bond', 'fail', 'shock']) {
      expect(m[`sfx/${id}`].default, `sfx/${id}`).toBe('c1')
    }
    expect(m['sfx/win'].default).toBe('c2')
  })
})
