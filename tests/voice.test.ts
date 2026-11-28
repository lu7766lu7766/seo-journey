import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { bg, choice, effect, npc, opt, say, scene, show, when } from '@/engine'
import { flag } from '@/engine/cond'
import { SceneRunner } from '@/engine/runner'
import { isVoicedSpeaker, sha1Hex, voiceKey, VOICED_SPEAKERS } from '@/audio/voiceKey'
import { lookupVoice, parseVoiceManifest, sceneOfLine, voiceManifestKey } from '@/audio/voiceManifest'
import {
  DUCK_DOWN_SEC,
  DUCK_UP_SEC,
  VOICE_BUFFER_CAP,
  VOICE_DUCK_GAIN,
  VOICE_LOAD_TIMEOUT_MS,
  VOICE_PREFETCH,
  VoicePlayer,
  type VoiceBackend,
} from '@/audio/voicePlayer'
import { autoAdvanceDelay, isVoiceBusy } from '@/ui/autoAdvance'
import { makeHost } from './helpers'

describe('voiceKey：穩定雜湊', () => {
  it('sha1Hex 與 node:crypto 一致（含中文、空字串、跨區塊長度）', () => {
    for (const t of ['', 'abc', '謝謝你，{name}。', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), '一'.repeat(300), 'a\nb 𠮷']) {
      expect(sha1Hex(t)).toBe(createHash('sha1').update(t).digest('hex'))
    }
  })

  it('key ＝ SHA-1(說話者 + \\n + 原文) 的前 12 碼；含 {name} 佔位符的原文', () => {
    expect(voiceKey('rin', '謝謝你，{name}。')).toBe(createHash('sha1').update('rin\n謝謝你，{name}。').digest('hex').slice(0, 12))
    expect(voiceKey('rin', 'x')).toMatch(/^[0-9a-f]{12}$/)
  })

  it('同一個說話者＋原文永遠同一個 key；說話者或文字不同就不同（文字一改就失效）', () => {
    expect(voiceKey('rin', '你好')).toBe(voiceKey('rin', '你好'))
    expect(voiceKey('rin', '你好')).not.toBe(voiceKey('hare', '你好'))
    expect(voiceKey('rin', '你好')).not.toBe(voiceKey('rin', '你好。'))
    expect(voiceKey('rin', '{name}，你好')).not.toBe(voiceKey('rin', '小明，你好')) // 用原文（含佔位符），不是代入後的文字
  })

  it('NPC 連同名牌一起算；其他說話者忽略名牌', () => {
    expect(voiceKey('npc', '別急', '社長')).not.toBe(voiceKey('npc', '別急', '店員'))
    expect(voiceKey('rin', '別急', 'x')).toBe(voiceKey('rin', '別急'))
  })

  it('有語音的說話者：凜、晴、未來、索老師、黑川、NPC；主角與旁白沒有', () => {
    expect([...VOICED_SPEAKERS].sort()).toEqual(['hare', 'kuro', 'mirai', 'npc', 'rin', 'sensei'])
    expect(isVoicedSpeaker('me')).toBe(false)
    expect(isVoicedSpeaker('narr')).toBe(false)
    expect(isVoicedSpeaker('rin')).toBe(true)
  })

  it('劇本順序調整、場景裡別處插入台詞，key 不變（與 lineId 無關）', () => {
    const a = scene('s', [say('rin', 'smile', 'A'), say('rin', 'smile', 'B')])
    const b = scene('s', [say('narr', undefined, '插入'), say('rin', 'smile', 'B'), say('rin', 'smile', 'A')])
    const keys = (sc: ReturnType<typeof scene>) => {
      const { host } = makeHost()
      const r = new SceneRunner(sc, host)
      const out: Record<string, string> = {}
      for (let p = r.start(); p.kind === 'say'; p = r.advance()) if (p.voice) out[p.text] = p.voice
      return out
    }
    expect(keys(a)).toEqual(keys(b))
  })
})

