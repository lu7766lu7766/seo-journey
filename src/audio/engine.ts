/**
 * 播放引擎的「狀態機」：決定播檔案還是合成聲、切曲／淡入淡出／停止、SFX 節流與同時發聲上限，
 * 並依設定中的「每個 id 採用的版本」挑音檔；另提供音樂鑑賞畫面用的預覽模式。
 * 不直接碰 Web Audio——所有實際發聲都經過可注入的 `AudioBackend`，方便單元測試。
 */
import { dbToGain, parseManifest, pickSource, type AudioManifest, type ManifestEntry } from './manifest'
import { VoicePlayer, type VoiceBackend } from './voicePlayer'

export interface BgmVoice {
  /** 以等功率曲線淡出後停止 */
  fadeOut(sec: number): void
  /** 立即停止 */
  stop(): void
  /** 目前在音檔內的位置（秒，已含循環）；合成聲沒有 */
  position?(): number
  /** 音檔總長（秒）；合成聲沒有 */
  readonly duration?: number
}

export interface BgmFileOptions {
  loopStart?: number
  loopEnd?: number
  /** 線性增益（已含 base 與 gainDb） */
  gain: number
  fadeInSec: number
  /** 從音檔的第幾秒開始播（暫停後繼續）；省略＝從頭 */
  offset?: number
}

export interface AudioBackend extends VoiceBackend {
  /** 建立／恢復 AudioContext；在使用者手勢內同步呼叫。回傳是否已在 running。 */
  unlock(): Promise<boolean>
  loadManifest(): Promise<unknown>
  /** 下載並解碼；失敗回傳 null（不丟例外） */
  loadBuffer(src: string): Promise<unknown | null>
  playBgmFile(buffer: unknown, opts: BgmFileOptions): BgmVoice
  playBgmSynth(id: string, fadeInSec: number): BgmVoice
  /** 播放音效檔；`onEnded` 在播完時呼叫 */
  playSfxFile(buffer: unknown, gain: number, onEnded: () => void): void
  playSfxSynth(id: string, vol: number): void
  /** 設定 BGM 匯流排音量（0..1） */
  setBgmVolume(v: number): void
}

export interface EngineSettings {
  /** 音樂開關：關閉時目前的 BGM 淡出、不再載入或播放 BGM（`desired` 仍記著，重新打開時恢復） */
  musicOn: boolean
  /** 音效開關 */
  sfxOn: boolean
  /** 語音開關：關閉時完全不載入語音檔 */
  voiceOn: boolean
  /** `bgm/<id>`／`sfx/<id>` → 採用的版本 id；沒有的用 manifest 的 default */
  audioVariants?: Record<string, string>
}

export interface EngineDeps {
  backend: AudioBackend
  getSettings: () => EngineSettings
  now?: () => number
}

/** 預覽中的曲目狀態（音樂鑑賞畫面訂閱） */
export interface PreviewState {
  id: string
  variant: string
  status: 'loading' | 'playing' | 'paused' | 'error'
}

/** 交叉淡入淡出秒數 */
export const FADE_SEC = 1
/** 鑑賞畫面切換試聽的淡入淡出秒數（短一點，避免兩首疊在一起） */
export const PREVIEW_FADE_SEC = 0.3
/** 單一音效最多同時發聲數 */
export const MAX_SFX_VOICES = 4
export const BLIP_MIN_GAP_MS = 65
/** BGM 匯流排的固定音量（音樂開關為「開」時） */
export const BGM_VOLUME = 0.3
/** 音效的固定音量（音效開關為「開」時） */
export const SFX_VOLUME = 0.6
/** 音檔的基準音量（再乘上 gainDb 與匯流排音量），避免滿刻度檔案過響 */
export const BGM_FILE_BASE = 0.8
export const SFX_FILE_BASE = 0.8
/** 同時保留在記憶體的 BGM 解碼緩衝上限（一首約 40MB） */
export const BGM_BUFFER_CAP = 5

interface Playing {
  id: string
  /** 檔案版本；合成聲為 undefined */
  variant?: string
  voice: BgmVoice
}

export class AudioEngine {
  private backend: AudioBackend
  private getSettings: EngineDeps['getSettings']
  private now: () => number

  private manifest: AudioManifest | null = null
  private manifestP: Promise<AudioManifest> | null = null
  /** SFX 緩衝（小，不淘汰） */
  private buffers = new Map<string, Promise<unknown | null>>()
  private loaded = new Map<string, unknown>()
  /** BGM 緩衝（大，LRU 淘汰；播放中的聲部自己持有緩衝，淘汰不影響播放） */
  private bgmBuffers = new Map<string, Promise<unknown | null>>()

  private unlocked = false
  private unlockP: Promise<boolean> | null = null

