/**
 * 播放引擎的「狀態機」：決定播檔案還是合成聲、切曲／淡入淡出／停止、SFX 節流與同時發聲上限。
 * 不直接碰 Web Audio——所有實際發聲都經過可注入的 `AudioBackend`，方便單元測試。
 */
import { dbToGain, parseManifest, pickSource, type AudioManifest, type ManifestEntry } from './manifest'

export interface BgmVoice {
  /** 以等功率曲線淡出後停止 */
  fadeOut(sec: number): void
  /** 立即停止 */
  stop(): void
}

export interface BgmFileOptions {
  loopStart?: number
  loopEnd?: number
  /** 線性增益（已含 base 與 gainDb） */
  gain: number
  fadeInSec: number
}

export interface AudioBackend {
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
  /** 即時設定 BGM 主音量（bgmVolume） */
  setBgmVolume(v: number): void
}

export interface EngineDeps {
  backend: AudioBackend
  getSettings: () => { bgmVolume: number; sfxVolume: number }
  now?: () => number
}

/** 交叉淡入淡出秒數 */
export const FADE_SEC = 1
/** 單一音效最多同時發聲數 */
export const MAX_SFX_VOICES = 4
export const BLIP_MIN_GAP_MS = 65
/** 音檔的基準音量（再乘上 gainDb 與使用者音量），避免滿刻度檔案過響 */
export const BGM_FILE_BASE = 0.8
export const SFX_FILE_BASE = 0.8

export class AudioEngine {
  private backend: AudioBackend
  private getSettings: EngineDeps['getSettings']
  private now: () => number

  private manifest: AudioManifest | null = null
  private manifestP: Promise<AudioManifest> | null = null
  private buffers = new Map<string, Promise<unknown | null>>()
  private loaded = new Map<string, unknown>()

  private unlocked = false
  private unlockP: Promise<boolean> | null = null

  /** 目前「應該播」的 BGM（含尚在下載、尚未解鎖的） */
  private desired: string | null = null
  private playing: { id: string; voice: BgmVoice } | null = null
  private token = 0

  private lastBlipAt = -Infinity
  private sfxActive = new Map<string, number>()

  constructor(deps: EngineDeps) {
    this.backend = deps.backend
    this.getSettings = deps.getSettings
    this.now = deps.now ?? (() => Date.now())
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
    this.backend.setBgmVolume(this.getSettings().bgmVolume)
    void this.preloadSfx()
    if (this.desired && !this.playing) void this.startBgm(this.desired, ++this.token)
  }

  private async preloadSfx() {
    const m = await this.init()
    for (const [key, entry] of Object.entries(m)) {
      if (key.startsWith('sfx/')) void this.buffer(entry.src)
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

  setBgmVolume(v: number) {
    this.backend.setBgmVolume(v)
  }

  sfx(id: string) {
    void this.unlock()
    void this.init()
    const vol = this.getSettings().sfxVolume
    if (vol <= 0) return
    if (id === 'blip') {
      const t = this.now()
      if (t - this.lastBlipAt < BLIP_MIN_GAP_MS) return
      this.lastBlipAt = t
    }
    try {
      const pick = pickSource(this.manifest, 'sfx', id)
      if (pick.kind === 'file') {
        const buf = this.loaded.get(pick.entry.src)
        if (buf) {
          const n = this.sfxActive.get(id) ?? 0
          if (n >= MAX_SFX_VOICES) return
          this.sfxActive.set(id, n + 1)
          this.backend.playSfxFile(buf, vol * SFX_FILE_BASE * dbToGain(pick.entry.gainDb), () => {
            this.sfxActive.set(id, Math.max(0, (this.sfxActive.get(id) ?? 1) - 1))
          })
          return
        }
        void this.buffer(pick.entry.src) // 還沒載好：這次先用合成聲
      }
      this.backend.playSfxSynth(id, vol)
    } catch {
      /* ignore audio errors */
    }
  }

  bgm(id: string) {
    if (this.desired === id) return
    this.desired = id
    const token = ++this.token // 取消任何尚在下載的舊請求
    if (this.playing?.id === id) return // 切回正在播的那首：保持不動
    void this.init()
    // 不在這裡 unlock：瀏覽器要求 AudioContext 在使用者手勢內建立，手勢監聽（index.ts）與 sfx() 會負責
    if (this.unlocked) void this.startBgm(id, token)
    // 未解鎖：等 onUnlocked 補播
  }

  stopBgm() {
    this.desired = null
    this.token++
    const p = this.playing
    this.playing = null
    p?.voice.fadeOut(FADE_SEC)
  }

  private async startBgm(id: string, token: number) {
    try {
      const m = await this.init()
      if (token !== this.token) return
      const pick = pickSource(m, 'bgm', id)
      let voice: BgmVoice | null = null
      if (pick.kind === 'file') {
        const e: ManifestEntry = pick.entry
        const buf = await this.buffer(e.src)
        if (token !== this.token) return
        if (buf) {
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
      this.playing = { id, voice }
      old?.voice.fadeOut(FADE_SEC)
    } catch {
      /* ignore audio errors */
    }
  }
}