describe('Runner：Pause 帶語音鍵', () => {
  it('有語音的說話者帶 voice（原文含 {name}，與代入的名字無關）；主角與旁白沒有', () => {
    const { host } = makeHost('小明')
    const r = new SceneRunner(scene('t', [say('me', undefined, '我'), say('narr', undefined, '旁白'), say('rin', 'smile', '你好，{name}'), npc('社長', '別急')]), host)
    const p1 = r.start()
    expect(p1.kind === 'say' && p1.voice).toBeUndefined()
    const p2 = r.advance()
    expect(p2.kind === 'say' && p2.voice).toBeUndefined()
    const p3 = r.advance()
    expect(p3).toMatchObject({ text: '你好，小明', voice: voiceKey('rin', '你好，{name}') })
    const p4 = r.advance()
    expect(p4).toMatchObject({ voice: voiceKey('npc', '別急', '社長') })
  })

  it('upcomingVoiced：往後看幾行有語音的台詞，略過旁白，遇到選項／分支就停', () => {
    const { host } = makeHost()
    const sc = scene('t', [
      say('rin', 'smile', 'r1'),
      say('narr', undefined, 'n'),
      bg('gate'),
      say('hare', 'smile', 'h1'),
      effect({ stamina: 1 }),
      show('mirai'),
      say('mirai', 'smile', 'm1'),
      say('rin', 'smile', 'r2'),
      choice([opt('A', undefined, [say('rin', 'smile', 'a')])]),
      say('rin', 'smile', 'after'),
    ])
    const r = new SceneRunner(sc, host)
    r.start()
    expect(r.upcomingVoiced(3).map((l) => l.text)).toEqual(['h1', 'm1', 'r2'])
    expect(r.upcomingVoiced(2).map((l) => l.text)).toEqual(['h1', 'm1'])
    r.advance() // narr
    r.advance() // h1
    r.advance() // m1
    r.advance() // r2 — 後面是選項，不預測
    expect(r.upcomingVoiced(3)).toEqual([])
  })

  it('upcomingVoiced：區塊結束後接著看外層，if 不預測；不改變 runner 狀態', () => {
    const { host } = makeHost()
    const sc = scene('t', [
      choice([opt('A', undefined, [say('rin', 'smile', 'a1'), say('rin', 'smile', 'a2')])]),
      say('hare', 'smile', 'after1'),
      when(flag('x'), [say('rin', 'smile', 'no')]),
      say('hare', 'smile', 'unreached'),
    ])
    const r = new SceneRunner(sc, host)
    r.start()
    r.choose(0) // a1
    const before = r.snapshot()
    expect(r.upcomingVoiced(3).map((l) => l.text)).toEqual(['a2', 'after1'])
    expect(r.snapshot()).toEqual(before)
  })
})