  /** 目前「應該播」的 BGM（含尚在下載、尚未解鎖的） */
  private desired: string | null = null
  private playing: Playing | null = null
  private token = 0

  /** 鑑賞模式：遊戲的 BGM 暫停（desired 仍記著，離開時恢復），改由預覽播放 */
  private previewMode = false
  private preview: PreviewState | null = null
  private pausedAt = 0
  private pausedDuration: number | undefined
  private previewListeners = new Set<() => void>()

  private lastBlipAt = -Infinity
  private sfxActive = new Map<string, number>()
  private musicWasOn: boolean

  /** 角色語音（與 BGM／SFX 共用解鎖狀態與 BGM 匯流排的 ducking） */
  readonly voice: VoicePlayer

  constructor(deps: EngineDeps) {
    this.backend = deps.backend
    this.getSettings = deps.getSettings
    this.now = deps.now ?? (() => Date.now())
    this.musicWasOn = this.getSettings().musicOn
    this.voice = new VoicePlayer({
      backend: deps.backend,
      getVoiceOn: () => this.getSettings().voiceOn,
      unlock: () => this.unlock(),
      isUnlocked: () => this.unlocked,
    })
  }

  private get musicOn() {
    return this.getSettings().musicOn
  }

  /** BGM 匯流排音量：平常固定；只有鑑賞畫面在音樂關閉時保持靜音（遊戲 BGM 關閉時是淡出而不是直接截斷）。 */
  private busVolume() {
    return this.previewMode && !this.musicOn ? 0 : BGM_VOLUME
  }

  get currentBgm(): string | null {
    return this.desired
  }

  /** 開始載入 manifest（不需要 AudioContext）。可重複呼叫。 */
  init(): Promise<AudioManifest> {
    if (!this.manifestP) {
      this.manifestP = this.backend
        .loadManifest()
        .then((raw) => parseManifest(raw))
        .catch(() => ({}) as AudioManifest)
        .then((m) => {
          this.manifest = m
          return m
        })
    }
    return this.manifestP
  }

  private chosen(type: 'bgm' | 'sfx', id: string): string | undefined {
    return this.getSettings().audioVariants?.[`${type}/${id}`]
  }

  /** 使用者手勢時呼叫：解鎖 AudioContext，之後預載 SFX 並補播目前應播的 BGM。 */
  unlock(): Promise<boolean> {
    if (this.unlocked) return Promise.resolve(true)
    if (!this.unlockP) {
      this.unlockP = this.backend
        .unlock()
        .catch(() => false)
        .then((ok) => {
          this.unlockP = null
          if (ok) this.onUnlocked()
          return ok
        })
    }
    return this.unlockP
  }

  private onUnlocked() {
    this.unlocked = true
    this.backend.setBgmVolume(this.busVolume())
    void this.preloadSfx()
    if (this.desired && !this.playing && !this.previewMode && this.musicOn) void this.startBgm(this.desired, ++this.token)
  }

  /** 只預載「目前採用的版本」，不載其他候選 */
  private async preloadSfx() {
    const m = await this.init()
    for (const key of Object.keys(m)) {
      if (!key.startsWith('sfx/')) continue
      const pick = pickSource(m, 'sfx', key.slice(4), this.chosen('sfx', key.slice(4)))
      if (pick.kind === 'file') void this.buffer(pick.entry.src)
    }
  }

  private buffer(src: string): Promise<unknown | null> {
    let p = this.buffers.get(src)
    if (!p) {
      p = this.backend
        .loadBuffer(src)
        .catch(() => null)
        .then((b) => {
          if (b) this.loaded.set(src, b)
          return b
        })
      this.buffers.set(src, p)
    }
    return p
  }

  private bgmBuffer(src: string): Promise<unknown | null> {
    let p = this.bgmBuffers.get(src)
    if (p) {
      // 最近使用：移到最後
      this.bgmBuffers.delete(src)
      this.bgmBuffers.set(src, p)
      return p
    }
    p = this.backend
      .loadBuffer(src)
      .catch(() => null)
      .then((b) => {
        if (!b && this.bgmBuffers.get(src) === p) this.bgmBuffers.delete(src) // 失敗不快取，下次可重試
        return b
      })
    this.bgmBuffers.set(src, p)
    while (this.bgmBuffers.size > BGM_BUFFER_CAP) {
      const oldest = this.bgmBuffers.keys().next().value
      if (oldest === undefined || oldest === src) break
      this.bgmBuffers.delete(oldest)
    }
    return p
  }

