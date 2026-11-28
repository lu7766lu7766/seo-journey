import { describe, expect, it } from 'vitest'
import { AudioEngine, BLIP_MIN_GAP_MS, FADE_SEC, MAX_SFX_VOICES, type AudioBackend, type BgmFileOptions, type BgmVoice } from '@/audio/engine'
import { dbToGain, loopPosition, parseManifest, pickSource, resolveVariant, type ManifestEntry } from '@/audio/manifest'

describe('dbToGain', () => {
  it('0 dB = 1，±6 dB ≈ ×2 / ×0.5，並限制範圍', () => {
    expect(dbToGain(0)).toBe(1)
    expect(dbToGain(undefined)).toBe(1)
    expect(dbToGain(-6)).toBeCloseTo(0.501, 2)
    expect(dbToGain(6)).toBeCloseTo(1.995, 2)
    expect(dbToGain(-20)).toBeCloseTo(0.1, 5)
    expect(dbToGain(-999)).toBeCloseTo(0.001, 5)
    expect(dbToGain(999)).toBeCloseTo(Math.pow(10, 12 / 20), 5)
    expect(dbToGain(NaN)).toBe(1)
  })
})

/** 舊格式（單一版本）解析後的形狀 */
const legacy = (e: ManifestEntry) => ({ default: 'default', variants: { default: e } })

describe('parseManifest（舊的單一版本格式）', () => {
  it('解析契約範例', () => {
    const m = parseManifest({
      'bgm/title': { src: '/audio/bgm/title.mp3', loopStart: 8.2, loopEnd: 104.6, gainDb: 0 },
      'sfx/choice': { src: '/audio/sfx/choice.mp3', gainDb: -2 },
    })
    expect(m['bgm/title']).toEqual(legacy({ src: '/audio/bgm/title.mp3', loopStart: 8.2, loopEnd: 104.6, gainDb: 0 }))
    expect(m['sfx/choice']).toEqual(legacy({ src: '/audio/sfx/choice.mp3', gainDb: -2 }))
  })
  it('loop 與 gainDb 可省略；預設 gainDb = 0', () => {
    expect(parseManifest({ 'bgm/daily': { src: '/a.mp3' } })['bgm/daily']).toEqual(legacy({ src: '/a.mp3', gainDb: 0 }))
  })
  it('壞掉的內容不丟例外，壞條目被丟棄', () => {
    expect(parseManifest(null)).toEqual({})
    expect(parseManifest([])).toEqual({})
    expect(parseManifest('x')).toEqual({})
    const m = parseManifest({
      'bgm/a': { src: '' },
      'bgm/b': 'nope',
      'bgm/c': {},
      'oops/d': { src: '/d.mp3' },
      'bgm/e e': { src: '/e.mp3' },
      'bgm/ok': { src: '/ok.mp3' },
    })
    expect(Object.keys(m)).toEqual(['bgm/ok'])
  })
  it('無效的 loop 區間改為整首循環；gainDb 被夾住', () => {
    const m = parseManifest({
      'bgm/a': { src: '/a.mp3', loopStart: 10, loopEnd: 5 },
      'bgm/b': { src: '/b.mp3', loopStart: -1, loopEnd: 'x' },
      'bgm/c': { src: '/c.mp3', loopStart: 3 },
      'bgm/d': { src: '/d.mp3', loopEnd: 50, gainDb: 99 },
      'sfx/e': { src: '/e.mp3', loopStart: 1, loopEnd: 2 },
    })
    expect(m['bgm/a']).toEqual(legacy({ src: '/a.mp3', gainDb: 0 }))
    expect(m['bgm/b']).toEqual(legacy({ src: '/b.mp3', gainDb: 0 }))
    expect(m['bgm/c']).toEqual(legacy({ src: '/c.mp3', loopStart: 3, gainDb: 0 }))
    expect(m['bgm/d']).toEqual(legacy({ src: '/d.mp3', loopEnd: 50, gainDb: 12 }))
    expect(m['sfx/e']).toEqual(legacy({ src: '/e.mp3', gainDb: 0 }))
  })
})