describe('parseVoiceManifest / lookupVoice', () => {
  const K = 'a6f9021fcbb7'
  it('解析契約範例；src 必填、duration 選填', () => {
    const m = parseVoiceManifest({ [`date-rin-1/${K}`]: { src: '/audio/voice/date-rin-1/a6f9021fcbb7.mp3', duration: 2.4 }, [`w1/${K}`]: { src: '/x.mp3' } })
    expect(m[`date-rin-1/${K}`]).toEqual({ src: '/audio/voice/date-rin-1/a6f9021fcbb7.mp3', duration: 2.4 })
    expect(m[`w1/${K}`]).toEqual({ src: '/x.mp3' })
  })

  it('本輪的空 manifest 與壞掉的內容都不丟例外，壞條目被丟棄', () => {
    expect(parseVoiceManifest({})).toEqual({})
    expect(parseVoiceManifest(null)).toEqual({})
    expect(parseVoiceManifest([])).toEqual({})
    expect(parseVoiceManifest('x')).toEqual({})
    const m = parseVoiceManifest({
      [`w1/${K}`]: { src: '' },
      [`w2/${K}`]: 'nope',
      'w3/notakey': { src: '/a.mp3' },
      [`w4/${K}`]: { src: '/ok.mp3', duration: -3 },
    })
    expect(m).toEqual({ [`w4/${K}`]: { src: '/ok.mp3' } })
  })

  it('lookupVoice：有條目回傳，缺檔／沒有鍵／manifest 尚未載入一律 undefined', () => {
    const m = parseVoiceManifest({ [`w1/${K}`]: { src: '/a.mp3' } })
    expect(lookupVoice(m, 'w1', K)).toEqual({ src: '/a.mp3' })
    expect(lookupVoice(m, 'w2', K)).toBeUndefined()
    expect(lookupVoice(m, 'w1', 'ffffffffffff')).toBeUndefined()
    expect(lookupVoice(m, 'w1', undefined)).toBeUndefined()
    expect(lookupVoice(null, 'w1', K)).toBeUndefined()
    expect(voiceManifestKey('w1', K)).toBe(`w1/${K}`)
    expect(sceneOfLine('date-rin-1#12.0.3')).toBe('date-rin-1')
  })
})

// ───────── VoicePlayer（假後端）─────────
const K1 = '111111111111'
const K2 = '222222222222'
const K3 = '333333333333'
const MANIFEST = {
  [`s/${K1}`]: { src: '/audio/voice/s/1.mp3', duration: 1 },
  [`s/${K2}`]: { src: '/audio/voice/s/2.mp3' },
}

function setupVoice(opts: { voiceOn?: boolean; manifest?: unknown; unlocked?: boolean; unlockOk?: boolean; failSrc?: string[]; hold?: string[] } = {}) {
  const flags = { voiceOn: opts.voiceOn ?? true, unlocked: opts.unlocked ?? true }
  const log: string[] = []
  const ducks: { gain: number; ramp: number }[] = []
  const plays: { src: string; end: () => void; stops: number[] }[] = []
  const pending = new Map<string, (b: unknown | null) => void>()
  const hold = new Set(opts.hold ?? [])
  const backend: VoiceBackend = {
    loadVoiceManifest: () => {
      log.push('manifest')
      return Promise.resolve(opts.manifest ?? MANIFEST)
    },
    loadBuffer: (src) => {
      log.push(`load ${src}`)
      if (opts.failSrc?.includes(src)) return Promise.resolve(null)
      if (hold.has(src)) return new Promise((r) => pending.set(src, r))
      return Promise.resolve({ buf: src })
    },
    playVoiceFile: (b, _g, end) => {
      const p = { src: (b as { buf: string }).buf, end, stops: [] as number[] }
      plays.push(p)
      return { stop: (f) => void p.stops.push(f) }
    },
    setBgmDuck: (gain, ramp) => void ducks.push({ gain, ramp }),
  }
  const player = new VoicePlayer({
    backend,
    getVoiceOn: () => flags.voiceOn,
    unlock: () => Promise.resolve(opts.unlockOk ?? true),
    isUnlocked: () => flags.unlocked,
  })
  const tick = async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
  }
  return { player, flags, log, ducks, plays, tick, release: (src: string) => pending.get(src)?.({ buf: src }) }
}

