import type { CSSProperties } from 'react'
import { motion } from 'motion/react'

export interface GaugeSegment {
  /** 0..100 的佔比寬度（接續在前一段之後） */
  value: number
  color: string
  /** 'pencil'（色鉛筆斜紋，預設）或 'highlighter'（螢光筆淡亮斜紋，用於預期增量） */
  pattern?: 'pencil' | 'highlighter'
}

export interface GaugeThreshold {
  /** 0..100 位置 */
  at: number
  color?: string
  /** true 時刻度上下更突出（如真結局 65% 或高風險 80%） */
  prominent?: boolean
}

export interface NotebookGaugeProps {
  /** 格子總數，預設 20（每格 5 分；10 格則每格 10 分） */
  cells?: number
  segments: GaugeSegment[]
  thresholds?: GaugeThreshold[]
  height?: number
  animate?: boolean
  className?: string
  title?: string
  'data-testid'?: string
}

interface PlacedSegment extends GaugeSegment {
  start: number
  end: number
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** 手帳方格逐格塗色進度條（色鉛筆／螢光筆筆觸＋門檻墨線刻度）。 */
export function NotebookGauge({
  cells = 20,
  segments,
  thresholds = [],
  height = 12,
  animate = false,
  className = '',
  title,
  'data-testid': testId,
}: NotebookGaugeProps) {
  const step = 100 / cells
  const placed: PlacedSegment[] = []
  let cursor = 0
  for (const seg of segments) {
    const val = Math.max(0, Math.min(100 - cursor, seg.value))
    if (val > 0) {
      placed.push({ ...seg, start: cursor, end: cursor + val })
      cursor += val
    }
  }

  const shouldAnimate = animate && !prefersReducedMotion()

  return (
    <div
      className={`relative flex w-full items-center gap-[2px] ${className}`}
      title={title}
      data-testid={testId}
    >
      {Array.from({ length: cells }, (_, i) => {
        const cellStart = i * step
        const cellEnd = (i + 1) * step

        const fills = placed
          .map((seg, sIdx) => {
            const ovStart = Math.max(cellStart, seg.start)
            const ovEnd = Math.min(cellEnd, seg.end)
            if (ovEnd <= ovStart) return null
            const leftPct = ((ovStart - cellStart) / step) * 100
            const widthPct = ((ovEnd - ovStart) / step) * 100
            const patCls = seg.pattern === 'highlighter' ? 'mat-highlighter-fill' : 'mat-pencil-fill'
            const style: CSSProperties = {
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              backgroundColor: seg.color,
              transformOrigin: 'left',
            }

            if (shouldAnimate) {
              return (
                <motion.span
                  key={sIdx}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.26, delay: 0.1 + i * 0.015 + sIdx * 0.04, ease: 'easeOut' }}
                  className={`absolute inset-y-0 block ${patCls}`}
                  style={style}
                />
              )
            }
            return <span key={sIdx} className={`absolute inset-y-0 block ${patCls}`} style={style} />
          })
          .filter(Boolean)

        return (
          <span
            key={i}
            className="relative flex-1 overflow-hidden rounded-[1.5px] border border-[#bfb095]/90 bg-[#f6eedb]/90"
            style={{ height }}
          >
            {fills}
          </span>
        )
      })}

      {thresholds.map((t, idx) => (
        <span
          key={idx}
          aria-hidden="true"
          className={`pointer-events-none absolute z-10 w-[2px] rounded-full ${
            t.prominent ? '-bottom-[4px] -top-[4px]' : '-bottom-[2px] -top-[2px]'
          }`}
          style={{
            left: `calc(${t.at}% - 1px)`,
            backgroundColor: t.color ?? '#6b5a45',
          }}
        >
          {t.prominent && (
            <span
              className="absolute -top-[3px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: t.color ?? '#c6382b' }}
            />
          )}
        </span>
      ))}
    </div>
  )
}
