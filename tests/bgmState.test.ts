import { beforeEach, describe, expect, it, vi } from 'vitest'

const bgmCalls: string[] = []
vi.mock('@/audio', () => ({
  audio: {
    sfx: () => {},
    bgm: (id: string) => void bgmCalls.push(id),
    stopBgm: () => {},
    get currentBgm() {
      return bgmCalls.at(-1) ?? null
    },
  },
}))

import { initialStage, reduceStage } from '@/engine/stage'
import { useGame } from '@/store/game'
import { defaultPersisted, migrate, normalizeData, readSave, resumeBgm, writeSave } from '@/store/save'
import { clearMemoryStorage, setStorage } from '@/store/storage'

beforeEach(() => {
  setStorage(null)
  clearMemoryStorage()
  bgmCalls.length = 0
})

describe('stage.bgm', () => {
  it('starts empty and follows bgm commands', () => {
    let s = initialStage()
    expect(s.bgm).toBeNull()
    s = reduceStage(s, { k: 'bgm', id: 'daily' })
    expect(s.bgm).toBe('daily')
    const same = reduceStage(s, { k: 'bgm', id: 'daily' })
    expect(same).toBe(s)
    expect(reduceStage(s, { k: 'bgm', id: 'tense' }).bgm).toBe('tense')
  })
  it('is untouched by other stage commands', () => {
    const s = reduceStage(initialStage(), { k: 'bgm', id: 'warm' })
    expect(reduceStage(s, { k: 'bg', id: 'gate' }).bgm).toBe('warm')
    expect(reduceStage(s, { k: 'hide', who: 'all' }).bgm).toBe('warm')
  })
})

describe('bgm persistence', () => {
  it('round-trips through a save slot', () => {
    const d = defaultPersisted('小明')
    d.stage = reduceStage(d.stage, { k: 'bgm', id: 'festival' })
    writeSave(1, d, 10)
    expect(readSave(1)!.data.stage.bgm).toBe('festival')
  })
  it('reads old saves without the field (v3) as no bgm', () => {
    const stage = { bg: { id: 'gate', time: 'day' }, rain: false, chars: {}, cg: null, flash: 0 }
    const env = migrate({ version: 3, savedAt: 1, label: 'old', data: { playerName: '舊', week: 2, stage } })!
    expect(env.data.stage.bgm).toBeNull()
    expect(env.data.stage.bg.id).toBe('gate')
    expect(normalizeData({ stage }).stage.bgm).toBeNull()
  })
  it('ignores a garbage bgm value', () => {
    expect(normalizeData({ stage: { bgm: 42 } }).stage.bgm).toBeNull()
    expect(normalizeData({ stage: { bgm: '' } }).stage.bgm).toBeNull()
    expect(normalizeData({ stage: 'x' }).stage.bgm).toBeNull()
  })
})

describe('resumeBgm', () => {
  const base = () => defaultPersisted()
  it('prefers the saved bgm', () => {
    const d = base()
    d.stage.bgm = 'tense'
    d.week = 7
    expect(resumeBgm(d)).toBe('tense')
  })
  it('falls back by week / phase when nothing was recorded', () => {
    const d = base()
    expect(resumeBgm(d)).toBe('daily')
    d.week = 3
    d.phase = 'schedule'
    expect(resumeBgm(d)).toBe('daily')
    d.week = 7
    d.phase = 'story'
    expect(resumeBgm(d)).toBe('festival')
    d.phase = 'ending'
    expect(resumeBgm(d)).toBe('warm')
  })
})

describe('store integration', () => {
  it('loadPersisted resumes the saved bgm and writes it back to the stage', async () => {
    const d = defaultPersisted('讀檔者')
    d.stage.bgm = 'warm'
    await useGame.getState().loadPersisted(d)
    expect(bgmCalls).toEqual(['warm'])
    expect(useGame.getState().stage.bgm).toBe('warm')
  })
  it('loadPersisted of an old save without bgm picks a default so the title theme does not linger', async () => {
    const d = defaultPersisted('舊存檔')
    d.week = 2
    d.phase = 'schedule'
    await useGame.getState().loadPersisted(d)
    expect(bgmCalls).toEqual(['daily'])
    expect(useGame.getState().stage.bgm).toBe('daily')
    expect(useGame.getState().toPersisted().stage.bgm).toBe('daily')
  })
  it('a scene bgm command updates stage.bgm and the audio', async () => {
    useGame.getState().newGame('新玩家')
    expect(useGame.getState().stage.bgm).toBeNull()
    await useGame.getState().startScene('prologue')
    expect(bgmCalls[0]).toBe('daily')
    expect(useGame.getState().stage.bgm).toBe('daily')
  })
})