describe('VoicePlayer：播放行為', () => {
  it('顯示一行時播放該行語音；狀態 loading → playing → ended；BGM 壓低 −6 dB，播完回復', async () => {
    const s = setupVoice()
    s.player.play('s#1', 's', K1)
    expect(s.player.getState()).toEqual({ id: 's#1', status: 'loading' })
    await s.tick()
    expect(s.plays.map((p) => p.src)).toEqual(['/audio/voice/s/1.mp3'])
    expect(s.player.getState()).toEqual({ id: 's#1', status: 'playing' })
    expect(s.ducks).toEqual([{ gain: VOICE_DUCK_GAIN, ramp: DUCK_DOWN_SEC }])
    expect(VOICE_DUCK_GAIN).toBeCloseTo(0.501, 2) // −6 dB
    s.plays[0].end()
    expect(s.player.getState()).toEqual({ id: 's#1', status: 'ended' })
    expect(s.ducks[1]).toEqual({ gain: 1, ramp: DUCK_UP_SEC })
  })

  it('推進／跳過／選項出現／開選單／回標題（stop）：短淡出並恢復 BGM', async () => {
    const s = setupVoice()
    s.player.play('s#1', 's', K1)
    await s.tick()
    s.player.stop()
    expect(s.plays[0].stops).toHaveLength(1)
    expect(s.plays[0].stops[0]).toBeGreaterThan(0)
    expect(s.plays[0].stops[0]).toBeLessThan(0.3)
    expect(s.player.getState()).toBeNull()
    expect(s.ducks.at(-1)).toEqual({ gain: 1, ramp: DUCK_UP_SEC })
    s.plays[0].end() // 淡出結束後後端才回報 ended：不能把狀態弄回 ended
    expect(s.player.getState()).toBeNull()
  })

  it('接著播下一行：舊的淡出、新的播放，BGM 保持壓低（不忽大忽小）', async () => {
    const s = setupVoice()
    s.player.play('s#1', 's', K1)
    await s.tick()
    s.player.play('s#2', 's', K2)
    await s.tick()
    expect(s.plays.map((p) => p.src)).toEqual(['/audio/voice/s/1.mp3', '/audio/voice/s/2.mp3'])
    expect(s.plays[0].stops).toHaveLength(1)
    expect(s.ducks).toEqual([{ gain: VOICE_DUCK_GAIN, ramp: DUCK_DOWN_SEC }]) // 只壓低一次
    s.plays[0].end() // 舊的聲音的 ended 不影響新的
    expect(s.player.getState()).toEqual({ id: 's#2', status: 'playing' })
  })

  it('載入途中被推進：過期的載入結果被丟棄，不會事後播出', async () => {
    const s = setupVoice({ hold: ['/audio/voice/s/1.mp3'] })
    s.player.play('s#1', 's', K1)
    await s.tick()
    s.player.stop()
    s.release('/audio/voice/s/1.mp3')
    await s.tick()
    expect(s.plays).toHaveLength(0)
    expect(s.player.getState()).toBeNull()
  })

  it('缺檔（manifest 沒有）→ 狀態 none，不載入、不壓 BGM、不出聲（行為與沒有語音機制相同）', async () => {
    const s = setupVoice({ manifest: {} })
    s.player.play('s#1', 's', K3)
    await s.tick()
    expect(s.player.getState()).toEqual({ id: 's#1', status: 'none' })
    expect(s.plays).toHaveLength(0)
    expect(s.ducks).toEqual([])
    expect(s.log).toEqual(['manifest'])
  })

  it('音檔下載失敗 → none（退回無語音），不壓 BGM；失敗不快取可重試', async () => {
    const s = setupVoice({ failSrc: ['/audio/voice/s/1.mp3'] })
    s.player.play('s#1', 's', K1)
    await s.tick()
    expect(s.player.getState()).toEqual({ id: 's#1', status: 'none' })
    expect(s.ducks).toEqual([])
    s.player.play('s#1', 's', K1)
    await s.tick()
    expect(s.log.filter((l) => l === 'load /audio/voice/s/1.mp3')).toHaveLength(2)
  })

  it('manifest 載入失敗 → none，下次可重試', async () => {
    let fail = true
    const s = setupVoice()
    ;(s.player as unknown as { deps: { backend: VoiceBackend } }).deps.backend.loadVoiceManifest = () => (fail ? Promise.reject(new Error('404')) : Promise.resolve(MANIFEST))
    s.player.play('s#1', 's', K1)
    await s.tick()
    expect(s.player.getState()?.status).toBe('none')
    fail = false
    s.player.play('s#1', 's', K1)
    await s.tick()
    expect(s.player.getState()?.status).toBe('playing')
  })

  it('下載太慢 → 逾時當作沒有語音（自動播放不會卡住）', async () => {
    const s = setupVoice({ hold: ['/audio/voice/s/1.mp3'] })
    const realSetTimeout = globalThis.setTimeout
    const timers: (() => void)[] = []
    globalThis.setTimeout = ((fn: () => void, ms?: number) => {
      if (ms === VOICE_LOAD_TIMEOUT_MS) {
        timers.push(fn)
        return 0 as unknown as ReturnType<typeof setTimeout>
      }
      return realSetTimeout(fn, ms)
    }) as typeof setTimeout
    try {
      s.player.play('s#1', 's', K1)
      await s.tick()
      expect(s.player.getState()?.status).toBe('loading')
      timers.forEach((f) => f())
      await s.tick()
      expect(s.player.getState()).toEqual({ id: 's#1', status: 'none' })
    } finally {
      globalThis.setTimeout = realSetTimeout
    }
  })

  it('尚未解鎖（沒有使用者手勢）→ none', async () => {
    const s = setupVoice({ unlockOk: false })
    s.player.play('s#1', 's', K1)
    await s.tick()
    expect(s.player.getState()?.status).toBe('none')
    expect(s.plays).toHaveLength(0)
  })

  it('訂閱者會收到狀態變化', async () => {
    const s = setupVoice()
    const seen: (string | undefined)[] = []
    const off = s.player.subscribe(() => void seen.push(s.player.getState()?.status))
    s.player.play('s#1', 's', K1)
    await s.tick()
    s.plays[0].end()
    off()
    expect(seen).toEqual(['loading', 'playing', 'ended'])
  })
})

