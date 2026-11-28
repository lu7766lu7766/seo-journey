import type { CSSProperties } from 'react'

export type StampColor = 'vermilion' | 'navy' | 'forest'
export type StampShape = 'rect' | 'circle' | 'oval'
export type StampSize = 'sm' | 'md' | 'lg'

const STAMP_COLORS: Record<StampColor, string> = {
  vermilion: 'text-[var(--color-stamp)] border-[var(--color-stamp)]',
  navy: 'text-[var(--color-stamp-blue)] border-[var(--color-stamp-blue)]',
  forest: 'text-[var(--color-stamp-green)] border-[var(--color-stamp-green)]',
}

const STAMP_SIZES: Record<StampSize, { outer: string; inner: string; label: string; sub: string }> = {
  sm: { outer: 'p-[2.5px] border-2', inner: 'border px-2 py-0.5', label: 'text-[13px]', sub: 'text-[13px]' },
  md: { outer: 'p-[3px] border-2', inner: 'border px-3 py-1', label: 'text-[15px]', sub: 'text-[13px]' },
  lg: { outer: 'p-[3px] border-[2.5px]', inner: 'border-[1.5px] px-4 py-1.5', label: 'text-[18px]', sub: 'text-[14px]' },
}

export interface StampProps {
  label: string
  sublabel?: string
  color?: StampColor
  shape?: StampShape
  rotate?: number
  size?: StampSize
  className?: string
}

/** 朱紅／藍／綠雙線框實體印章，帶微斑駁印泥質感。 */
export function Stamp({
  label,
  sublabel,
  color = 'vermilion',
  shape = 'rect',
  rotate = -8,
  size = 'md',
  className = '',
}: StampProps) {
  const col = STAMP_COLORS[color]
  const sz = STAMP_SIZES[size]
  const shapeCls =
    shape === 'circle'
      ? 'rounded-full aspect-square min-w-[68px]'
      : shape === 'oval'
        ? 'rounded-[999px]'
        : 'rounded-[3px]'
  const innerShapeCls = shape === 'circle' ? 'rounded-full h-full w-full justify-center' : shape === 'oval' ? 'rounded-[999px]' : 'rounded-[1px]'

  return (
    <span
      className={`mat-stamp ${col} ${sz.outer} ${shapeCls} bg-transparent ${className}`}
      style={{ '--mat-rot': `${rotate}deg` } as CSSProperties}
    >
      <span className={`flex flex-col items-center justify-center border-current ${sz.inner} ${innerShapeCls}`}>
        <span className={`${sz.label} whitespace-nowrap font-bold`}>{label}</span>
        {sublabel && <span className={`mt-0.5 whitespace-nowrap font-bold opacity-85 ${sz.sub}`}>{sublabel}</span>}
      </span>
    </span>
  )
}
