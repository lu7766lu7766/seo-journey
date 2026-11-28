/** 合成聲備援：沒有音檔的 id 沿用這裡（Web Audio 即時合成）。 */
import type { BgmVoice } from './engine'

export type SfxId = 'click' | 'blip' | 'choice' | 'card' | 'grow' | 'bond' | 'fail' | 'win'
export type BgmId = 'title' | 'daily' | 'warm' | 'festival' | 'tense'

export function playNote(
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

/** 合成音效。`vol` 為 sfxVolume（0..1）。blip 的節流由引擎處理。 */
export function playSynthSfx(c: AudioContext, id: string, vol: number) {
  const v = 0.065 * vol
  const d = c.destination
  switch (id) {
    case 'blip':
      playNote(c, d, 740, 0, 0.032, v * 0.35, 'sine')
      break
    case 'click':
      playNote(c, d, 660, 0, 0.05, v * 0.7, 'sine')
      break
    case 'choice':
      playNote(c, d, 659.25, 0, 0.07, v * 0.8, 'triangle')
      playNote(c, d, 880, 0.05, 0.09, v * 0.85, 'triangle')
      break
    case 'card':
      playNote(c, d, 783.99, 0, 0.09, v, 'triangle')
      playNote(c, d, 987.77, 0.07, 0.09, v, 'triangle')
      playNote(c, d, 1174.66, 0.14, 0.18, v, 'sine')
      break
    case 'grow':
      playNote(c, d, 523.25, 0, 0.08, v * 0.9, 'triangle')
      playNote(c, d, 659.25, 0.06, 0.08, v * 0.9, 'triangle')
      playNote(c, d, 783.99, 0.12, 0.14, v, 'triangle')
      break
    case 'bond':
      playNote(c, d, 587.33, 0, 0.1, v * 0.85, 'sine')
      playNote(c, d, 880.0, 0.08, 0.18, v * 0.9, 'sine')
      break
    case 'fail':
      playNote(c, d, 392.0, 0, 0.11, v * 0.85, 'triangle')
      playNote(c, d, 311.13, 0.1, 0.18, v * 0.85, 'triangle')
      break
    case 'win':
      playNote(c, d, 523.25, 0, 0.09, v, 'triangle')
      playNote(c, d, 659.25, 0.07, 0.09, v, 'triangle')
      playNote(c, d, 783.99, 0.14, 0.09, v, 'triangle')
      playNote(c, d, 1046.5, 0.21, 0.24, v, 'sine')
      break
  }
}

interface Track {
  tempoMs: number
  wave: OscillatorType
  notes: number[]
  bass: number[]
  /** 整體音量倍率（預設 1） */
  level?: number
}

/** Gentle pentatonic / major BGM motifs (notes in Hz, 0 = rest). */
const BGM_TRACKS: Record<BgmId, Track> = {
  // 標題曲：慢板、純正弦、音量放輕
  title: {
    tempoMs: 700,
    wave: 'sine',
    level: 0.75,
    notes: [523.25, 0, 659.25, 783.99, 659.25, 0, 587.33, 0, 440.0, 0, 523.25, 659.25, 587.33, 0, 523.25, 0],
    bass: [130.81, 0, 0, 0, 196.0, 0, 0, 0, 110.0, 0, 0, 0, 174.61, 0, 196.0, 0],
  },
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

/** 合成 BGM 的整體增益（與舊版 bgmVolume * 0.12 一致）。 */
const SYNTH_BGM_BASE = 0.12

/**
 * 啟動合成 BGM 聲部：自己的增益節點接到 `bus`，淡入、之後可淡出。
 * 未知 id 沿用 daily（與舊行為相同）。`getVolume` 回傳目前 bgmVolume，<=0 時跳過發聲。
 */
export function startSynthBgm(c: AudioContext, bus: AudioNode, id: string, fadeInSec: number, getVolume: () => number): BgmVoice {
  const track = BGM_TRACKS[id as BgmId] ?? BGM_TRACKS.daily
  const level = track.level ?? 1
  const out = c.createGain()
  out.connect(bus)
  const t0 = c.currentTime
  out.gain.setValueAtTime(0.0001, t0)
  out.gain.linearRampToValueAtTime(SYNTH_BGM_BASE, t0 + Math.max(0.01, fadeInSec))
  let step = 0
  let stopped = false
  const tick = () => {
    if (stopped || getVolume() <= 0) return
    try {
      const idx = step % track.notes.length
      const n = track.notes[idx]
      const b = track.bass[idx]
      const sec = track.tempoMs / 1000
      if (n > 0) playNote(c, out, n, 0, sec * 0.9, 0.55 * level, track.wave)
      if (b > 0) playNote(c, out, b, 0, sec * 1.4, 0.4 * level, 'sine')
      step++
    } catch {
      /* ignore */
    }
  }
  tick()
  const timer = setInterval(tick, track.tempoMs)
  const halt = () => {
    if (stopped) return
    stopped = true
    clearInterval(timer)
    try {
      out.disconnect()
    } catch {
      /* ignore */
    }
  }
  return {
    fadeOut(sec) {
      if (stopped) return
      const t = c.currentTime
      try {
        out.gain.cancelScheduledValues(t)
        out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t)
        out.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.01, sec))
      } catch {
        /* ignore */
      }
      setTimeout(halt, sec * 1000 + 60)
    },
    stop: halt,
  }
}