  /**
   * 設定改變（音樂／音效／語音開關）。音樂關閉：目前的 BGM 淡出（`desired` 保留）；重新打開：恢復應播的曲目。
   * 語音關閉：立刻停止目前語音。
   */
  settingsChanged() {
    this.backend.setBgmVolume(this.busVolume())
    const on = this.musicOn
    if (on !== this.musicWasOn) {
      this.musicWasOn = on
      if (!this.previewMode) {
        const token = ++this.token // 取消任何尚在下載的請求
        if (!on) {
          const p = this.playing
          this.playing = null
          p?.voice.fadeOut(FADE_SEC)
        } else if (this.desired && this.unlocked) {
          void this.startBgm(this.desired, token)
        }
      }
    }
    this.voice.settingsChanged()
  }

  /** 設定中的版本選擇改變：預載新採用的音效；若該首 BGM 正在播，交叉淡化到新版本。 */
  variantsChanged() {
    if (this.unlocked) void this.preloadSfx()
    if (this.previewMode) return // 鑑賞中：離開時才依新設定恢復
    const id = this.desired
    if (!id || !this.playing || this.playing.id !== id || !this.manifest) return
    const pick = pickSource(this.manifest, 'bgm', id, this.chosen('bgm', id))
    const want = pick.kind === 'file' ? pick.variant : undefined
    if (want !== this.playing.variant) void this.startBgm(id, ++this.token)
  }

  sfx(id: string) {
    void this.unlock()
    void this.init()
    if (!this.getSettings().sfxOn) return
    const vol = SFX_VOLUME
    if (id === 'blip') {
      const t = this.now()
      if (t - this.lastBlipAt < BLIP_MIN_GAP_MS) return
      this.lastBlipAt = t
    }
    try {
      const pick = pickSource(this.manifest, 'sfx', id, this.chosen('sfx', id))
      if (pick.kind === 'file') {
        const buf = this.loaded.get(pick.entry.src)
        if (buf) {
          this.playSfxBuffer(id, buf, vol, pick.entry)
          return
        }
        void this.buffer(pick.entry.src) // 還沒載好：這次先用合成聲
      }
      this.backend.playSfxSynth(id, vol)
    } catch {
      /* ignore audio errors */
    }
  }

  private playSfxBuffer(id: string, buf: unknown, vol: number, entry: ManifestEntry) {
    const n = this.sfxActive.get(id) ?? 0
    if (n >= MAX_SFX_VOICES) return
    this.sfxActive.set(id, n + 1)
    this.backend.playSfxFile(buf, vol * SFX_FILE_BASE * dbToGain(entry.gainDb), () => {
      this.sfxActive.set(id, Math.max(0, (this.sfxActive.get(id) ?? 1) - 1))
    })
  }

  bgm(id: string) {
    if (this.desired === id) return
    this.desired = id
    if (this.previewMode) return // 鑑賞中只記下，離開時再播
    const token = ++this.token // 取消任何尚在下載的舊請求
    if (this.playing?.id === id) return // 切回正在播的那首：保持不動
    void this.init()
    // 不在這裡 unlock：瀏覽器要求 AudioContext 在使用者手勢內建立，手勢監聽（index.ts）與 sfx() 會負責
    if (this.unlocked && this.musicOn) void this.startBgm(id, token)
    // 未解鎖：等 onUnlocked 補播；音樂關閉：只記下，重新打開時補播
  }

  stopBgm() {
    this.desired = null
    if (this.previewMode) return
    this.token++
    const p = this.playing
    this.playing = null
    p?.voice.fadeOut(FADE_SEC)
  }

  private async startBgm(id: string, token: number) {
    try {
      const m = await this.init()
      if (token !== this.token) return
      const pick = pickSource(m, 'bgm', id, this.chosen('bgm', id))
      let voice: BgmVoice | null = null
      let variant: string | undefined
      if (pick.kind === 'file') {
        const e: ManifestEntry = pick.entry
        const buf = await this.bgmBuffer(e.src)
        if (token !== this.token) return
        if (buf) {
          variant = pick.variant
          voice = this.backend.playBgmFile(buf, {
            loopStart: e.loopStart,
            loopEnd: e.loopEnd,
            gain: BGM_FILE_BASE * dbToGain(e.gainDb),
            fadeInSec: FADE_SEC,
          })
        }
      }
      if (!voice) voice = this.backend.playBgmSynth(id, FADE_SEC)
      const old = this.playing
      this.playing = { id, variant, voice }
      old?.voice.fadeOut(FADE_SEC)
    } catch {
      /* ignore audio errors */
    }
  }

  // ───────── 音樂鑑賞（預覽）─────────

  getPreview(): PreviewState | null {
    return this.preview
  }

  subscribePreview(cb: () => void): () => void {
    this.previewListeners.add(cb)
    return () => {
      this.previewListeners.delete(cb)
    }
  }