describe('VoicePlayer：語音關閉時完全不載入', () => {
  it('play／prefetch／manifest 都不請求任何檔案（連 manifest 也不抓）', async () => {
    const s = setupVoice({ voiceOn: false })
    s.player.play('s#1', 's', K1)
    s.player.prefetch('s', [K1, K2])
    expect(await s.player.manifest()).toEqual({})
    await s.tick()
    expect(s.log).toEqual([])
    expect(s.plays).toHaveLength(0)
    expect(s.player.getState()).toBeNull()
  })

  it('播放中關閉語音：立刻停止並恢復 BGM；之後再打開就能載入', async () => {
    const s = setupVoice()
    s.player.play('s#1', 's', K1)
    await s.tick()
    s.flags.voiceOn = false
    s.player.settingsChanged()
    expect(s.plays[0].stops).toHaveLength(1)
    expect(s.player.getState()).toBeNull()
    expect(s.ducks.at(-1)?.gain).toBe(1)
    s.flags.voiceOn = true
    s.player.play('s#2', 's', K2)
    await s.tick()
    expect(s.player.getState()).toEqual({ id: 's#2', status: 'playing' })
  })
})

describe('VoicePlayer：預載', () => {
  it('預載接下來最多 3 行（只載有條目的），之後 play 不再下載', async () => {
    const m: Record<string, unknown> = {}
    const keys = ['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc', 'dddddddddddd', 'eeeeeeeeeeee']
    for (const k of keys) m[`s/${k}`] = { src: `/v/${k}.mp3` }
    const s = setupVoice({ manifest: m })
    s.player.prefetch('s', ['ffffffffffff', ...keys]) // 第一個沒有條目；只看前 3 個（VOICE_PREFETCH）
    await s.tick()
    expect(VOICE_PREFETCH).toBe(3)
    expect(s.log.filter((l) => l.startsWith('load'))).toEqual(['load /v/aaaaaaaaaaaa.mp3', 'load /v/bbbbbbbbbbbb.mp3'])
    s.player.play('s#1', 's', 'aaaaaaaaaaaa')
    await s.tick()
    expect(s.log.filter((l) => l === 'load /v/aaaaaaaaaaaa.mp3')).toHaveLength(1)
    expect(s.plays).toHaveLength(1)
  })

  it('尚未解鎖時不預載；緩衝有上限（LRU）', async () => {
    const s = setupVoice({ unlocked: false })
    s.player.prefetch('s', [K1])
    await s.tick()
    expect(s.log).toEqual([])
    const m: Record<string, unknown> = {}
    const ks = Array.from({ length: VOICE_BUFFER_CAP + 3 }, (_, i) => i.toString(16).padStart(12, '0'))
    for (const k of ks) m[`s/${k}`] = { src: `/v/${k}.mp3` }
    const t = setupVoice({ manifest: m })
    for (const k of ks) {
      t.player.play('s#x', 's', k)
      await t.tick()
    }
    t.log.length = 0
    t.player.play('s#x', 's', ks[0]) // 最舊的已被淘汰，要重新下載
    await t.tick()
    expect(t.log).toContain(`load /v/${ks[0]}.mp3`)
    t.log.length = 0
    t.player.play('s#x', 's', ks.at(-1)!) // 最新的還在
    await t.tick()
    expect(t.log.filter((l) => l.startsWith('load'))).toEqual([])
  })
})

