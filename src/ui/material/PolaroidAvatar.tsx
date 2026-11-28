import { useArtImage } from '@/art/hooks'
import { useArtManifest, useArtManifestStatus } from '@/art/manifest'
import { resolveSpriteSrc } from '@/art/resolve'
import { CHARACTERS, type CharId, type SpeakerId } from '@/content/characters'

/** 紙面上的文字強調色（避免亮橘/淡紫在米白紙上對比不足）。 */
export const PAPER_INK_ACCENT: Record<CharId, string> = {
  rin: '#1f3a6e',
  hare: '#b45309',
  mirai: '#5b4b99',
  sensei: '#7c5338',
  kuro: '#2d2d38',
}

/** 依說話者 ID 取得適合紙面閱讀的高對比墨色。 */
export function paperInkFor(id: SpeakerId): string {
  if (id in PAPER_INK_ACCENT) return PAPER_INK_ACCENT[id as CharId]
  if (id === 'me') return '#234d7a'
  return '#2c253b'
}

export type PolaroidSize = 'sm' | 'md' | 'lg'

const SIZE_CLS: Record<PolaroidSize, string> = {
  sm: 'h-[44px] w-[40px]',
  md: 'h-[58px] w-[50px]',
  lg: 'h-[68px] w-[60px]',
}

export interface PolaroidAvatarProps {
  id: CharId
  size?: PolaroidSize
  rotate?: number
  className?: string
}

/** 貼在紙面上的小型拍立得頭像，跟隨 manifest 與預載快取，不閃現 SVG。 */
export function PolaroidAvatar({ id, size = 'md', rotate = -2, className = '' }: PolaroidAvatarProps) {
  const manifest = useArtManifest()
  const status = useArtManifestStatus()
  const resolved = resolveSpriteSrc(manifest, id, 'normal')
  const { loaded, failed, imgProps } = useArtImage(resolved?.src ?? null)
  const c = CHARACTERS[id]

  return (
    <div
      className={`relative shrink-0 rounded-[2px] border border-[#d6c7ae] bg-[#fffdf8] p-[3px] pb-[6px] shadow-[0_2px_6px_rgba(38,18,6,0.2)] ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className={`relative overflow-hidden bg-gradient-to-b from-[#232b4f] to-[#121730] ${SIZE_CLS[size]}`}>
        {status !== 'loading' && resolved?.src && !failed ? (
          <img
            {...imgProps}
            src={resolved.src}
            alt={c.name ?? ''}
            draggable={false}
            className="art-fade h-full w-full select-none object-cover object-[50%_14%] scale-[1.34]"
            style={{ opacity: loaded ? 1 : 0 }}
          />
        ) : status !== 'loading' ? (
          <div
            className="flex h-full w-full items-center justify-center font-title text-[18px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${c.color}, ${c.accent})` }}
          >
            {(c.name ?? id).slice(0, 1)}
          </div>
        ) : null}
      </div>
      <span
        aria-hidden="true"
        className="mt-[3px] block h-[2.5px] w-full rounded-full"
        style={{ backgroundColor: c.color }}
      />
    </div>
  )
}
