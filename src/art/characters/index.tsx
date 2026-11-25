import { CHARACTERS, type CharId, type Face } from '@/content/characters'
import { useArtManifest } from '../manifest'

export interface CharacterSpriteProps {
  id: CharId
  face: Face
  speaking?: boolean
}

/**
 * PUBLIC ART INTERFACE (P1 replaces the body, keeps the props).
 * Renders in a 600x1000 box (aspect 0.6). Uses /art/<id>/<face>.png when listed in public/art/manifest.json.
 */
export function CharacterSprite({ id, face, speaking }: CharacterSpriteProps) {
  const manifest = useArtManifest()
  if (manifest[`${id}/${face}`]) {
    return <img src={`/art/${id}/${face}.png`} alt="" draggable={false} style={{ height: '100%', width: 'auto' }} />
  }
  const c = CHARACTERS[id]
  return (
    <svg viewBox="0 0 600 1000" style={{ height: '100%', width: 'auto' }} role="img" aria-label={`${c.name} ${face}`}>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.color} />
          <stop offset="1" stopColor={c.accent} />
        </linearGradient>
      </defs>
      <path d="M300 120c-90 0-140 70-140 150 0 60 20 90 40 110-80 30-150 80-170 200l-20 420h580l-20-420c-20-120-90-170-170-200 20-20 40-50 40-110 0-80-50-150-140-150z" fill={`url(#g-${id})`} stroke="#fff" strokeWidth="6" opacity="0.92" />
      <circle cx="300" cy="260" r="95" fill="#fff4ea" stroke={c.color} strokeWidth="5" />
      <circle cx="265" cy="255" r="10" fill={c.color} />
      <circle cx="335" cy="255" r="10" fill={c.color} />
      <ellipse cx="300" cy="305" rx="22" ry={speaking ? 14 : 5} fill={c.accent} />
      <text x="300" y="560" textAnchor="middle" fontSize="48" fill="#fff" stroke={c.color} strokeWidth="1">{c.name}</text>
      <text x="300" y="620" textAnchor="middle" fontSize="40" fill="#fff" stroke={c.color} strokeWidth="1">[{face}]</text>
    </svg>
  )
}
