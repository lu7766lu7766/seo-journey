import { useSettings } from '@/store/settings'

export type SfxId = 'click' | 'blip' | 'choice' | 'card' | 'grow' | 'bond' | 'fail' | 'win'
export type BgmId = 'daily' | 'warm' | 'festival' | 'tense'

let ctx: AudioContext | null = null
let currentBgm: string | null = null
let bgmTimer: ReturnType<typeof setInterval> | undefined
let bgmMaster: GainNode | null = null
let bgmStep = 0
let lastBlipAt = 0

function ac(): AudioContext | null {
  try {
    if (!ctx && typeof AudioContext !== 'undefined') ctx = new AudioContext()
    if (ctx?.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function playNote(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  startOffset: number,
  dur: number,
  vol: number,
  type: OscillatorType = 'triangle',
) {
  const t = c.currentTime + startOffset
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** Gentle pentatonic / major BGM motifs (notes in Hz, 0 = rest). */
const BGM_TRACKS: Record<BgmId, { tempoMs: number; wave: OscillatorType; notes: number[]; bass: number[] }> = {
  daily: {
    tempoMs: 420,
    wave: 'triangle',
    notes: [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 659.25, 0, 523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 0],
    bass: [261.63, 0, 196.0, 0, 220.0, 0, 196.0, 0, 174.61, 0, 196.0, 0, 261.63, 0, 196.0, 0],
  },
  warm: {
    tempoMs: 560,
    wave: 'sine',
    notes: [440.0, 523.25, 659.25, 587.33, 523.25, 0, 440.0, 392.0, 349.23, 440.0, 523.25, 587.33, 523.25, 0, 440.0, 0],
    bass: [174.61, 0, 220.0, 0, 196.0, 0, 164.81, 0, 174.61, 0, 196.0, 0, 130.81, 0, 196.0, 0],
  },
  festival: {
    tempoMs: 320,
    wave: 'triangle',
    notes: [587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25, 587.33, 659.25, 783.99, 587.33, 0],
    bass: [293.66, 196.0, 293.66, 220.0, 246.94, 196.0, 261.63, 196.0, 293.66, 196.0, 220.0, 246.94, 261.63, 196.0, 293.66, 0],
  },
  tense: {
    tempoMs: 480,
    wave: 'triangle',
    notes: [440.0, 0, 415.3, 392.0, 349.23, 0, 329.63, 349.23, 392.0, 0, 349.23, 329.63, 293.66, 0, 329.63, 0],
    bass: [220.0, 0, 196.0, 0, 174.61, 0, 164.81, 0, 196.0, 0, 174.61, 0, 146.83, 0, 164.81, 0],
  },
}

function ensureBgmMaster(c: AudioContext): GainNode {
  if (!bgmMaster) {
    bgmMaster = c.createGain()
    bgmMaster.connect(c.destination)
  }
  bgmMaster.gain.value = useSettings.getState().bgmVolume * 0.12
  return bgmMaster
}

if (typeof window !== 'undefined') {
  useSettings.subscribe((s) => {
    if (bgmMaster && ctx) {
      bgmMaster.gain.setTargetAtTime(s.bgmVolume * 0.12, ctx.currentTime, 0.05)
    }
  })
}

export const audio = {
  /** Play a synthesized Web Audio sound effect by id. */
  sfx(id: string) {
    const vol = useSettings.getState().sfxVolume
    const c = ac()
    if (!c || vol <= 0) return
    const v = 0.065 * vol
    try {
      switch (id) {
        case 'blip': {
          const now = Date.now()
          if (now - lastBlipAt < 65) return
          lastBlipAt = now
          playNote(c, c.destination, 740, 0, 0.032, v * 0.35, 'sine')
          break
        }
        case 'click':
          playNote(c, c.destination, 660, 0, 0.05, v * 0.7, 'sine')
          break
        case 'choice':
          playNote(c, c.destination, 659.25, 0, 0.07, v * 0.8, 'triangle')
          playNote(c, c.destination, 880, 0.05, 0.09, v * 0.85, 'triangle')
          break
        case 'card':
          playNote(c, c.destination, 783.99, 0, 0.09, v, 'triangle')
          playNote(c, c.destination, 987.77, 0.07, 0.09, v, 'triangle')
          playNote(c, c.destination, 1174.66, 0.14, 0.18, v, 'sine')
          break
        case 'grow':
          playNote(c, c.destination, 523.25, 0, 0.08, v * 0.9, 'triangle')
          playNote(c, c.destination, 659.25, 0.06, 0.08, v * 0.9, 'triangle')
          playNote(c, c.destination, 783.99, 0.12, 0.14, v, 'triangle')
          break
        case 'bond':
          playNote(c, c.destination, 587.33, 0, 0.1, v * 0.85, 'sine')
          playNote(c, c.destination, 880.0, 0.08, 0.18, v * 0.9, 'sine')
          break
        case 'fail':
          playNote(c, c.destination, 392.0, 0, 0.11, v * 0.85, 'triangle')
          playNote(c, c.destination, 311.13, 0.1, 0.18, v * 0.85, 'triangle')
          break
        case 'win':
          playNote(c, c.destination, 523.25, 0, 0.09, v, 'triangle')
          playNote(c, c.destination, 659.25, 0.07, 0.09, v, 'triangle')
          playNote(c, c.destination, 783.99, 0.14, 0.09, v, 'triangle')
          playNote(c, c.destination, 1046.5, 0.21, 0.24, v, 'sine')
          break
      }
    } catch {
      /* ignore audio context errors */
    }
  },

  /** Start looping BGM by id ('daily' | 'warm' | 'festival'). */
  bgm(id: string) {
    if (currentBgm === id && bgmTimer) return
    this.stopBgm()
    currentBgm = id
    const track = BGM_TRACKS[id as BgmId] ?? BGM_TRACKS.daily
    bgmStep = 0
    const tick = () => {
      const vol = useSettings.getState().bgmVolume
      if (vol <= 0) return
      const c = ac()
      if (!c) return
      try {
        const master = ensureBgmMaster(c)
        const idx = bgmStep % track.notes.length
        const n = track.notes[idx]
        const b = track.bass[idx]
        if (n > 0) playNote(c, master, n, 0, (track.tempoMs / 1000) * 0.9, 0.55, track.wave)
        if (b > 0) playNote(c, master, b, 0, (track.tempoMs / 1000) * 1.4, 0.4, 'sine')
        bgmStep++
      } catch {
        /* ignore */
      }
    }
    tick()
    bgmTimer = setInterval(tick, track.tempoMs)
  },

  stopBgm() {
    currentBgm = null
    if (bgmTimer) {
      clearInterval(bgmTimer)
      bgmTimer = undefined
    }
  },

  get currentBgm() {
    return currentBgm
  },
}
