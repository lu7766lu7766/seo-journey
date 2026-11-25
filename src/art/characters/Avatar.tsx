import { CHARACTERS, type CharId } from '@/content/characters'
import { useArtManifest } from '../manifest'

export interface CharacterAvatarProps {
  id: CharId
  size?: number
  className?: string
}

/** Framed circular portrait avatar cropped to the character's anime face & hair. */
export function CharacterAvatar({ id, size = 56, className = '' }: CharacterAvatarProps) {
  const manifest = useArtManifest()
  const raw = manifest[`${id}/normal`]
  const src = typeof raw === 'string' ? raw : raw ? `/art/${id}/normal.png` : null
  const c = CHARACTERS[id]
  const label = (c.name ?? id).slice(0, 1)

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-[#232b4f] to-[#121730] shadow-md ${className}`}
      style={{
        width: size,
        height: size,
        border: `2.5px solid ${c.color}`,
        boxShadow: `0 4px 14px ${c.color}38, inset 0 0 0 1.5px rgba(255,255,255,0.65)`,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={c.name ?? ''}
          draggable={false}
          className="h-full w-full select-none object-cover object-[50%_14%] scale-[1.32]"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-title text-xl font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${c.color}, ${c.accent})` }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