describe('parseManifest（多版本格式）', () => {
  const MULTI = {
    'bgm/title': {
      default: 'c2',
      variants: {
        c1: { src: '/audio/bgm/title_c1.mp3', loopStart: 14, loopEnd: 114.5, duration: 114.5 },
        c2: { src: '/audio/bgm/title_c2.mp3', loopStart: 20, loopEnd: 110.7, gainDb: -3 },
        c3: { src: '/audio/bgm/title_c3.mp3' },
      },
    },
    'sfx/click': {
      default: 'c1',
      variants: { c1: { src: '/audio/sfx/click_c1.mp3' }, c3: { src: '/audio/sfx/click_c3.mp3', synth: true } },
    },
  }
  it('解析 default 與每個版本（保留順序、loop、synth、duration）', () => {
    const m = parseManifest(MULTI)
    expect(m['bgm/title'].default).toBe('c2')
    expect(Object.keys(m['bgm/title'].variants)).toEqual(['c1', 'c2', 'c3'])
    expect(m['bgm/title'].variants.c1).toEqual({ src: '/audio/bgm/title_c1.mp3', loopStart: 14, loopEnd: 114.5, duration: 114.5, gainDb: 0 })
    expect(m['bgm/title'].variants.c2.gainDb).toBe(-3)
    expect(m['bgm/title'].variants.c3).toEqual({ src: '/audio/bgm/title_c3.mp3', gainDb: 0 })
    expect(m['sfx/click'].variants.c3.synth).toBe(true)
    expect(m['sfx/click'].variants.c1.synth).toBeUndefined()
  })
  it('default 缺漏或指向不存在的版本 → 第一個版本', () => {
    const m = parseManifest({
      'bgm/a': { variants: { x: { src: '/x.mp3' }, y: { src: '/y.mp3' } } },
      'bgm/b': { default: 'zzz', variants: { x: { src: '/x.mp3' }, y: { src: '/y.mp3' } } },
    })
    expect(m['bgm/a'].default).toBe('x')
    expect(m['bgm/b'].default).toBe('x')
  })
  it('壞掉的版本被丟棄；全壞則整個 id 丟棄；default 指向被丟棄的版本時改用第一個', () => {
    const m = parseManifest({
      'bgm/a': { default: 'bad', variants: { bad: { src: '' }, 'b b': { src: '/b.mp3' }, ok: { src: '/ok.mp3' } } },
      'bgm/b': { variants: { bad: { nope: 1 } } },
      'bgm/c': { variants: {} },
      'sfx/d': { variants: 'oops' },
    })
    expect(Object.keys(m['bgm/a'].variants)).toEqual(['ok'])
    expect(m['bgm/a'].default).toBe('ok')
    expect(Object.keys(m)).toEqual(['bgm/a'])
  })
  it('版本內的 loop 區間無效 → 整首循環；SFX 忽略 loop', () => {
    const m = parseManifest({
      'bgm/a': { variants: { c1: { src: '/a.mp3', loopStart: 9, loopEnd: 3 } } },
      'sfx/b': { variants: { c1: { src: '/b.mp3', loopStart: 1, loopEnd: 2 } } },
    })
    expect(m['bgm/a'].variants.c1).toEqual({ src: '/a.mp3', gainDb: 0 })
    expect(m['sfx/b'].variants.c1).toEqual({ src: '/b.mp3', gainDb: 0 })
  })
  it('舊格式與多版本可混用', () => {
    const m = parseManifest({ ...MULTI, 'bgm/daily': { src: '/d.mp3' } })
    expect(Object.keys(m)).toEqual(['bgm/title', 'sfx/click', 'bgm/daily'])
    expect(m['bgm/daily'].default).toBe('default')
  })
})

