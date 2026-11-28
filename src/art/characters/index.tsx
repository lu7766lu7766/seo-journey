import type { CharId, Face } from '@/content/characters'
import { useArtImage } from '../hooks'
import { useArtManifest, useArtManifestStatus } from '../manifest'
import { resolveSpriteSrc } from '../resolve'
import { HareSprite } from './Hare'
import { KuroSprite } from './Kuro'
import { MiraiSprite } from './Mirai'
import { RinSprite } from './Rin'
import { SenseiSprite } from './Sensei'

export interface CharacterSpriteProps {
  id: CharId
  face: Face
  speaking?: boolean
}

const MOOD_FILTER: Partial<Record<Face, string>> = {
  smile: 'brightness(1.03) saturate(1.06)',
  happy: 'brightness(1.06) saturate(1.12)',
  blush: 'brightness(1.02) saturate(1.08)',
  angry: 'contrast(1.08) saturate(1.06)',
  sad: 'brightness(0.92) saturate(0.84)',
  shock: 'contrast(1.12) brightness(1.04)',
}

function ExpressionEmote({ face }: { face: Face }) {
  switch (face) {
    case 'happy':
      return (
        <svg viewBox="0 0 80 80" className="pointer-events-none absolute right-[8%] top-[8%] h-14 w-14 drop-shadow-[0_2px_8px_rgba(255,215,100,0.85)]">
          <path d="M40 8 L45 27 L64 32 L45 37 L40 56 L35 37 L16 32 L35 27 Z" fill="#ffe680" stroke="#ffffff" strokeWidth="2" />
          <path d="M62 50 L64 58 L72 60 L64 62 L62 70 L60 62 L52 60 L60 58 Z" fill="#ffd4e5" />
        </svg>
      )
    case 'blush':
      return (
        <>
          <div
            className="pointer-events-none absolute left-1/2 top-[24%] h-[6%] w-[30%] -translate-x-1/2 rounded-full blur-md"
            style={{ background: 'radial-gradient(circle, rgba(255,110,145,0.42), transparent 72%)' }}
          />
          <svg viewBox="0 0 64 64" className="pointer-events-none absolute right-[10%] top-[10%] h-12 w-12 drop-shadow-[0_2px_8px_rgba(255,110,145,0.75)]">
            <path
              d="M32 52 C20 42, 10 33, 10 22 C10 15, 16 10, 22 10 C27 10, 30 13, 32 16 C34 13, 37 10, 42 10 C48 10, 54 15, 54 22 C54 33, 44 42, 32 52 Z"
              fill="#ff7597"
              stroke="#fff"
              strokeWidth="2.5"
            />
          </svg>
        </>
      )
    case 'surprised':
    case 'shock':
      return (
        <svg viewBox="0 0 64 64" className="pointer-events-none absolute right-[10%] top-[9%] h-12 w-12 drop-shadow-[0_2px_8px_rgba(90,200,255,0.75)]">
          <path
            d="M32 10 C22 26, 18 36, 18 42 C18 50, 24 55, 32 55 C40 55, 46 50, 46 42 C46 36, 42 26, 32 10 Z"
            fill="#8de2ff"
            stroke="#ffffff"
            strokeWidth="3"
          />
          <ellipse cx="27" cy="40" rx="3.5" ry="6" fill="#ffffff" opacity="0.75" />
        </svg>
      )
    case 'angry':
      return (
        <svg viewBox="0 0 64 64" className="pointer-events-none absolute right-[10%] top-[10%] h-12 w-12 drop-shadow-[0_2px_8px_rgba(230,57,70,0.8)]">
          <g stroke="#ff4d6d" strokeWidth="5.5" strokeLinecap="round" fill="none">
            <path d="M18 16 Q26 26 18 34" />
            <path d="M46 16 Q38 26 46 34" />
            <path d="M22 12 Q32 22 42 12" />
            <path d="M22 38 Q32 28 42 38" />
          </g>
        </svg>
      )
    case 'sad':
      return (
        <svg viewBox="0 0 64 64" className="pointer-events-none absolute right-[10%] top-[10%] h-12 w-12 opacity-90 drop-shadow-[0_2px_6px_rgba(90,130,220,0.6)]">
          <line x1="20" y1="14" x2="20" y2="48" stroke="#8ecae6" strokeWidth="4" strokeLinecap="round" />
          <line x1="32" y1="10" x2="32" y2="52" stroke="#8ecae6" strokeWidth="4" strokeLinecap="round" />
          <line x1="44" y1="16" x2="44" y2="46" stroke="#8ecae6" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )
    case 'think':
      return (
        <svg viewBox="0 0 72 48" className="pointer-events-none absolute right-[7%] top-[9%] h-11 w-14 drop-shadow-[0_2px_8px_rgba(120,160,255,0.6)]">
          <rect x="4" y="6" width="64" height="32" rx="16" fill="rgba(18, 25, 52, 0.85)" stroke="#9fd3f0" strokeWidth="2.5" />
          <circle cx="22" cy="22" r="3.8" fill="#ffffff" />
          <circle cx="36" cy="22" r="3.8" fill="#ffffff" />
          <circle cx="50" cy="22" r="3.8" fill="#ffffff" />
        </svg>
      )
    case 'smug':
      return (
        <svg viewBox="0 0 64 64" className="pointer-events-none absolute right-[10%] top-[10%] h-11 w-11 drop-shadow-[0_2px_8px_rgba(255,205,90,0.85)]">
          <path d="M32 10 L36 28 L54 32 L36 36 L32 54 L28 36 L10 32 L28 28 Z" fill="#ffd166" stroke="#ffffff" strokeWidth="2" />
        </svg>
      )
    default:
      return null
  }
}

