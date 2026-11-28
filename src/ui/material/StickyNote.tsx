import type { CSSProperties, HTMLAttributes } from 'react'
import { Pin, type PinColor } from './Pin'
import { Tape, type TapeColor } from './Tape'

export type StickyColor = 'yellow' | 'pink' | 'mint' | 'sky'

const STICKY_BG: Record<StickyColor, string> = {
  yellow: 'linear-gradient(175deg, #fff5bc 0%, var(--color-note-yellow) 65%, #f5e289 100%)',
  pink: 'linear-gradient(175deg, #ffe6ee 0%, var(--color-note-pink) 65%, #f4c6d5 100%)',
  mint: 'linear-gradient(175deg, #e2f8ec 0%, var(--color-note-mint) 65%, #bde6d0 100%)',
  sky: 'linear-gradient(175deg, #e5f3fe 0%, var(--color-note-sky) 65%, #c1e0f7 100%)',
}

export interface StickyNoteProps extends HTMLAttributes<HTMLDivElement> {
  color?: StickyColor
  rotate?: number
  attach?: 'none' | 'pin' | 'tape'
  pinColor?: PinColor
  tapeColor?: TapeColor
}

/** 社辦便利貼：帶頂部背膠感、微翹右下投影與選配圖釘／和紙膠帶。 */
export function StickyNote({
  color = 'yellow',
  rotate = 1.5,
  attach = 'none',
  pinColor = 'red',
  tapeColor = 'sky',
  className = '',
  style,
  children,
  ...rest
}: StickyNoteProps) {
  return (
    <div
      className={`mat-sticky font-title text-ink-body ${className}`}
      style={
        {
          '--mat-rot': `${rotate}deg`,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      <span aria-hidden="true" className="mat-sticky-bg" style={{ backgroundImage: STICKY_BG[color] }} />
      {attach === 'pin' && (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 z-20 -translate-x-1/2">
          <Pin color={pinColor} size={22} />
        </span>
      )}
      {attach === 'tape' && (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 z-20 -translate-x-1/2">
          <Tape color={tapeColor} width={68} height={18} rotate={-2} />
        </span>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