describe('resolveVariant（設定值 → default → 第一個）', () => {
  const item = parseManifest({ 'bgm/t': { default: 'c2', variants: { c1: { src: '/1.mp3' }, c2: { src: '/2.mp3' }, c3: { src: '/3.mp3' } } } })['bgm/t']
  it('設定值存在就用設定值', () => {
    expect(resolveVariant(item, 'c3')).toBe('c3')
    expect(resolveVariant(item, 'c1')).toBe('c1')
  })
  it('沒設定、設定為空、設定指向不存在的版本 → default', () => {
    expect(resolveVariant(item)).toBe('c2')
    expect(resolveVariant(item, null)).toBe('c2')
    expect(resolveVariant(item, '')).toBe('c2')
    expect(resolveVariant(item, 'c9')).toBe('c2')
    expect(resolveVariant(item, 'constructor')).toBe('c2')
  })
  it('default 本身不在 variants（手動組出的壞資料）→ 第一個', () => {
    expect(resolveVariant({ default: 'zz', variants: item.variants })).toBe('c1')
  })
  it('pickSource 帶上版本 id；設定值不存在時退回 default', () => {
    const m = { 'bgm/t': item }
    expect(pickSource(m, 'bgm', 't', 'c3')).toMatchObject({ kind: 'file', variant: 'c3', entry: { src: '/3.mp3' } })
    expect(pickSource(m, 'bgm', 't')).toMatchObject({ kind: 'file', variant: 'c2', entry: { src: '/2.mp3' } })
    expect(pickSource(m, 'bgm', 't', 'nope')).toMatchObject({ variant: 'c2' })
  })
})

describe('loopPosition（鑑賞畫面的播放位置）', () => {
  it('未到 loopEnd 前線性前進，之後在 loopStart～loopEnd 之間循環', () => {
    expect(loopPosition(5, 100, 20, 90)).toBe(5)
    expect(loopPosition(89, 100, 20, 90)).toBe(89)
    expect(loopPosition(90, 100, 20, 90)).toBeCloseTo(20, 5)
    expect(loopPosition(100, 100, 20, 90)).toBeCloseTo(30, 5)
    expect(loopPosition(90 + 70 * 3 + 5, 100, 20, 90)).toBeCloseTo(25, 5)
  })
  it('沒有 loop 點：整首循環；負數與異常區間不爆', () => {
    expect(loopPosition(130, 100)).toBeCloseTo(30, 5)
    expect(loopPosition(-5, 100)).toBe(0)
    expect(loopPosition(10, 100, 50, 50)).toBe(10)
    expect(loopPosition(500, 100, 20, 999)).toBeCloseTo(20 + ((500 - 20) % 80), 5)
  })
})

describe('pickSource（備援選擇）', () => {
  const m = parseManifest({ 'bgm/title': { src: '/t.mp3' }, 'sfx/click': { src: '/c.mp3' } })
  it('有條目走檔案，缺漏走合成', () => {
    expect(pickSource(m, 'bgm', 'title').kind).toBe('file')
    expect(pickSource(m, 'bgm', 'daily').kind).toBe('synth')
    expect(pickSource(m, 'sfx', 'click').kind).toBe('file')
    expect(pickSource(m, 'sfx', 'title').kind).toBe('synth') // 類型要吻合
  })
  it('manifest 尚未載入（null）一律合成', () => {
    expect(pickSource(null, 'bgm', 'title').kind).toBe('synth')
  })
})

// ───────── 引擎狀態機（假後端）─────────
interface FakeVoice extends BgmVoice {
  kind: 'file' | 'synth'
  id?: string
  src?: string
  opts?: BgmFileOptions
  fadedOut?: number
  stopped?: boolean
}