function SvgSprite({ id, face, speaking }: CharacterSpriteProps) {
  switch (id) {
    case 'rin':
      return <RinSprite face={face} speaking={speaking} />
    case 'hare':
      return <HareSprite face={face} speaking={speaking} />
    case 'mirai':
      return <MiraiSprite face={face} speaking={speaking} />
    case 'sensei':
      return <SenseiSprite face={face} speaking={speaking} />
    case 'kuro':
      return <KuroSprite face={face} speaking={speaking} />
  }
}

/** A real WebP sprite: transparent until its bytes are in, then a short fade; the SVG art only if the file errors. */
function ImageSprite({ id, face, speaking, src, exact }: CharacterSpriteProps & { src: string; exact: boolean }) {
  const { loaded, failed, imgProps } = useArtImage(src)
  if (failed) return <SvgSprite id={id} face={face} speaking={speaking} />
  return (
    <div className="char-breath relative flex h-full w-full items-end justify-center" style={{ transformOrigin: '50% 95%' }}>
      <img
        {...imgProps}
        src={src}
        alt=""
        draggable={false}
        className="art-fade h-full w-auto select-none object-contain drop-shadow-[0_14px_28px_rgba(10,14,34,0.52)]"
        style={{ filter: exact ? undefined : MOOD_FILTER[face], opacity: loaded ? 1 : 0 }}
      />
      {loaded && !exact && <ExpressionEmote face={face} />}
    </div>
  )
}

/**
 * PUBLIC ART INTERFACE.
 * Renders in a 600x1000 box (aspect 0.6). Uses /art/<id>/<face>.webp|png when listed in public/art/manifest.json.
 * While the manifest is still loading nothing is drawn (never the SVG art, which used to flash before the real one).
 */
export function CharacterSprite({ id, face, speaking }: CharacterSpriteProps) {
  const manifest = useArtManifest()
  const status = useArtManifestStatus()
  if (status === 'loading') return <div className="h-full w-full" />
  const resolved = resolveSpriteSrc(manifest, id, face)
  if (resolved) return <ImageSprite id={id} face={face} speaking={speaking} src={resolved.src} exact={resolved.exact} />
  return <SvgSprite id={id} face={face} speaking={speaking} />
}
