/**
 * 角色語音播放：按需載入、同一時間只播一行、播放時把 BGM 壓低（ducking）、
 * 並提供狀態讓自動播放模式等語音播完。語音關閉時完全不載入任何語音檔（連 manifest 也不抓）。
 * 不直接碰 Web Audio——發聲經過可注入的 `VoiceBackend`，方便單元測試。
 */
import { dbToGain } from './manifest'
import { lookupVoice, parseVoiceManifest, type VoiceManifest } from './voiceManifest'

export interface VoiceHandle {
  /** 淡出後停止（`fadeSec` 秒）；不論自然播完或被停止，`playVoiceFile` 的 `onEnded` 都會呼叫 */
  stop(fadeSec: number): void
}

export interface VoiceBackend {
  loadVoiceManifest(): Promise<unknown>
  /** 下載並解碼；失敗回傳 null（不丟例外） */
  loadBuffer(src: string): Promise<unknown | null>
  playVoiceFile(buffer: unknown, gain: number, onEnded: () => void): VoiceHandle
  /** BGM 壓低：`gain` 為相對於正常音量的倍率（1 = 不壓），在 `rampSec` 秒內漸變 */
  setBgmDuck(gain: number, rampSec: number): void
}

export interface VoiceDeps {
  backend: VoiceBackend
  getVoiceOn: () => boolean
  /** 使用者手勢內解鎖 AudioContext（可重複呼叫） */
  unlock: () => Promise<boolean>
  isUnlocked: () => boolean
}

/** loading：載入中；playing：播放中；ended：自然播完；none：這一行沒有語音（缺檔、載入失敗或逾時） */
export type VoiceStatus = 'loading' | 'playing' | 'ended' | 'none'
export interface VoiceState {
  /** 對應的行 id（劇本 lineId；對話紀錄重播也用該行的 lineId） */
  id: string
  status: VoiceStatus
}

/** 語音的基準音量 */
export const VOICE_BASE = 0.9
/** 語音播放時 BGM 壓低的 dB */
export const VOICE_DUCK_DB = -6
export const VOICE_DUCK_GAIN = dbToGain(VOICE_DUCK_DB)
export const DUCK_DOWN_SEC = 0.15
export const DUCK_UP_SEC = 0.5
/** 被推進／跳過／開選單時，目前語音的淡出秒數 */
export const VOICE_FADE_SEC = 0.12
/** 語音下載逾時（自動播放不會因為慢網路卡住太久，逾時就當作沒有語音） */
export const VOICE_LOAD_TIMEOUT_MS = 4000
/** 同時保留在記憶體的語音解碼緩衝上限 */
export const VOICE_BUFFER_CAP = 24
/** 預載接下來幾行 */
export const VOICE_PREFETCH = 3

export class VoicePlayer {
  private manifestP: Promise<VoiceManifest> | null = null
  private buffers = new Map<string, Promise<unknown | null>>()
  private token = 0
  private handle: VoiceHandle | null = null
  private ducked = false
  private state: VoiceState | null = null
  private listeners = new Set<() => void>()

  constructor(private deps: VoiceDeps) {}

  getState = (): VoiceState | null => this.state

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb)
    return () => {
      this.listeners.delete(cb)
    }
  }

  private setState(s: VoiceState | null) {
    this.state = s
    for (const cb of [...this.listeners]) cb()
  }

  /** 語音 manifest。語音關閉時回傳 {}（不下載、也不快取，之後打開才會抓）。 */
  manifest(): Promise<VoiceManifest> {
    if (!this.deps.getVoiceOn()) return Promise.resolve({})
    if (!this.manifestP) {
      this.manifestP = this.deps.backend
        .loadVoiceManifest()
        .then((raw) => parseVoiceManifest(raw))
        .catch(() => {
          this.manifestP = null // 失敗不快取，下次可重試
          return {} as VoiceManifest
        })
    }
    return this.manifestP
  }

  private buffer(src: string): Promise<unknown | null> {
    let p = this.buffers.get(src)
    if (p) {
      this.buffers.delete(src)
      this.buffers.set(src, p)
      return p
    }
    p = this.deps.backend
      .loadBuffer(src)
      .catch(() => null)
      .then((b) => {
        if (!b && this.buffers.get(src) === p) this.buffers.delete(src)
        return b
      })
    this.buffers.set(src, p)
    while (this.buffers.size > VOICE_BUFFER_CAP) {
      const oldest = this.buffers.keys().next().value
      if (oldest === undefined || oldest === src) break
      this.buffers.delete(oldest)
    }
    return p
  }

  private duck(on: boolean) {
    if (this.ducked === on) return
    this.ducked = on
    this.deps.backend.setBgmDuck(on ? VOICE_DUCK_GAIN : 1, on ? DUCK_DOWN_SEC : DUCK_UP_SEC)
  }

  /** 停掉目前的語音但不放開 ducking（接著要播下一行時避免 BGM 忽大忽小） */
  private halt(fadeSec: number) {
    this.token++
    const h = this.handle
    this.handle = null
    h?.stop(fadeSec)
  }

  /** 停止目前語音（短淡出）並恢復 BGM。 */
  stop(fadeSec = VOICE_FADE_SEC) {
    this.halt(fadeSec)
    this.duck(false)
    if (this.state) this.setState(null)
  }

  /** 播放某場景某行的語音；沒有語音（缺檔等）時狀態變為 none，行為與沒有語音機制時相同。 */
  play(lineId: string, sceneId: string, key: string) {
    this.halt(VOICE_FADE_SEC)
    if (!this.deps.getVoiceOn()) {
      this.stop()
      return
    }
    const token = this.token
    void this.deps.unlock() // 在使用者手勢內建立 AudioContext；沒有手勢時不會有聲音
    this.setState({ id: lineId, status: 'loading' })
    void this.run(lineId, sceneId, key, token)
  }

  private async run(lineId: string, sceneId: string, key: string, token: number) {
    const fail = () => {
      if (token !== this.token) return
      this.duck(false)
      this.setState({ id: lineId, status: 'none' })
    }
    try {
      const m = await this.manifest()
      if (token !== this.token) return
      const entry = lookupVoice(m, sceneId, key)
      if (!entry) return fail()
      const unlocking = this.deps.unlock()
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<null>((r) => {
        timer = setTimeout(() => r(null), VOICE_LOAD_TIMEOUT_MS)
      })
      const buf = await Promise.race([this.buffer(entry.src), timeout]).finally(() => clearTimeout(timer))
      const ok = await unlocking
      if (token !== this.token) return
      if (!buf || !ok) return fail()
      this.duck(true)
      this.handle = this.deps.backend.playVoiceFile(buf, VOICE_BASE, () => {
        if (token !== this.token) return
        this.handle = null
        this.duck(false)
        this.setState({ id: lineId, status: 'ended' })
      })
      this.setState({ id: lineId, status: 'playing' })
    } catch {
      fail()
    }
  }

  /** 預載接下來幾行（只下載、解碼；語音關閉或尚未解鎖時什麼都不做）。 */
  prefetch(sceneId: string, keys: string[]) {
    if (!this.deps.getVoiceOn() || !this.deps.isUnlocked() || keys.length === 0) return
    void this.manifest().then((m) => {
      if (!this.deps.getVoiceOn()) return
      for (const key of keys.slice(0, VOICE_PREFETCH)) {
        const e = lookupVoice(m, sceneId, key)
        if (e) void this.buffer(e.src)
      }
    })
  }

  /** 設定改變：語音關閉就立刻停止。 */
  settingsChanged() {
    if (!this.deps.getVoiceOn()) this.stop()
  }
}