function setup(manifest: unknown, opts: { unlock?: boolean; sfxVolume?: number; failSrc?: string[]; variants?: Record<string, string> } = {}) {
  let variants: Record<string, string> = opts.variants ?? {}
  const log: string[] = []
  const voices: FakeVoice[] = []
  const sfxFiles: { src: string; gain: number; end: () => void }[] = []
  const synthSfx: string[] = []
  const pending = new Map<string, (b: unknown | null) => void>()
  let loadManifestImpl: () => Promise<unknown> = () => Promise.resolve(manifest)
  let unlockOk = opts.unlock ?? true
  let bgmVolume = 0.3
  let t = 1000
  const holdLoads = new Set<string>()
  const backend: AudioBackend = {
    unlock: () => Promise.resolve(unlockOk),
    loadManifest: () => loadManifestImpl(),
    loadBuffer: (src) => {
      log.push(`load ${src}`)
      if (opts.failSrc?.includes(src)) return Promise.resolve(null)
      if (holdLoads.has(src)) return new Promise((res) => pending.set(src, res))
      return Promise.resolve({ buf: src })
    },
    playBgmFile: (buffer, o) => {
      const v: FakeVoice = {
        kind: 'file',
        src: (buffer as { buf: string }).buf,
        opts: o,
        fadeOut: (s) => {
          v.fadedOut = s
        },
        stop: () => {
          v.stopped = true
        },
        position: () => 12.5,
        duration: 100,
      }
      voices.push(v)
      return v
    },
    playBgmSynth: (id) => {
      const v: FakeVoice = {
        kind: 'synth',
        id,
        fadeOut: (s) => {
          v.fadedOut = s
        },
        stop: () => {
          v.stopped = true
        },
      }
      voices.push(v)
      return v
    },
    playSfxFile: (buffer, gain, end) => sfxFiles.push({ src: (buffer as { buf: string }).buf, gain, end }),
    playSfxSynth: (id) => synthSfx.push(id),
    setBgmVolume: (v) => {
      bgmVolume = v
    },
  }
  const engine = new AudioEngine({
    backend,
    getSettings: () => ({ bgmVolume: 0.3, sfxVolume: opts.sfxVolume ?? 0.6, audioVariants: variants }),
    now: () => t,
  })
  const tick = async (n = 6) => {
    for (let i = 0; i < n; i++) await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
  }
  return {
    engine,
    voices,
    sfxFiles,
    synthSfx,
    log,
    tick,
    hold: (src: string) => holdLoads.add(src),
    release: (src: string, ok = true) => pending.get(src)?.(ok ? { buf: src } : null),
    advance: (ms: number) => {
      t += ms
    },
    setUnlock: (ok: boolean) => {
      unlockOk = ok
    },
    setVariants: (v: Record<string, string>) => {
      variants = v
    },
    failManifest: () => {
      loadManifestImpl = () => Promise.reject(new Error('404'))
    },
    get bgmVolume() {
      return bgmVolume
    },
  }
}

const MANIFEST = {
  'bgm/title': { src: '/audio/bgm/title.mp3', loopStart: 8.2, loopEnd: 104.6, gainDb: -6 },
  'bgm/daily': { src: '/audio/bgm/daily.mp3' },
  'sfx/choice': { src: '/audio/sfx/choice.mp3', gainDb: -6 },
}

