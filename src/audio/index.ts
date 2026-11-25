/** Audio stub (P5 replaces the internals; keep this API). */
import { useSettings } from '@/store/settings'

let ctx: AudioContext | null = null
let currentBgm: string | null = null

function ac(): AudioContext | null {
  try {
    if (!ctx && typeof AudioContext !== 'undefined') ctx = new AudioContext()
    if (ctx?.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

const TONES: Record<string, [number, number]> = { click: [660, 0.04], choice: [880, 0.08], card: [1040, 0.18] }

export const audio = {
  /** Play a sound effect by id. Unknown ids are ignored. */
  sfx(id: string) {
    const vol = useSettings.getState().sfxVolume
    const c = ac()
    const tone = TONES[id]
    if (!c || !tone || vol <= 0) return
    try {
      const o = c.createOscillator()
      const g = c.createGain()
      o.frequency.value = tone[0]
      g.gain.value = 0.05 * vol
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + tone[1])
      o.connect(g).connect(c.destination)
      o.start()
      o.stop(c.currentTime + tone[1])
    } catch {
      /* ignore */
    }
  },
  /** Start looping BGM by id (no-op stub). */
  bgm(id: string) {
    currentBgm = id
  },
  stopBgm() {
    currentBgm = null
  },
  get currentBgm() {
    return currentBgm
  },
}
