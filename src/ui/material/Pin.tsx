import { useId } from 'react'

export type PinColor = 'red' | 'blue' | 'yellow' | 'mint' | 'sakura' | 'brass'

const PIN_PALETTE: Record<PinColor, { body: string; rim: string; sheen: string }> = {
  red: { body: '#c83b2e', rim: '#882018', sheen: '#ff9b8f' },
  blue: { body: '#366ea6', rim: '#1f456d', sheen: '#a8d5ff' },
  yellow: { body: '#d89b2b', rim: '#936211', sheen: '#ffe59c' },
  mint: { body: '#439c7d', rim: '#24624c', sheen: '#b6f2dc' },
  sakura: { body: '#de7899', rim: '#9a4160', sheen: '#ffd2e1' },
  brass: { body: '#b88946', rim: '#725020', sheen: '#f5dba9' },
}

export interface PinProps {
  color?: PinColor
  size?: number
  className?: string
}

/** 實體立體圖釘（含左上高光與右下方軟木投影，純裝飾用）。 */
export function Pin({ color = 'red', size = 24, className = '' }: PinProps) {
  const uid = useId().replace(/:/g, '')
  const pal = PIN_PALETTE[color]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-visible ${className}`}
    >
      <defs>
        <radialGradient id={`pin-${uid}`} cx="36%" cy="32%" r="68%">
          <stop offset="0%" stopColor={pal.sheen} />
          <stop offset="42%" stopColor={pal.body} />
          <stop offset="100%" stopColor={pal.rim} />
        </radialGradient>
      </defs>
      {/* 投射在紙面／軟木上的暖棕影子 */}
      <ellipse cx="18.5" cy="19.5" rx="8.8" ry="8.4" fill="rgba(34, 16, 4, 0.34)" />
      {/* 金屬針腳露出微小一段 */}
      <path d="M16 17 L19.5 23.5" stroke="#5b5552" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M16 17 L19.5 23.5" stroke="#d8d4cf" strokeWidth="0.7" strokeLinecap="round" />
      {/* 圓頂外緣與本體 */}
      <circle cx="15" cy="14" r="9.2" fill={pal.rim} />
      <circle cx="15" cy="13.2" r="8.6" fill={`url(#pin-${uid})`} />
      {/* 內凹圓環細節，呈現手作/日系文具感 */}
      <circle cx="15" cy="13.2" r="5.3" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.9" />
      {/* 左上柔和反光 */}
      <ellipse cx="12.2" cy="10.4" rx="2.7" ry="1.6" transform="rotate(-24 12.2 10.4)" fill="rgba(255,255,255,0.55)" />
    </svg>
  )
}