describe('AudioEngine：BGM 狀態機', () => {
  it('有條目 → 播檔案（帶 loop 與 gainDb）；沒條目 → 合成', async () => {
    const s = setup(MANIFEST)
    await s.engine.unlock()
    s.engine.bgm('title')
    await s.tick()
    expect(s.voices).toHaveLength(1)
    expect(s.voices[0]).toMatchObject({ kind: 'file', src: '/audio/bgm/title.mp3' })
    expect(s.voices[0].opts?.loopStart).toBe(8.2)
    expect(s.voices[0].opts?.loopEnd).toBe(104.6)
    expect(s.voices[0].opts?.gain).toBeCloseTo(0.8 * dbToGain(-6), 5)
    expect(s.voices[0].opts?.fadeInSec).toBe(FADE_SEC)
    s.engine.bgm('warm')
    await s.tick()
    expect(s.voices[1]).toMatchObject({ kind: 'synth', id: 'warm' })
    expect(s.voices[0].fadedOut).toBe(FADE_SEC) // 舊曲淡出（交叉淡化）
    expect(s.engine.currentBgm).toBe('warm')
  })

  it('同一首重複呼叫不重新開始（含載入中）', async () => {
    const s = setup(MANIFEST)
    await s.engine.unlock()
    s.hold('/audio/bgm/title.mp3')
    s.engine.bgm('title')
    s.engine.bgm('title')
    await s.tick()
    s.release('/audio/bgm/title.mp3')
    await s.tick()
    s.engine.bgm('title')
    s.engine.bgm('title')
    await s.tick()
    expect(s.voices).toHaveLength(1)
    expect(s.log.filter((l) => l === 'load /audio/bgm/title.mp3').length).toBe(1)
  })

  it('切曲時新曲還在下載：舊曲繼續播，下載好才交叉淡化', async () => {
    const s = setup(MANIFEST)
    await s.engine.unlock()
    s.engine.bgm('warm') // 合成
    await s.tick()
    s.hold('/audio/bgm/title.mp3')
    s.engine.bgm('title')
    await s.tick()
    expect(s.voices).toHaveLength(1)
    expect(s.voices[0].fadedOut).toBeUndefined()
    s.release('/audio/bgm/title.mp3')
    await s.tick()
    expect(s.voices).toHaveLength(2)
    expect(s.voices[0].fadedOut).toBe(FADE_SEC)
    expect(s.voices[1].kind).toBe('file')
  })

  it('下載途中又切到別首：過期的載入結果被丟棄；切回正在播的那首則取消待切', async () => {
    const s = setup(MANIFEST)
    await s.engine.unlock()
    s.engine.bgm('warm')
    await s.tick()
    s.hold('/audio/bgm/title.mp3')
    s.engine.bgm('title')
    s.engine.bgm('warm') // 切回正在播的
    s.release('/audio/bgm/title.mp3')
    await s.tick()
    expect(s.voices).toHaveLength(1)
    expect(s.engine.currentBgm).toBe('warm')
    // 下載途中改切第三首
    s.hold('/audio/bgm/daily.mp3')
    s.engine.bgm('daily')
    s.engine.bgm('festival')
    s.release('/audio/bgm/daily.mp3')
    await s.tick()
    expect(s.voices.map((v) => v.id ?? v.src)).toEqual(['warm', 'festival'])
  })

  it('stopBgm 淡出並清空；載入途中 stop 不會事後開始播', async () => {
    const s = setup(MANIFEST)
    await s.engine.unlock()
    s.engine.bgm('daily')
    await s.tick()
    s.engine.stopBgm()
    expect(s.voices[0].fadedOut).toBe(FADE_SEC)
    expect(s.engine.currentBgm).toBeNull()
    // 之後同一首可重新播
    s.engine.bgm('daily')
    await s.tick()
    expect(s.voices).toHaveLength(2)

    s.hold('/audio/bgm/title.mp3')
    s.engine.bgm('title')
    s.engine.stopBgm()
    s.release('/audio/bgm/title.mp3')
    await s.tick()
    expect(s.voices).toHaveLength(2)
  })

  it('解鎖前只記錄；第一次互動解鎖後補播當前應播的曲目', async () => {
    const s = setup(MANIFEST, { unlock: false })
    s.engine.bgm('title')
    await s.tick()
    expect(s.voices).toHaveLength(0)
    expect(s.engine.currentBgm).toBe('title')
    expect(await s.engine.unlock()).toBe(false) // 手勢還沒到
    s.setUnlock(true)
    expect(await s.engine.unlock()).toBe(true)
    await s.tick()
    expect(s.voices).toHaveLength(1)
    expect(s.voices[0].src).toBe('/audio/bgm/title.mp3')
    expect(s.bgmVolume).toBe(0.3)
  })

  it('解鎖前換了曲目，解鎖後只播最後一首', async () => {
    const s = setup(MANIFEST, { unlock: false })
    s.engine.bgm('title')
    s.engine.bgm('daily')
    s.setUnlock(true)
    await s.engine.unlock()
    await s.tick()
    expect(s.voices).toHaveLength(1)
    expect(s.voices[0].src).toBe('/audio/bgm/daily.mp3')
  })

  it('音檔載入失敗 → 退回合成聲', async () => {
    const s = setup(MANIFEST, { failSrc: ['/audio/bgm/title.mp3'] })
    await s.engine.unlock()
    s.engine.bgm('title')
    await s.tick()
    expect(s.voices).toHaveLength(1)
    expect(s.voices[0]).toMatchObject({ kind: 'synth', id: 'title' })
  })

  it('manifest 載入失敗或為 {} → 全部合成', async () => {
    const s = setup({})
    await s.engine.unlock()
    s.engine.bgm('title')
    await s.tick()
    expect(s.voices[0].kind).toBe('synth')
    const f = setup(MANIFEST)
    f.failManifest()
    await f.engine.unlock()
    f.engine.bgm('daily')
    await f.tick()
    expect(f.voices[0].kind).toBe('synth')
  })
})

