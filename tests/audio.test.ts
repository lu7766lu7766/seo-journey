import { describe, expect, it } from 'vitest'
import { AudioEngine, BLIP_MIN_GAP_MS, FADE_SEC, MAX_SFX_VOICES, type AudioBackend, type BgmFileOptions, type BgmVoice } from '@/audio/engine'
import { dbToGain, parseManifest, pickSource } from '@/audio/manifest'

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

describe('parseManifest', () => {
  it('解析契約範例', () => {
    const m = parseManifest({
      'bgm/title': { src: '/audio/bgm/title.mp3', loopStart: 8.2, loopEnd: 104.6, gainDb: 0 },
      'sfx/choice': { src: '/audio/sfx/choice.mp3', gainDb: -2 },
    })
    expect(m['bgm/title']).toEqual({ src: '/audio/bgm/title.mp3', loopStart: 8.2, loopEnd: 104.6, gainDb: 0 })
    expect(m['sfx/choice']).toEqual({ src: '/audio/sfx/choice.mp3', gainDb: -2 })
  })
  it('loop 與 gainDb 可省略；預設 gainDb = 0', () => {
    expect(parseManifest({ 'bgm/daily': { src: '/a.mp3' } })['bgm/daily']).toEqual({ src: '/a.mp3', gainDb: 0 })
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
    expect(m['bgm/a']).toEqual({ src: '/a.mp3', gainDb: 0 })
    expect(m['bgm/b']).toEqual({ src: '/b.mp3', gainDb: 0 })
    expect(m['bgm/c']).toEqual({ src: '/c.mp3', loopStart: 3, gainDb: 0 })
    expect(m['bgm/d']).toEqual({ src: '/d.mp3', loopEnd: 50, gainDb: 12 })
    expect(m['sfx/e']).toEqual({ src: '/e.mp3', gainDb: 0 })
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

function setup(manifest: unknown, opts: { unlock?: boolean; sfxVolume?: number; failSrc?: string[] } = {}) {
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
    getSettings: () => ({ bgmVolume: 0.3, sfxVolume: opts.sfxVolume ?? 0.6 }),
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
