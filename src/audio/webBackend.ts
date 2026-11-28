/** 真正的 Web Audio 後端：載入／解碼、BufferSource 無縫循環、等功率交叉淡化，沒有檔案時走 synth。 */
import type { AudioBackend, BgmFileOptions, BgmVoice } from './engine'
import { loopPosition } from './manifest'
import { playSynthSfx, startSynthBgm } from './synth'
import { VOICE_MANIFEST_URL } from './voiceManifest'

const MANIFEST_URL = '/audio/manifest.json'
const CURVE_N = 48

/** 等功率淡入／淡出曲線（0→1 / 1→0），乘上 peak */
function curve(kind: 'in' | 'out', peak: number): Float32Array {
  const a = new Float32Array(CURVE_N)
  for (let i = 0; i < CURVE_N; i++) {
    const x = i / (CURVE_N - 1)
    a[i] = peak * (kind === 'in' ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2))
  }
  return a
}

export function createWebBackend(): AudioBackend {
  let ctx: AudioContext | null = null
  let bus: GainNode | null = null
  /** BGM ducking（語音播放時把 BGM 壓低）：bus → duck → destination */
  let duck: GainNode | null = null
  let bgmVol = 0.3
  let duckGain = 1

  const ensureCtx = (): AudioContext | null => {
    try {
      if (!ctx && typeof AudioContext !== 'undefined') {
        ctx = new AudioContext()
        bus = ctx.createGain()
        bus.gain.value = bgmVol
        duck = ctx.createGain()
        duck.gain.value = duckGain
        bus.connect(duck).connect(ctx.destination)
      }
      return ctx
    } catch {
      return null
    }
  }

  const fileVoice = (c: AudioContext, buffer: AudioBuffer, o: BgmFileOptions): BgmVoice => {
    const src = c.createBufferSource()
    src.buffer = buffer
    src.loop = true
    if (o.loopStart !== undefined) src.loopStart = Math.min(o.loopStart, buffer.duration)
    if (o.loopEnd !== undefined) src.loopEnd = Math.min(o.loopEnd, buffer.duration)
    const g = c.createGain()
    const t0 = c.currentTime
    g.gain.setValueAtTime(0, t0)
    g.gain.setValueCurveAtTime(curve('in', o.gain), t0 + 0.001, Math.max(0.05, o.fadeInSec))
    src.connect(g).connect(bus!)
    const offset = Math.min(Math.max(0, o.offset ?? 0), Math.max(0, buffer.duration - 0.01))
    src.start(t0, offset)
    let done = false
    const halt = () => {
      if (done) return
      done = true
      try {
        src.stop()
      } catch {
        /* already stopped */
      }
      try {
        src.disconnect()
        g.disconnect()
      } catch {
        /* ignore */
      }
    }
    src.onended = halt
    return {
      duration: buffer.duration,
      position: () => loopPosition(offset + (c.currentTime - t0), buffer.duration, src.loopStart, src.loopEnd || undefined),
      fadeOut(sec) {
        if (done) return
        const t = c.currentTime
        const cur = Math.max(0.0001, g.gain.value)
        try {
          g.gain.cancelScheduledValues(t)
          g.gain.setValueAtTime(cur, t)
          g.gain.setValueCurveAtTime(curve('out', cur), t + 0.001, Math.max(0.05, sec))
          src.stop(t + sec + 0.05)
        } catch {
          halt()
        }
      },
      stop: halt,
    }
  }

  return {
    async unlock() {
      const c = ensureCtx()
      if (!c) return false
      if (c.state === 'running') return true
      try {
        // 沒有手勢時 resume() 的 promise 不會 resolve，所以限時等待，下次手勢再試
        await Promise.race([c.resume(), new Promise((r) => setTimeout(r, 400))])
      } catch {
        /* ignore */
      }
      return (c.state as AudioContextState) === 'running'
    },

    async loadManifest() {
      const res = await fetch(MANIFEST_URL, { cache: 'no-cache' })
      if (!res.ok) return {}
      return res.json()
    },

    async loadVoiceManifest() {
      const res = await fetch(VOICE_MANIFEST_URL, { cache: 'no-cache' })
      if (!res.ok) return {}
      return res.json()
    },

    async loadBuffer(src) {
      const c = ensureCtx()
      if (!c) return null
      try {
        const res = await fetch(src)
        if (!res.ok) return null
        return await c.decodeAudioData(await res.arrayBuffer())
      } catch {
        return null
      }
    },

    playBgmFile(buffer, opts) {
      return fileVoice(ensureCtx()!, buffer as AudioBuffer, opts)
    },

    playBgmSynth(id, fadeInSec) {
      const c = ensureCtx()!
      return startSynthBgm(c, bus!, id, fadeInSec, () => bgmVol)
    },

    playSfxFile(buffer, gain, onEnded) {
      const c = ensureCtx()
      if (!c) {
        onEnded()
        return
      }
      const src = c.createBufferSource()
      src.buffer = buffer as AudioBuffer
      const g = c.createGain()
      g.gain.value = gain
      src.connect(g).connect(c.destination)
      src.onended = () => {
        try {
          src.disconnect()
          g.disconnect()
        } catch {
          /* ignore */
        }
        onEnded()
      }
      src.start()
    },

    playSfxSynth(id, vol) {
      const c = ensureCtx()
      if (c) playSynthSfx(c, id, vol)
    },

    playVoiceFile(buffer, gain, onEnded) {
      const c = ensureCtx()
      if (!c) {
        onEnded()
        return { stop() {} }
      }
      const src = c.createBufferSource()
      src.buffer = buffer as AudioBuffer
      const g = c.createGain()
      g.gain.value = gain
      src.connect(g).connect(c.destination)
      src.onended = () => {
        try {
          src.disconnect()
          g.disconnect()
        } catch {
          /* ignore */
        }
        onEnded()
      }
      src.start()
      return {
        stop(fadeSec) {
          const t = c.currentTime
          try {
            g.gain.cancelScheduledValues(t)
            g.gain.setValueAtTime(g.gain.value, t)
            g.gain.linearRampToValueAtTime(0, t + Math.max(0.02, fadeSec))
            src.stop(t + Math.max(0.02, fadeSec) + 0.02)
          } catch {
            /* already stopped */
          }
        },
      }
    },

    setBgmDuck(gain, rampSec) {
      duckGain = gain
      if (ctx && duck) duck.gain.setTargetAtTime(gain, ctx.currentTime, Math.max(0.01, rampSec / 3))
    },

    setBgmVolume(v) {
      bgmVol = v
      if (ctx && bus) bus.gain.setTargetAtTime(v, ctx.currentTime, 0.05)
    },
  }
}