describe('AudioEngine：SFX', () => {
  it('預載後播檔案（含 gainDb），未載好或沒條目走合成', async () => {
    const s = setup(MANIFEST)
    s.engine.sfx('choice') // 第一次：尚未解鎖／預載 → 合成；sfx() 本身會觸發解鎖與預載
    await s.tick()
    s.synthSfx.length = 0
    s.engine.sfx('choice')
    s.engine.sfx('click') // 沒條目
    expect(s.sfxFiles).toHaveLength(1)
    expect(s.sfxFiles[0].gain).toBeCloseTo(0.6 * 0.8 * dbToGain(-6), 5)
    expect(s.synthSfx).toEqual(['click'])
  })

  it('同一音效同時發聲數有上限，播完後釋放', async () => {
    const s = setup(MANIFEST)
    await s.engine.unlock()
    await s.tick()
    for (let i = 0; i < MAX_SFX_VOICES + 3; i++) s.engine.sfx('choice')
    expect(s.sfxFiles).toHaveLength(MAX_SFX_VOICES)
    s.sfxFiles[0].end()
    s.engine.sfx('choice')
    expect(s.sfxFiles).toHaveLength(MAX_SFX_VOICES + 1)
  })

  it('blip 節流 65ms（檔案與合成皆然）；sfxVolume 0 靜音', async () => {
    const s = setup({ 'sfx/blip': { src: '/b.mp3' } })
    await s.engine.unlock()
    await s.tick()
    s.engine.sfx('blip')
    s.engine.sfx('blip')
    expect(s.sfxFiles).toHaveLength(1)
    s.advance(BLIP_MIN_GAP_MS)
    s.engine.sfx('blip')
    expect(s.sfxFiles).toHaveLength(2)
    const m = setup({})
    await m.engine.unlock()
    m.engine.sfx('blip')
    m.engine.sfx('blip')
    expect(m.synthSfx).toEqual(['blip'])
    const q = setup({}, { sfxVolume: 0 })
    q.engine.sfx('click')
    expect(q.synthSfx).toEqual([])
  })
})

const MULTI_MANIFEST = {
  'bgm/title': {
    default: 'c2',
    variants: {
      c1: { src: '/audio/bgm/title_c1.mp3', loopStart: 14, loopEnd: 114.5 },
      c2: { src: '/audio/bgm/title_c2.mp3', loopStart: 20, loopEnd: 110.7 },
      c3: { src: '/audio/bgm/title_c3.mp3', loopStart: 18, loopEnd: 124 },
    },
  },
  'bgm/daily': { default: 'c1', variants: { c1: { src: '/audio/bgm/daily_c1.mp3' }, c2: { src: '/audio/bgm/daily_c2.mp3' } } },
  'sfx/click': {
    default: 'c1',
    variants: { c1: { src: '/audio/sfx/click_c1.mp3' }, c2: { src: '/audio/sfx/click_c2.mp3' }, c3: { src: '/audio/sfx/click_c3.mp3', synth: true } },
  },
}

