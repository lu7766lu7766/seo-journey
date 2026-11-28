import { create } from 'zustand'
import { safeGetJSON, safeSetJSON } from './storage'

export interface Settings {
  /** typewriter speed, characters per second */
  textSpeed: number
  /** extra delay after a line finishes before auto-advance (ms) */
  autoDelayMs: number
  /** 音樂開關（引擎音量用固定基準值） */
  musicOn: boolean
  /** 音效開關 */
  sfxOn: boolean
  /** 角色語音開關；關閉時完全不載入語音檔 */
  voiceOn: boolean
  skipUnreadAllowed: boolean
  /** 每個 BGM／SFX 採用的版本，鍵為 `bgm/<id>`／`sfx/<id>`；沒有的用 manifest 的 default */
  audioVariants: Record<string, string>
}

export const DEFAULT_SETTINGS: Settings = {
  textSpeed: 40,
  autoDelayMs: 1500,
  musicOn: true,
  sfxOn: true,
  voiceOn: true,
  skipUnreadAllowed: true,
  audioVariants: {},
}
const KEY = 'seo-journey:settings'

const AUDIO_KEY_RE = /^(bgm|sfx)\/[A-Za-z0-9_-]+$/
const VARIANT_RE = /^[A-Za-z0-9_-]+$/

/** 讀回的 audioVariants 可能被手動改壞：只保留格式正確的條目。 */
export function sanitizeAudioVariants(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw)) {
    if (AUDIO_KEY_RE.test(k) && typeof v === 'string' && VARIANT_RE.test(v)) out[k] = v
  }
  return out
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

/**
 * 讀回的設定正規化：只保留已知欄位、型別不對的用預設。
 * 舊版的 `bgmVolume`／`sfxVolume`（數值）遷移成開關：> 0 視為開、0 視為關（沒有舊值就用預設）。
 */
export function normalizeSettings(raw: unknown): Settings {
  const r: Record<string, unknown> = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const d = DEFAULT_SETTINGS
  const legacy = (v: unknown, fallback: boolean) => (isNum(v) ? v > 0 : fallback)
  return {
    textSpeed: isNum(r.textSpeed) ? r.textSpeed : d.textSpeed,
    autoDelayMs: isNum(r.autoDelayMs) ? r.autoDelayMs : d.autoDelayMs,
    musicOn: bool(r.musicOn, legacy(r.bgmVolume, d.musicOn)),
    sfxOn: bool(r.sfxOn, legacy(r.sfxVolume, d.sfxOn)),
    voiceOn: bool(r.voiceOn, d.voiceOn),
    skipUnreadAllowed: bool(r.skipUnreadAllowed, d.skipUnreadAllowed),
    audioVariants: sanitizeAudioVariants(r.audioVariants),
  }
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void
  /** 設定某個 id 採用哪一版（`key` 如 `bgm/title`） */
  setAudioVariant: (key: string, variant: string) => void
  reset: () => void
}

const persisted = safeGetJSON<unknown>(KEY)

export const useSettings = create<SettingsStore>((set, get) => ({
  ...normalizeSettings(persisted),
  set: (patch) => {
    set(patch)
    const { set: _s, reset: _r, setAudioVariant: _v, ...rest } = get()
    safeSetJSON(KEY, rest)
  },
  setAudioVariant: (key, variant) => {
    if (!AUDIO_KEY_RE.test(key) || !VARIANT_RE.test(variant)) return
    get().set({ audioVariants: { ...get().audioVariants, [key]: variant } })
  },
  reset: () => get().set(DEFAULT_SETTINGS),
}))
