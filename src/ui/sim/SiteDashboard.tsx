import { useEffect, useState, type CSSProperties } from 'react'
import { animate, motion } from 'motion/react'
import type { StatKey, Stats } from '@/engine/types'
import {
  METRIC_META,
  metricRatio,
  serpMock,
  siteMetrics,
  type MetricKey,
  type MetricMeta,
  type SiteMetrics,
} from '@/systems/siteMetrics'
import { NotebookGauge, Paper, Tape } from '@/ui/material'

const DRIVER_SHORT: Record<StatKey, string> = {
  con: '內容',
  tec: '技術',
  str: '結構',
  ans: '解答',
  tru: '信任',
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** counts up (or down) from `from` to `to`; renders the final value immediately when there is nothing to animate */
function CountTo({ from, to, decimals = 0 }: { from: number; to: number; decimals?: number }) {
  const [v, setV] = useState(from === to || reduceMotion() ? to : from)
  useEffect(() => {
    if (from === to || reduceMotion()) {
      setV(to)
      return
    }
    const c = animate(from, to, { duration: 0.9, delay: 0.25, ease: 'easeOut', onUpdate: (x) => setV(x) })
    return () => c.stop()
  }, [from, to])
  return <>{decimals ? v.toFixed(decimals) : Math.round(v)}</>
}

function Delta({ meta, from, to }: { meta: MetricMeta; from: number; to: number }) {
  const d = to - from
  const eps = meta.key === 'lcp' ? 0.05 : 0.5
  if (Math.abs(d) < eps) return null
  const good = meta.lowerIsBetter ? d < 0 : d > 0
  const shown = meta.key === 'lcp' ? Math.abs(d).toFixed(1) : String(Math.abs(Math.round(d)))
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 18 }}
      className={`inline-flex shrink-0 items-center whitespace-nowrap font-title text-[14.5px] font-bold leading-none ${
        good ? 'text-[#1e6645]' : 'text-[var(--color-stamp)]'
      }`}
      data-testid={`delta-${meta.key}`}
    >
      {d > 0 ? '▲' : '▼'} {shown}
    </motion.span>
  )
}

