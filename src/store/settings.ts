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
}

export const DEFAULT_SETTINGS: Settings = { textSpeed: 40, autoDelayMs: 1500, bgmVolume: 0.3, sfxVolume: 0.6, skipUnreadAllowed: false }
const KEY = 'seo-journey:settings'

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void
  reset: () => void
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  ...safeGetJSON<Partial<Settings>>(KEY),
  set: (patch) => {
    set(patch)
    const { set: _s, reset: _r, ...rest } = get()
    safeSetJSON(KEY, rest)
  },
  reset: () => get().set(DEFAULT_SETTINGS),
}))
