import { create } from 'zustand'
import { safeGetJSON, safeSetJSON } from './storage'

export interface Settings {
  /** typewriter speed, characters per second */
  textSpeed: number
  /** extra delay after a line finishes before auto-advance (ms) */
  autoDelayMs: number
  bgmVolume: number
  sfxVolume: number
  skipUnreadAllowed: boolean
  /** 每個 BGM／SFX 採用的版本，鍵為 `bgm/<id>`／`sfx/<id>`；沒有的用 manifest 的 default */
  audioVariants: Record<string, string>
}

export const DEFAULT_SETTINGS: Settings = { textSpeed: 40, autoDelayMs: 1500, bgmVolume: 0.3, sfxVolume: 0.6, skipUnreadAllowed: true, audioVariants: {} }
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

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void
  /** 設定某個 id 採用哪一版（`key` 如 `bgm/title`） */
  setAudioVariant: (key: string, variant: string) => void
  reset: () => void
}

const persisted = safeGetJSON<Partial<Settings>>(KEY)

export const useSettings = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  ...persisted,
  audioVariants: sanitizeAudioVariants(persisted?.audioVariants),
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