describe('AudioEngine：多版本（採用的版本）', () => {
  it('沒設定 → 用 manifest 的 default；有設定 → 用設定的版本（含 loop 點）', async () => {
    const a = setup(MULTI_MANIFEST)
    await a.engine.unlock()
    a.engine.bgm('title')
    await a.tick()
    expect(a.voices[0].src).toBe('/audio/bgm/title_c2.mp3')
    expect(a.voices[0].opts?.loopStart).toBe(20)

    const b = setup(MULTI_MANIFEST, { variants: { 'bgm/title': 'c3' } })
    await b.engine.unlock()
    b.engine.bgm('title')
    await b.tick()
    expect(b.voices[0].src).toBe('/audio/bgm/title_c3.mp3')
    expect(b.voices[0].opts?.loopEnd).toBe(124)
    expect(b.log).not.toContain('load /audio/bgm/title_c2.mp3') // 只下載採用的那一版
  })

  it('設定指向不存在的版本 → 退回 default', async () => {
    const s = setup(MULTI_MANIFEST, { variants: { 'bgm/title': 'c9' } })
    await s.engine.unlock()
    s.engine.bgm('title')
    await s.tick()
    expect(s.voices[0].src).toBe('/audio/bgm/title_c2.mp3')
  })

  it('舊格式 manifest 仍可播放', async () => {
    const s = setup(MANIFEST, { variants: { 'bgm/title': 'c1' } })
    await s.engine.unlock()
    s.engine.bgm('title')
    await s.tick()
    expect(s.voices[0].src).toBe('/audio/bgm/title.mp3')
  })

  it('正在播放時換版：交叉淡化到新版本；換別首的版本不影響目前這首', async () => {
    const s = setup(MULTI_MANIFEST)
    await s.engine.unlock()
    s.engine.bgm('title')
    await s.tick()
    s.setVariants({ 'bgm/daily': 'c2' })
    s.engine.variantsChanged()
    await s.tick()
    expect(s.voices).toHaveLength(1) // 不是正在播的那首
    s.setVariants({ 'bgm/daily': 'c2', 'bgm/title': 'c1' })
    s.engine.variantsChanged()
    await s.tick()
    expect(s.voices).toHaveLength(2)
    expect(s.voices[1].src).toBe('/audio/bgm/title_c1.mp3')
    expect(s.voices[0].fadedOut).toBe(FADE_SEC)
    expect(s.engine.currentBgm).toBe('title')
    // 換成同一版（或換回後 default 解析結果相同）不重播
    s.setVariants({ 'bgm/title': 'c1' })
    s.engine.variantsChanged()
    await s.tick()
    expect(s.voices).toHaveLength(2)
  })

  it('SFX：只預載採用的版本；換版後改播新版本', async () => {
    const s = setup(MULTI_MANIFEST, { variants: { 'sfx/click': 'c2' } })
    await s.engine.unlock()
    await s.tick()
    expect(s.log).toContain('load /audio/sfx/click_c2.mp3')
    expect(s.log).not.toContain('load /audio/sfx/click_c1.mp3')
    s.engine.sfx('click')
    expect(s.sfxFiles.map((f) => f.src)).toEqual(['/audio/sfx/click_c2.mp3'])
    s.setVariants({ 'sfx/click': 'c3' })
    s.engine.variantsChanged()
    await s.tick()
    s.engine.sfx('click')
    expect(s.sfxFiles.map((f) => f.src)).toEqual(['/audio/sfx/click_c2.mp3', '/audio/sfx/click_c3.mp3'])
  })
})

