import type { ReactNode } from 'react'

/** 呼應標題 Logo 的四芒星光小母題。 */
export function FourPointStar({
  size = 16,
  color = '#79d8f4',
  stroke,
  strokeWidth = 1.2,
  className = '',
}: {
  size?: number
  color?: string
  stroke?: string
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={`pointer-events-none shrink-0 ${className}`}>
      <path
        d="M12 1.5 L14.6 9.4 L22.5 12 L14.6 14.6 L12 22.5 L9.4 14.6 L1.5 12 L9.4 9.4 Z"
        fill={color}
        stroke={stroke}
        strokeWidth={stroke ? strokeWidth : undefined}
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 飄落／夾在便條旁的櫻花瓣小母題。 */
export function SakuraPetal({
  size = 18,
  rotate = 18,
  className = '',
}: {
  size?: number
  rotate?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`pointer-events-none shrink-0 ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path
        d="M12 2 C17 5 20 11 17.5 16.8 C15.8 20.5 13 21.5 12 21.5 C11 21.5 8.2 20.5 6.5 16.8 C4 11 7 5 12 2 Z"
        fill="#f9c3d3"
        stroke="#df89a4"
        strokeWidth="0.9"
      />
      <path d="M12 2 L10.7 4.7 L12 3.8 L13.3 4.7 Z" fill="#fff6f9" opacity="0.7" />
    </svg>
  )
}

/** 呼應 Logo 副標搜尋框的放大鏡細線分隔母題。 */
export function SearchRule({ className = '', tone = 'ink' }: { className?: string; tone?: 'ink' | 'gold' }) {
  const stroke = tone === 'gold' ? 'rgba(245, 222, 188, 0.5)' : 'rgba(130, 102, 72, 0.34)'
  const glass = tone === 'gold' ? 'rgba(245, 222, 188, 0.72)' : 'rgba(91, 82, 104, 0.65)'
  return (
    <div aria-hidden="true" className={`flex items-center gap-2 ${className}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={glass} strokeWidth="2.1" strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6.2" />
        <path d="M15.2 15.2 L20.5 20.5" />
      </svg>
      <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${stroke}, transparent)` }} />
    </div>
  )
}

/** 404 社辦門牌小銘牌。 */
export function RoomBadge({ label = '404', className = '' }: { label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[3px] border border-[#c7a169]/70 bg-[#2d1a0d]/85 px-2 py-0.5 font-sans text-[13px] font-bold tracking-wider text-[#f3dfb8] shadow-xs ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#d8b173]" />
      {label}
    </span>
  )
}

/** 釘在軟木板頂端的實木招牌（附左右黃銅釘頭）。 */
export function WoodPlaque({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mat-wood-plaque px-6 py-2.5 text-[#fff8eb] ${className}`}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#f3d89c] to-[#845b25] shadow-[0_1px_2px_rgba(12,6,2,0.75)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#f3d89c] to-[#845b25] shadow-[0_1px_2px_rgba(12,6,2,0.75)]"
      />
      <div className="border border-[#e9c894]/25 px-3 py-1">{children}</div>
    </div>
  )
}