describe('自動播放：等語音播完', () => {
  const base = { auto: true, typed: true, isSay: true, overlay: false, skipping: false, voiceBusy: false, autoDelayMs: 1500, textLength: 10 }

  it('沒有語音的行照原本邏輯：間隔 + 字數 × 15ms', () => {
    expect(autoAdvanceDelay(base)).toBe(1500 + 150)
  })

  it('語音載入中或播放中不計時，播完才開始計原本的間隔', () => {
    expect(autoAdvanceDelay({ ...base, voiceBusy: true })).toBeNull()
    expect(autoAdvanceDelay({ ...base, voiceBusy: false })).toBe(1650)
  })

  it('沒打完字、非自動、有覆蓋畫面、快轉、非對白：不計時', () => {
    expect(autoAdvanceDelay({ ...base, typed: false })).toBeNull()
    expect(autoAdvanceDelay({ ...base, auto: false })).toBeNull()
    expect(autoAdvanceDelay({ ...base, overlay: true })).toBeNull()
    expect(autoAdvanceDelay({ ...base, skipping: true })).toBeNull()
    expect(autoAdvanceDelay({ ...base, isSay: false })).toBeNull()
  })

  it('isVoiceBusy：只有「這一行」的 loading／playing 算忙；ended／none／別行／無狀態都不算', () => {
    expect(isVoiceBusy({ id: 'a#1', status: 'loading' }, 'a#1')).toBe(true)
    expect(isVoiceBusy({ id: 'a#1', status: 'playing' }, 'a#1')).toBe(true)
    expect(isVoiceBusy({ id: 'a#1', status: 'ended' }, 'a#1')).toBe(false)
    expect(isVoiceBusy({ id: 'a#1', status: 'none' }, 'a#1')).toBe(false)
    expect(isVoiceBusy({ id: 'a#0', status: 'playing' }, 'a#1')).toBe(false)
    expect(isVoiceBusy(null, 'a#1')).toBe(false)
  })

  it('整合：播放中狀態 busy → 播完 not busy，才得到前進延遲', async () => {
    const s = setupVoice()
    s.player.play('s#1', 's', K1)
    await s.tick()
    const delay = () => autoAdvanceDelay({ ...base, voiceBusy: isVoiceBusy(s.player.getState(), 's#1') })
    expect(delay()).toBeNull()
    s.plays[0].end()
    expect(delay()).toBe(1650)
    // 沒有語音的行（缺檔）：不會卡住自動播放
    s.player.play('s#2', 's', K3)
    await s.tick()
    expect(delay()).not.toBeNull()
  })
})