describe('AudioEngine：鑑賞預覽', () => {
  it('進入鑑賞：遊戲 BGM 淡出；試聽一次只播一首；離開時依採用的版本恢復', async () => {
    const s = setup(MULTI_MANIFEST)
    await s.engine.unlock()
    s.engine.bgm('title')
    await s.tick()
    expect(s.voices).toHaveLength(1)

    s.engine.beginPreview()
    expect(s.voices[0].fadedOut).toBe(FADE_SEC)
    s.engine.previewBgm('title', 'c1')
    expect(s.engine.getPreview()).toEqual({ id: 'title', variant: 'c1', status: 'loading' })
    await s.tick()
    expect(s.engine.getPreview()?.status).toBe('playing')
    expect(s.voices[1].src).toBe('/audio/bgm/title_c1.mp3')
    expect(s.voices[1].opts).toMatchObject({ loopStart: 14, loopEnd: 114.5 })

    s.engine.previewBgm('daily', 'c2') // 換一首：前一首立刻淡出
    expect(s.voices[1].fadedOut).toBeDefined()
    await s.tick()
    expect(s.voices[2].src).toBe('/audio/bgm/daily_c2.mp3')
    expect(s.voices.filter((v) => v.fadedOut === undefined && !v.stopped)).toEqual([s.voices[2]]) // 只剩一首在播

    // 鑑賞中遊戲要求換曲只記下，不發聲
    s.engine.bgm('warm')
    await s.tick()
    expect(s.voices).toHaveLength(3)

    s.setVariants({ 'bgm/title': 'c3' })
    s.engine.variantsChanged() // 鑑賞中換版：不重播
    s.engine.bgm('title')
    await s.tick()
    expect(s.voices).toHaveLength(3)

    s.engine.endPreview()
    await s.tick()
    expect(s.engine.getPreview()).toBeNull()
    expect(s.voices[2].fadedOut).toBeDefined()
    expect(s.voices).toHaveLength(4)
    expect(s.voices[3].src).toBe('/audio/bgm/title_c3.mp3') // 恢復 title，且是剛採用的版本
  })

  it('暫停記住位置，繼續時從該位置接著播；停止後狀態清空', async () => {
    const s = setup(MULTI_MANIFEST)
    await s.engine.unlock()
    s.engine.previewBgm('title', 'c2')
    await s.tick()
    expect(s.engine.previewPosition()).toBe(12.5)
    expect(s.engine.previewDuration()).toBe(100)
    s.engine.pausePreview()
    expect(s.engine.getPreview()).toEqual({ id: 'title', variant: 'c2', status: 'paused' })
    expect(s.voices[0].fadedOut).toBeDefined()
    expect(s.engine.previewPosition()).toBe(12.5)
    s.engine.previewBgm('title', 'c2', true)
    await s.tick()
    expect(s.voices[1].opts?.offset).toBe(12.5)
    s.engine.stopPreview()
    expect(s.engine.getPreview()).toBeNull()
    expect(s.voices[1].fadedOut).toBeDefined()
  })

  it('下載途中換別首／停止：過期的結果被丟棄；載入失敗顯示 error 且可重試', async () => {
    const s = setup(MULTI_MANIFEST, { failSrc: ['/audio/bgm/daily_c2.mp3'] })
    await s.engine.unlock()
    s.hold('/audio/bgm/title_c1.mp3')
    s.engine.previewBgm('title', 'c1')
    s.engine.previewBgm('title', 'c3')
    s.release('/audio/bgm/title_c1.mp3')
    await s.tick()
    expect(s.voices.map((v) => v.src)).toEqual(['/audio/bgm/title_c3.mp3'])
    s.engine.previewBgm('daily', 'c2')
    await s.tick()
    expect(s.engine.getPreview()).toEqual({ id: 'daily', variant: 'c2', status: 'error' })
    s.engine.previewBgm('nope', 'c1')
    await s.tick()
    expect(s.engine.getPreview()?.status).toBe('error')
    s.hold('/audio/bgm/title_c2.mp3')
    s.engine.previewBgm('title', 'c2')
    s.engine.stopPreview()
    s.release('/audio/bgm/title_c2.mp3')
    await s.tick()
    expect(s.voices).toHaveLength(1)
  })

  it('預覽音效：播指定版本（含合成版）；音量 0 靜音', async () => {
    const s = setup(MULTI_MANIFEST)
    await s.engine.unlock()
    s.engine.previewSfx('click', 'c3')
    await s.tick()
    expect(s.sfxFiles.map((f) => f.src)).toEqual(['/audio/sfx/click_c3.mp3'])
    s.engine.previewSfx('click', 'c9')
    await s.tick()
    expect(s.sfxFiles).toHaveLength(1)
    const q = setup(MULTI_MANIFEST, { sfxVolume: 0 })
    await q.engine.unlock()
    q.engine.previewSfx('click', 'c1')
    await q.tick()
    expect(q.sfxFiles).toHaveLength(0)
  })

  it('BGM 緩衝有上限（LRU），失敗不快取', async () => {
    const entries: Record<string, unknown> = {}
    for (let i = 0; i < 8; i++) entries[`bgm/t${i}`] = { src: `/t${i}.mp3` }
    const s = setup(entries, { failSrc: ['/t7.mp3'] })
    await s.engine.unlock()
    for (let i = 0; i < 7; i++) {
      s.engine.previewBgm(`t${i}`, 'default')
      await s.tick()
    }
    // 前面的已被淘汰：再播 t0 要重新載入
    const before = s.log.filter((l) => l === 'load /t0.mp3').length
    s.engine.previewBgm('t0', 'default')
    await s.tick()
    expect(s.log.filter((l) => l === 'load /t0.mp3').length).toBe(before + 1)
    // 失敗的不快取：重試會再下載
    s.engine.previewBgm('t7', 'default')
    await s.tick()
    s.engine.previewBgm('t7', 'default')
    await s.tick()
    expect(s.log.filter((l) => l === 'load /t7.mp3').length).toBe(2)
  })
})
