import { useEffect, useState } from 'react'
import { animate, motion } from 'motion/react'
import type { Stats } from '@/engine/types'
import {
  METRIC_META,
  metricRatio,
  serpMock,
  siteMetrics,
  type MetricKey,
  type MetricMeta,
  type SiteMetrics,
} from '@/systems/siteMetrics'

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
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-1.5 text-[11px] font-bold leading-5 ${good ? 'bg-emerald-100 text-[#1f8a4c]' : 'bg-rose-100 text-[#d6334a]'}`}
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
  return (
    <div className={`rounded-xl bg-white/80 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-1.5'}`} data-testid={`metric-${meta.key}`} title={meta.hint}>
      <div className="truncate text-[11px] font-bold text-ink/70">{meta.label}</div>
      <div className="flex items-center gap-1">
        <span className={`font-title font-bold leading-tight ${compact ? 'text-xl' : 'text-2xl'} ${good ? 'text-[#1f6f8f]' : 'text-ink'}`}>
          <CountTo from={from} to={value} decimals={meta.key === 'lcp' ? 1 : 0} />
        </span>
        <span className="whitespace-nowrap text-[10px] font-bold text-ink/55">{meta.unit}</span>
        {prev && (
          <span className="ml-auto">
            <Delta meta={meta} from={from} to={value} />
          </span>
        )}
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
        <motion.div
          initial={{ width: `${Math.round(metricRatio(meta.key, prev ?? now) * 100)}%` }}
          animate={{ width: `${Math.round(ratio * 100)}%` }}
          transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[#9fd3f0] to-[#58c49b]"
        />
      </div>
    </div>
  )
}

/** a search-result card that visibly improves with the stats (purely illustrative) */
export function SerpPreview({ stats, compact = false }: { stats: Stats; compact?: boolean }) {
  const m = serpMock(stats)
  return (
    <div className={`rounded-xl bg-white shadow-sm ring-1 ring-ink/10 ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'}`} data-testid="serp-mock" data-tier={m.tier}>
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-ink/55">搜尋結果長這樣</span>
        <span className="rounded bg-ink/10 px-1.5 text-[10px] font-bold text-ink/60">示意</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-[#3f7f5b]">{m.url}</p>
        {m.aiChip && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ece6ff] px-2 text-[10px] font-bold leading-4 text-[#5a3fb0]" data-testid="serp-ai-chip">
            ✦ {m.aiChip}
          </span>
        )}
      </div>
      <p className={`line-clamp-2 font-bold leading-snug ${m.tier === 'bare' ? 'text-[#7a8696]' : 'text-[#1a56c4]'} ${compact ? 'text-sm' : 'text-sm'}`}>{m.title}</p>
      <p className={`text-ink/70 ${compact ? 'line-clamp-2 text-[11px] leading-snug' : 'line-clamp-2 text-xs leading-snug'}`}>{m.description}</p>
      {m.sitelinks.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 border-l-2 border-[#c8d8f5] pl-2 text-[11px] font-bold text-[#1a56c4]">
          {m.sitelinks.map((s) => (
            <li key={s} className="whitespace-nowrap">
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * 網站儀表板：由五項能力值換算的「示意數據」。`prevStats` 給了就顯示本週變化（綠色上升箭頭與跳動的數字）。
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
    <div className="flex flex-col gap-2" data-testid="site-dashboard">
      <div className="flex items-center justify-between">
        <h3 className={`font-title font-bold text-ink ${compact ? 'text-base' : 'text-lg'}`}>📊 網站儀表板</h3>
        <span className="rounded-full bg-sakura/45 px-2.5 py-0.5 text-[11px] font-bold text-ink" data-testid="dashboard-simulated">
          示意數據・非真實預測
        </span>
      </div>
      <div className={`grid gap-2 ${showSerp && !compact ? 'grid-cols-[1fr_330px]' : 'grid-cols-1'}`}>
        <div className="grid grid-cols-3 gap-2">
          {METRIC_META.map((meta, i) => (
            <MetricTile key={keys[i]} meta={meta} now={now} prev={prev} compact={compact} />
          ))}
        </div>
        {showSerp && <SerpPreview stats={stats} compact={compact} />}
      </div>
    </div>
  )
}