function MetricTile({ meta, now, prev, compact }: { meta: MetricMeta; now: SiteMetrics; prev?: SiteMetrics; compact: boolean }) {
  const value = now[meta.key]
  const from = prev ? prev[meta.key] : value
  const ratio = metricRatio(meta.key, now)
  const good = meta.key === 'lcp' ? value <= 2.5 : ratio >= 0.55
  const driversText = meta.drivers.map((d) => DRIVER_SHORT[d]).join('·')

  return (
    <div
      className={`rounded-[1px] border border-[#c6b59a]/90 bg-[#fffdf7]/65 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}
      data-testid={`metric-${meta.key}`}
      title={meta.hint}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-sans text-[13.5px] font-bold text-ink-body">{meta.label}</span>
        <span className="shrink-0 border border-[#8f7b60]/65 bg-transparent px-1.5 py-0 font-title text-[13px] font-bold leading-[1.3] text-[#60513e]">
          {driversText}
        </span>
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`font-title font-bold leading-none ${compact ? 'text-[22px]' : 'text-[24px]'} ${
            good ? 'text-[#1f5f7a]' : 'text-ink-body'
          }`}
        >
          <CountTo from={from} to={value} decimals={meta.key === 'lcp' ? 1 : 0} />
        </span>
        <span className="whitespace-nowrap font-sans text-[13px] font-bold text-ink-muted">{meta.unit}</span>
        {prev && (
          <span className="ml-auto">
            <Delta meta={meta} from={from} to={value} />
          </span>
        )}
      </div>

      <NotebookGauge
        cells={10}
        height={7}
        animate
        className="mt-1.5"
        segments={[
          {
            value: Math.round(ratio * 100),
            color: good ? '#2d7355' : '#2f5d8c',
            pattern: 'pencil',
          },
        ]}
      />
      {!compact && <p className="mt-1 text-[13px] leading-snug text-ink-muted">{meta.hint}</p>}
    </div>
  )
}

/** 貼在報告下方的復古瀏覽器列印剪報卡（純示意）。 */
export function SerpPreview({ stats, compact = false }: { stats: Stats; compact?: boolean }) {
  const m = serpMock(stats)
  return (
    <div
      className="overflow-hidden rounded-[2px] border border-[#c7b69b] bg-[#fffdf9] shadow-[0_2px_6px_rgba(38,18,6,0.1)]"
      data-testid="serp-mock"
      data-tier={m.tier}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#dfd3be] bg-[#f1e7d4] px-3 py-1">
        <span className="font-sans text-[13px] font-bold text-ink-body">搜尋結果長這樣</span>
        <span className="font-title text-[13px] font-semibold leading-none text-ink-muted">
          〔列印示意〕
        </span>
      </div>

      <div className={compact ? 'px-3 py-2' : 'px-3.5 py-2.5'}>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-sans text-[13px] font-semibold text-[#256341]">{m.url}</p>
          {m.aiChip && (
            <span
              className="inline-flex shrink-0 items-center gap-1 border border-[#5b4b99]/75 bg-transparent px-1.5 py-0 font-title text-[13px] font-bold leading-[1.3] text-[#4d398e]"
              data-testid="serp-ai-chip"
            >
              ✦ {m.aiChip}
            </span>
          )}
        </div>
        <p
          className={`mt-0.5 line-clamp-2 font-sans text-[15px] font-bold leading-snug ${
            m.tier === 'bare' ? 'text-[#5b6575]' : 'text-[#1a56c4]'
          }`}
        >
          {m.title}
        </p>
        <p className="mt-0.5 line-clamp-2 font-sans text-[13.5px] leading-[1.38] text-ink-muted">{m.description}</p>
        {m.sitelinks.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-dashed border-[#d4c6ae] pt-1 font-sans text-[13px] font-bold text-[#1a56c4]">
            {m.sitelinks.map((s, sIdx) => (
              <li key={s} className="inline-flex items-center whitespace-nowrap">
                {sIdx > 0 && (
                  <span aria-hidden="true" className="mr-2 text-[#8c7a62]">
                    ·
                  </span>
                )}
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * 網站儀表板：由五項能力值換算的「示意數據」方格紙列印報表。
 */
export function SiteDashboard({
  stats,
  week,
  prevStats,
  compact = false,
  showSerp = true,
}: {
  stats: Stats
  week: number
  prevStats?: Stats | null
  compact?: boolean
  showSerp?: boolean
}) {
  const now = siteMetrics(stats, week)
  const prev = prevStats ? siteMetrics(prevStats, Math.max(0, week - 1)) : undefined
  const keys = METRIC_META.map((m) => m.key as MetricKey)

  return (
    <Paper
      tone="white"
      rule="grid"
      curled={false}
      className={`relative flex flex-col gap-2.5 ${compact ? 'p-3.5 pt-4' : 'p-4'}`}
      data-testid="site-dashboard"
    >
      {compact && (
        <>
          <Tape color="sky" pattern="stripe" rotate={-8} width={58} height={15} className="absolute -top-2 left-6 z-20" />
          <Tape color="mint" pattern="solid" rotate={7} width={58} height={15} className="absolute -top-2 right-6 z-20" />
        </>
      )}

      <div className="flex items-center justify-between gap-2">
        <h3 className={`font-title font-bold text-ink-body ${compact ? 'text-[18px]' : 'text-[20px]'}`}>
          網站數據檢核表
        </h3>
        <span
          className="mat-stamp border border-[var(--color-stamp)]/75 bg-transparent px-2 py-0.5 font-title text-[13px] font-bold text-[var(--color-stamp)]"
          style={{ '--mat-rot': '-1.5deg' } as CSSProperties}
          data-testid="dashboard-simulated"
        >
          示意數據・非真實預測
        </span>
      </div>

      <div className={`grid gap-2.5 ${showSerp && !compact ? 'grid-cols-[1fr_330px]' : 'grid-cols-1'}`}>
        <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {METRIC_META.map((meta, i) => (
            <MetricTile key={keys[i]} meta={meta} now={now} prev={prev} compact={compact} />
          ))}
        </div>
        {showSerp && <SerpPreview stats={stats} compact={compact} />}
      </div>
    </Paper>
  )
}
