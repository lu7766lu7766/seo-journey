import type { CSSProperties } from 'react'

export type TapeColor = 'sakura' | 'sky' | 'mint' | 'cream'
export type TapePattern = 'solid' | 'stripe' | 'dots'

const TAPE_BG: Record<TapeColor, string> = {
  sakura: 'rgba(245, 168, 190, 0.78)',
  sky: 'rgba(142, 201, 235, 0.78)',
  mint: 'rgba(151, 223, 195, 0.80)',
  cream: 'rgba(235, 216, 174, 0.84)',
}

const PATTERN_IMAGE: Record<TapePattern, string> = {
  solid: 'linear-gradient(90deg, rgba(255,255,255,0.16) 0%, transparent 45%, rgba(255,255,255,0.1) 100%)',
  stripe:
    'repeating-linear-gradient(-45deg, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0.28) 4px, transparent 4px, transparent 9px)',
  dots: 'radial-gradient(circle, rgba(255,255,255,0.42) 1.5px, transparent 1.7px)',
}

export interface TapeProps {
  color?: TapeColor
  pattern?: TapePattern
  rotate?: number
  width?: number
  height?: number
  className?: string
  style?: CSSProperties
}

/** 半透明手撕鋸齒邊和紙膠帶（純裝飾用）。 */
export function Tape({
  color = 'sakura',
  pattern = 'solid',
  rotate = -3,
  width = 84,
  height = 22,
  className = '',
  style,
}: TapeProps) {
  return (
    <span
      aria-hidden="true"
      className={`mat-tape inline-block ${className}`}
      style={{
        width,
        height,
        backgroundColor: TAPE_BG[color],
        backgroundImage: PATTERN_IMAGE[pattern],
        backgroundSize: pattern === 'dots' ? '10px 10px' : undefined,
        transform: `rotate(${rotate}deg)`,
        borderTop: '1px solid rgba(255,255,255,0.4)',
        borderBottom: '1px solid rgba(110, 82, 52, 0.14)',
        ...style,
      }}
    />
  )
}