  private setPreview(p: PreviewState | null) {
    this.preview = p
    for (const cb of [...this.previewListeners]) cb()
  }

  /** 進入鑑賞：遊戲的 BGM 淡出（desired 保留）。 */
  beginPreview() {
    if (this.previewMode) return
    this.previewMode = true
    this.token++
    const old = this.playing
    this.playing = null
    old?.voice.fadeOut(FADE_SEC)
    this.backend.setBgmVolume(this.busVolume())
  }

  /** 離開鑑賞：試聽淡出，並依目前採用的版本恢復遊戲的 BGM。 */
  endPreview() {
    if (!this.previewMode) return
    this.previewMode = false
    this.setPreview(null)
    const token = ++this.token
    const old = this.playing
    this.playing = null
    old?.voice.fadeOut(PREVIEW_FADE_SEC)
    this.backend.setBgmVolume(this.busVolume())
    if (this.desired && this.unlocked && this.musicOn) void this.startBgm(this.desired, token)
  }

  /** 試聽某首 BGM 的某個版本（無縫循環）。一次只播一首：會取代正在試聽的那首。`resume` 從上次暫停處繼續。 */
  previewBgm(id: string, variant: string, resume = false) {
    this.beginPreview()
    const offset = resume && this.preview?.id === id && this.preview.variant === variant && this.preview.status === 'paused' ? this.pausedAt : 0
    const token = ++this.token
    // 一次只播一首：先讓正在試聽的那首淡出，新的下載好再淡入
    const old = this.playing
    this.playing = null
    old?.voice.fadeOut(PREVIEW_FADE_SEC)
    this.setPreview({ id, variant, status: 'loading' })
    const unlocking = this.unlock() // 必須在使用者手勢內同步開始
    void this.runPreview(id, variant, offset, token, unlocking)
  }

  private async runPreview(id: string, variant: string, offset: number, token: number, unlocking: Promise<boolean>) {
    try {
      const m = await this.init()
      const entry = m[`bgm/${id}`]?.variants[variant]
      if (!entry) throw new Error('no such variant')
      const [buf, ok] = await Promise.all([this.bgmBuffer(entry.src), unlocking])
      if (token !== this.token) return
      if (!buf || !ok) throw new Error('load failed')
      const voice = this.backend.playBgmFile(buf, {
        loopStart: entry.loopStart,
        loopEnd: entry.loopEnd,
        gain: BGM_FILE_BASE * dbToGain(entry.gainDb),
        fadeInSec: PREVIEW_FADE_SEC,
        offset,
      })
      this.playing = { id, variant, voice }
      this.setPreview({ id, variant, status: 'playing' })
    } catch {
      if (token === this.token) this.setPreview({ id, variant, status: 'error' })
    }
  }

  /** 暫停試聽（記住位置，可用 `previewBgm(..., true)` 接著播）。 */
  pausePreview() {
    const p = this.preview
    if (!p || p.status !== 'playing' || !this.playing) return
    this.pausedAt = this.playing.voice.position?.() ?? 0
    this.pausedDuration = this.playing.voice.duration
    this.token++
    const old = this.playing
    this.playing = null
    old.voice.fadeOut(PREVIEW_FADE_SEC)
    this.setPreview({ ...p, status: 'paused' })
  }

  /** 停止試聽（保持在鑑賞模式，遊戲 BGM 仍暫停）。 */
  stopPreview() {
    this.token++
    const old = this.playing
    this.playing = null
    old?.voice.fadeOut(PREVIEW_FADE_SEC)
    this.setPreview(null)
  }

  /** 試聽曲目目前在音檔內的位置（秒） */
  previewPosition(): number {
    if (this.preview?.status === 'paused') return this.pausedAt
    return this.preview?.status === 'playing' ? (this.playing?.voice.position?.() ?? 0) : 0
  }

  /** 試聽曲目的實際總長（秒）；尚未載入時 undefined */
  previewDuration(): number | undefined {
    if (this.preview?.status === 'paused') return this.pausedDuration
    return this.preview?.status === 'playing' ? this.playing?.voice.duration : undefined
  }

  /** 試聽某個音效的某個版本（略過節流與聲部上限的 blip 限制）。 */
  previewSfx(id: string, variant: string) {
    const unlocking = this.unlock()
    void (async () => {
      try {
        const m = await this.init()
        const entry = m[`sfx/${id}`]?.variants[variant]
        if (!entry) return
        const [buf] = await Promise.all([this.buffer(entry.src), unlocking])
        if (!buf || !this.getSettings().sfxOn) return
        this.playSfxBuffer(`${id}:${variant}`, buf, SFX_VOLUME, entry)
      } catch {
        /* ignore audio errors */
      }
    })()
  }
}
