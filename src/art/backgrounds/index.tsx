import type { BgId } from '@/content/backgrounds'
import type { TimeOfDay } from '@/engine/types'
import { useArtManifest } from '../manifest'
import { OutingBackground } from './outing'
import { SakuraParticles } from './Particles'
import { SchoolBackground } from './school'

const SCHOOL_BGS = new Set<BgId>([
  'gate', 'classroom', 'clubroom', 'corridor', 'rooftop', 'library', 'broadcast', 'council', 'infirmary',
])

const SKY_GRAD: Record<TimeOfDay, [string, string]> = {
  day: ['#9cd7f5', '#eef7ff'],
  dusk: ['#f48c72', '#ffe0a3'],
  night: ['#151b38', '#333b69'],
}

const OVERLAY_TINT: Record<TimeOfDay, string> = {
  day: 'transparent',
  dusk: 'rgba(255, 132, 68, 0.22)',
  night: 'rgba(18, 24, 62, 0.42)',
}

export interface BackgroundProps {
  id: BgId
  time?: TimeOfDay
}

/**
 * PUBLIC ART INTERFACE. Fills its parent (1280x720 stage).
 * Uses /art/bg/<id>.png when listed in public/art/manifest.json.
 */
export function Background({ id, time = 'day' }: BackgroundProps) {
  const manifest = useArtManifest()
  const png = !!manifest[`bg/${id}`]
  if (png) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `center/cover url(/art/bg/${id}.png)`,
        }}
      >
        {time !== 'day' && <div style={{ position: 'absolute', inset: 0, background: OVERLAY_TINT[time], pointerEvents: 'none' }} />}
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
        {time !== 'day' && <rect width="1280" height="720" fill={OVERLAY_TINT[time]} />}
      </svg>
      {id === 'gate' && <SakuraParticles />}
    </div>
  )
}
