import type { BgId } from '@/content/backgrounds'
import type { TimeOfDay } from '@/engine/types'
import { useArtManifest } from '../manifest'
import { OutingBackground } from './outing'
import { SakuraParticles, StarParticles } from './Particles'
import { SchoolBackground } from './school'

const SCHOOL_BGS = new Set<BgId>([
  'gate', 'classroom', 'clubroom', 'corridor', 'rooftop', 'library', 'broadcast', 'council', 'infirmary',
])

const OUTDOOR_BGS = new Set<BgId>(['gate', 'rooftop', 'street', 'beach', 'festival'])

const SKY_GRAD: Record<TimeOfDay, [string, string]> = {
  day: ['#9cd7f5', '#eef7ff'],
  dusk: ['#f48c72', '#ffe0a3'],
  night: ['#151b38', '#333b69'],
}

const OVERLAY_TINT: Record<TimeOfDay, string> = {
  day: 'transparent',
  dusk: 'linear-gradient(180deg, rgba(255, 118, 64, 0.28) 0%, rgba(168, 72, 118, 0.24) 100%)',
  night: 'linear-gradient(180deg, rgba(10, 16, 48, 0.56) 0%, rgba(22, 30, 72, 0.44) 100%)',
}

export interface BackgroundProps {
  id: BgId
  time?: TimeOfDay
}

/**
 * PUBLIC ART INTERFACE. Fills its parent (1280x720 stage).
 * Uses /art/bg/<id>.webp|png when listed in public/art/manifest.json.
 */
export function Background({ id, time = 'day' }: BackgroundProps) {
  const manifest = useArtManifest()
  const entry = manifest[`bg/${id}`]
  const imgSrc = typeof entry === 'string' ? entry : entry ? `/art/bg/${id}.png` : null

  if (imgSrc) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={imgSrc}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
          style={{
            filter:
              time === 'dusk'
                ? 'sepia(0.22) saturate(1.25) brightness(0.92)'
                : time === 'night'
                  ? 'brightness(0.58) saturate(0.88) hue-rotate(8deg)'
                  : undefined,
          }}
        />
        {time !== 'day' && (
          <div className="pointer-events-none absolute inset-0" style={{ background: OVERLAY_TINT[time] }} />
        )}
        {time === 'night' && OUTDOOR_BGS.has(id) && (
          <svg viewBox="0 0 1280 720" className="pointer-events-none absolute inset-0 h-full w-full opacity-80">
            <StarParticles />
          </svg>
        )}
        {id === 'gate' && <SakuraParticles />}
      </div>
    )
  }

  const [skyTop, skyBot] = SKY_GRAD[time]
  const night = time === 'night'

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="sky-soft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyBot} />
          </linearGradient>
        </defs>
        {SCHOOL_BGS.has(id) ? <SchoolBackground id={id} night={night} /> : <OutingBackground id={id} night={night} />}
        {time !== 'day' && <rect width="1280" height="720" fill={time === 'dusk' ? 'rgba(255,132,68,0.22)' : 'rgba(18,24,62,0.42)'} />}
      </svg>
      {id === 'gate' && <SakuraParticles />}
    </div>
  )
}
