import type { BgId } from '@/content/backgrounds'
import type { TimeOfDay } from '@/engine/types'
import { useArtManifest } from '../manifest'

const PALETTE: Record<BgId, [string, string]> = {
  gate: ['#fbd3e0', '#cfe8c9'], classroom: ['#fdf1d6', '#dfe9f5'], clubroom: ['#e6dff5', '#f7e1d0'],
  corridor: ['#dbe7f3', '#f2e6d8'], rooftop: ['#a9d6f2', '#e5f3d8'], library: ['#e8d7c2', '#cdb99f'],
  broadcast: ['#f5d4b8', '#e9c0cf'], council: ['#c7d3ec', '#e2e6f2'], street: ['#fcd9b8', '#f0b8c4'],
  planetarium: ['#2a2656', '#5a4a9a'], beach: ['#9fd8ef', '#f7e6b8'], festival: ['#f7b8c8', '#ffe3a8'],
  rain: ['#8fa3b8', '#c3ced9'],
}
const TINT: Record<TimeOfDay, string> = {
  day: 'none',
  dusk: 'sepia(0.35) saturate(1.3) hue-rotate(-15deg) brightness(0.92)',
  night: 'brightness(0.55) saturate(0.9) hue-rotate(200deg)',
}

export interface BackgroundProps {
  id: BgId
  time?: TimeOfDay
}

/**
 * PUBLIC ART INTERFACE (P1 replaces the body, keeps the props). Fills its parent (1280x720 stage).
 * Uses /art/bg/<id>.png when listed in public/art/manifest.json.
 */
export function Background({ id, time = 'day' }: BackgroundProps) {
  const manifest = useArtManifest()
  const [a, b] = PALETTE[id]
  const png = !!manifest[`bg/${id}`]
  return (
    <div
      style={{
        position: 'absolute', inset: 0, filter: TINT[time],
        background: png ? `center/cover url(/art/bg/${id}.png)` : `linear-gradient(180deg, ${a}, ${b})`,
      }}
    >
      {!png && (
        <div style={{ position: 'absolute', left: 24, top: 20, font: '600 22px var(--font-title)', color: 'rgba(0,0,0,.35)' }}>
          [BG] {id} · {time}
        </div>
      )}
    </div>
  )
}
