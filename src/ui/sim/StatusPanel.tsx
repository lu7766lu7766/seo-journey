import { WEEK_THEMES } from '@/content/activities'
import { CHARACTERS } from '@/content/characters'
import { HEROINES, STAT_KEYS, type HeroineId, type StatKey } from '@/engine/types'
import { useGame } from '@/store/game'
import { scores, TUNING, WEIGHTS } from '@/systems/score'
import { RULES } from '@/systems/schedule'
import { Panel } from '../Panel'
import { SiteDashboard } from './SiteDashboard'

const STAT_LABEL: Record<StatKey, string> = {
  con: '內容力',
  tec: '技術力',
  str: '結構力',
  ans: '可答力',
  tru: '信任力',
}

const HEROINE_HINT: Record<HeroineId, { domain: string; focus: string }> = {
  rin: { domain: 'SEO', focus: '技術力・內容力' },
  hare: { domain: 'AEO', focus: '可答力・內容・結構' },
  mirai: { domain: 'GEO', focus: '信任力・內容力' },
}

export function RadarChart({ stats, compact = false }: { stats: Record<StatKey, number>; compact?: boolean }) {
  const cx = 135
  const cy = 130
  const maxR = 88
  const angles = STAT_KEYS.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5)
  const pt = (r: number, i: number) => [cx + Math.cos(angles[i]) * r, cy + Math.sin(angles[i]) * r]

  const poly = (ratio: number) =>
    STAT_KEYS.map((_, i) => pt(maxR * ratio, i).map((n) => n.toFixed(1)).join(',')).join(' ')

  const dataPoly = STAT_KEYS.map((k, i) => pt(maxR * (Math.max(5, stats[k]) / 100), i).map((n) => n.toFixed(1)).join(',')).join(' ')

  return (
    <svg viewBox="0 0 270 260" className={compact ? 'h-[154px] w-[178px]' : 'h-[230px] w-[240px]'} aria-label="網站屬性雷達圖">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={poly(r)} fill="none" stroke="rgba(59,53,80,0.18)" strokeWidth="1.5" />
      ))}
      {STAT_KEYS.map((_, i) => {
        const [x, y] = pt(maxR, i)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(59,53,80,0.18)" strokeWidth="1.5" />
      })}
      <polygon points={dataPoly} fill="rgba(159, 211, 240, 0.45)" stroke="#3d7ab8" strokeWidth="2.8" />
      {STAT_KEYS.map((k, i) => {
        const [x, y] = pt(maxR + 22, i)
        const [px, py] = pt(maxR * (Math.max(5, stats[k]) / 100), i)
        return (
          <g key={k}>
            <circle cx={px} cy={py} r="4" fill="#d6334a" />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#2b233d">
              {STAT_LABEL[k]} {stats[k]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function StatusSummary({ compact = false }: { compact?: boolean }) {
  const { week, stats, bond, stamina, stress } = useGame()
  const sc = scores(stats, bond)
  const theme = WEEK_THEMES[week]

  return (
    <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
      <div className={`flex items-center justify-between rounded-2xl bg-white/70 ${compact ? 'px-3.5 py-1.5' : 'px-4 py-2'}`}>
        <span className={`font-title font-bold ${compact ? 'text-base' : 'text-lg'}`}>
          {week === 0 ? '序章' : week >= 7 ? '期末搜尋祭' : `第 ${week} 週`}
          {theme ? ` · ${theme.title}` : ''}
        </span>
        {theme && <span className="rounded-full bg-sakura/40 px-2.5 py-0.5 text-xs font-bold">主題：{theme.topic}</span>}
      </div>

      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-[240px_1fr] gap-4'} items-center`}>
        <div className={`flex justify-center rounded-2xl bg-white/65 ${compact ? 'py-0.5' : 'p-2'}`}>
          <RadarChart stats={stats} compact={compact} />
        </div>
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {/* Stamina & Stress */}
          <div className={`rounded-2xl bg-white/65 ${compact ? 'grid grid-cols-2 gap-2.5 p-2.5' : 'space-y-2 p-3'}`}>
            <div>
              <div className="mb-1 flex justify-between text-xs font-bold">
                <span>體力</span>
                <span className={stamina < 20 ? 'text-[#d6334a]' : ''}>{stamina} / 100</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#58c49b] to-[#8ee3be]" style={{ width: `${stamina}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-bold">
                <span>
                  壓力
                  {stress >= RULES.tenseAt && (
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-px text-[10px] ${stress >= RULES.failAt ? 'bg-rose-100 text-[#d6334a]' : 'bg-amber-200 text-amber-900'}`}
                      data-testid="stress-tier"
                    >
                      {stress >= RULES.failAt ? '失誤風險' : '焦躁 ×' + RULES.tenseMul}
                    </span>
                  )}
                </span>
                <span className={stress >= RULES.failAt ? 'text-[#d6334a]' : stress >= RULES.tenseAt ? 'text-amber-800' : ''}>{stress} / 100</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#f7b267] to-[#e05263]" style={{ width: `${stress}%` }} />
              </div>
            </div>
          </div>

          {/* Heroines */}
          <div className={`rounded-2xl bg-white/65 ${compact ? 'space-y-1.5 p-2.5' : 'space-y-2 p-3'}`}>
            {HEROINES.map((h) => {
              const c = CHARACTERS[h]
              const val = Math.round(sc[h])
              const weighted = STAT_KEYS.reduce((acc, k) => acc + WEIGHTS[h][k] * stats[k], 0) * TUNING.statScale
              const sitePart = Math.round(weighted)
              const bondPart = Math.round(bond[h] * TUNING.bondScale)
              const hint = HEROINE_HINT[h]
              return (
                <div key={h} className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold" style={{ color: c.color }}>
                      {c.name}（{hint.domain} ♥ {val}）
                    </span>
                    <span className="text-[11px] text-ink/70">
                      網站 {sitePart} + 互動 {bondPart}/{TUNING.bondMax} · 在意：{hint.focus}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: c.color }} />
                  </div>
                </div>
              )
            })}
            {!compact && (
              <p className="pt-1 text-right text-[11px] text-ink/65">
                目標：存續平均 ≥ 35 ｜ 約會第 3 階 ≥ 55 ｜ 個人結局 ≥ 60 ｜ 真結局全 ≥ 65
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function StatusPanel({ onClose }: { onClose: () => void }) {
  const { stats, week } = useGame()
  return (
    <Panel title="社團狀態" onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        <StatusSummary />
        <SiteDashboard stats={stats} week={week} />
      </div>
    </Panel>
  )
}
