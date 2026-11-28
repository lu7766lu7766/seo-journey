import { WEEK_THEMES } from '@/content/activities'
import { CHARACTERS } from '@/content/characters'
import { KNOWLEDGE_IDS } from '@/content/knowledge'
import { HEROINES, STAT_KEYS, type HeroineId, type StatKey } from '@/engine/types'
import { useGame } from '@/store/game'
import { useGlobal } from '@/store/global'
import { ENDINGS_META } from '@/systems/ending'
import { scores, TUNING, WEIGHTS } from '@/systems/score'
import { RULES } from '@/systems/schedule'
import {
  NotebookGauge,
  PAPER_INK_ACCENT,
  Paper,
  PolaroidAvatar,
  RoomBadge,
  SearchRule,
} from '@/ui/material'
import { SiteDashboard } from './SiteDashboard'

const STAT_LABEL: Record<StatKey, string> = {
  con: '內容力',
  tec: '技術力',
  str: '結構力',
  ans: '解答力',
  tru: '信任力',
}

const HEROINE_HINT: Record<HeroineId, { domain: string; focus: string }> = {
  rin: { domain: 'SEO', focus: '技術力・內容力' },
  hare: { domain: 'AEO', focus: '解答力・內容・結構' },
  mirai: { domain: 'GEO', focus: '信任力・內容力' },
}

export function RadarChart({ stats, compact = false }: { stats: Record<StatKey, number>; compact?: boolean }) {
  const cx = 148
  const cy = 128
  const maxR = 82
  const angles = STAT_KEYS.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5)
  const pt = (r: number, i: number) => [cx + Math.cos(angles[i]) * r, cy + Math.sin(angles[i]) * r]

  const poly = (ratio: number) =>
    STAT_KEYS.map((_, i) => pt(maxR * ratio, i).map((n) => n.toFixed(1)).join(',')).join(' ')

  const dataPoly = STAT_KEYS.map((k, i) => pt(maxR * (Math.max(5, stats[k]) / 100), i).map((n) => n.toFixed(1)).join(',')).join(' ')

  return (
    <svg
      viewBox="0 0 296 254"
      className={compact ? 'h-[152px] w-[178px]' : 'h-[164px] w-[192px]'}
      aria-label="網站屬性雷達圖"
    >
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={poly(r)} fill="none" stroke="rgba(47, 93, 140, 0.24)" strokeWidth="1.4" />
      ))}
      {STAT_KEYS.map((_, i) => {
        const [x, y] = pt(maxR, i)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(47, 93, 140, 0.24)" strokeWidth="1.4" />
      })}
      <polygon points={dataPoly} fill="rgba(142, 201, 235, 0.42)" stroke="#2f5d8c" strokeWidth="2.6" />
      {STAT_KEYS.map((k, i) => {
        const [x, y] = pt(maxR + 25, i)
        const [px, py] = pt(maxR * (Math.max(5, stats[k]) / 100), i)
        return (
          <g key={k}>
            <circle cx={px} cy={py} r="4.2" fill="#c6382b" stroke="#fffdf8" strokeWidth="1" />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#2c253b">
              {STAT_LABEL[k]} {stats[k]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function StatusSummary({ compact = false }: { compact?: boolean }) {
  const { week, stats, bond, stamina, stress, playerName } = useGame()
  const sc = scores(stats, bond)
  const theme = WEEK_THEMES[week]

  return (
    <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-2'}`}>
      {/* 頁首週次與主題 */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {!compact && <RoomBadge label="404 社員手冊" />}
            <span className={`font-title font-bold text-ink-body ${compact ? 'text-[17px]' : 'text-[19px]'}`}>
              {compact
                ? `${week === 0 ? '序章' : week >= 7 ? '期末搜尋祭' : `第 ${week} 週`}${theme ? ` · ${theme.title}` : ''}`
                : `${playerName} · ${week === 0 ? '序章' : week >= 7 ? '期末搜尋祭' : `第 ${week} 週`}`}
            </span>
          </div>
          {theme && (
            <span className="shrink-0 border border-[#c6382b]/75 px-2 py-0 font-title text-[13px] font-bold leading-snug text-[#98251c]">
              主題：{theme.topic}
            </span>
          )}
        </div>
        <SearchRule className="mt-1" />
      </div>

      {/* 雷達圖 + 五項能力值方格刻度 */}
      <div className={`grid items-center gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-[202px_1fr]'}`}>
        <Paper
          tone="white"
          rule="grid"
          curled={false}
          className="flex justify-center p-1"
        >
          <RadarChart stats={stats} compact={compact} />
        </Paper>

        <div className="space-y-1 rounded-[2px] border border-[#c7b699] bg-[#fffdf7]/60 px-3 py-1.5">
          {STAT_KEYS.map((k) => (
            <div key={k} className="flex items-center gap-2 text-[14px]">
              <span className="w-[46px] shrink-0 font-bold text-ink-body">{STAT_LABEL[k]}</span>
              <NotebookGauge
                cells={10}
                height={10}
                className="flex-1"
                segments={[{ value: stats[k], color: '#2f5d8c', pattern: 'pencil' }]}
              />
              <span className="w-[28px] shrink-0 text-right font-sans font-bold text-ink-body">{stats[k]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 體力與壓力：手繪方格計量尺 + 門檻刻度 */}
      <div className="grid grid-cols-2 gap-3 border-y border-[#c7b699]/85 bg-[#fffdf7]/55 px-3 py-1.5">
        <div>
          <div className="mb-1 flex items-baseline justify-between text-[14px] font-bold">
            <span className="text-ink-body">體力</span>
            <span className={stamina < 20 ? 'text-[var(--color-stamp)]' : 'text-[#205e42]'}>{stamina} / 100</span>
          </div>
          <NotebookGauge
            cells={10}
            height={10}
            segments={[{ value: stamina, color: stamina < 20 ? '#c6382b' : '#2f825e', pattern: 'pencil' }]}
            thresholds={[
              { at: 20, color: '#c6382b', prominent: true },
              { at: 50, color: '#8c7758' },
            ]}
          />
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-1 text-[14px] font-bold">
            <span className="flex items-center gap-1 text-ink-body">
              <span>壓力</span>
              {stress >= RULES.tenseAt && (
                <span
                  className={`font-title text-[13px] font-bold ${
                    stress >= RULES.failAt ? 'text-[var(--color-stamp)]' : 'text-[#9e4f0c]'
                  }`}
                  data-testid="stress-tier"
                >
                  〔{stress >= RULES.failAt ? '失誤風險' : '焦躁 ×' + RULES.tenseMul}〕
                </span>
              )}
            </span>
            <span
              className={
                stress >= RULES.failAt
                  ? 'text-[var(--color-stamp)]'
                  : stress >= RULES.tenseAt
                    ? 'text-[#9e4f0c]'
                    : 'text-ink-body'
              }
            >
              {stress} / 100
            </span>
          </div>
          <NotebookGauge
            cells={10}
            height={10}
            segments={[{ value: stress, color: stress >= RULES.failAt ? '#c6382b' : '#c96b38', pattern: 'pencil' }]}
            thresholds={[
              { at: 60, color: '#b45309' },
              { at: 80, color: '#c6382b', prominent: true },
            ]}
          />
        </div>
      </div>

      {/* 三位女主角好感度名冊（拍立得 + 手寫心數 + 雙色鉛筆條） */}
      <div className="divide-y divide-dashed divide-[#cab799] border border-[#b8a487] bg-[#fffdf7]/65">
        {HEROINES.map((h, idx) => {
          const c = CHARACTERS[h]
          const val = Math.round(sc[h])
          const weighted = STAT_KEYS.reduce((acc, k) => acc + WEIGHTS[h][k] * stats[k], 0) * TUNING.statScale
          const sitePart = Math.round(weighted)
          const bondPart = Math.round(bond[h] * TUNING.bondScale)
          const siteBar = Math.min(val, Math.max(0, sitePart))
          const bondBar = Math.max(0, val - siteBar)
          const hint = HEROINE_HINT[h]
          const siteColor = `color-mix(in srgb, ${c.color} 46%, #f8f2e4)`

          return (
            <div key={h} className="flex items-center gap-3 px-3 py-1">
              {!compact && <PolaroidAvatar id={h} size="sm" rotate={idx === 1 ? 1.5 : -1.5} />}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-title text-[16.5px] font-bold" style={{ color: PAPER_INK_ACCENT[h] }}>
                      {c.name}
                    </span>
                    <span
                      className="border border-current/70 px-1.5 py-0 font-title text-[13px] font-bold leading-snug"
                      style={{ color: PAPER_INK_ACCENT[h] }}
                    >
                      {hint.domain}
                    </span>
                  </div>
                  <span className="font-title text-[17.5px] font-bold leading-none text-ink-body">
                    <span className="text-[var(--color-stamp)]">♥</span> {val}
                  </span>
                </div>

                <NotebookGauge
                  cells={20}
                  height={8}
                  segments={[
                    { value: siteBar, color: siteColor, pattern: 'pencil' },
                    ...(bondBar > 0 ? [{ value: bondBar, color: c.color, pattern: 'pencil' as const }] : []),
                  ]}
                  thresholds={[
                    { at: 35, color: '#6b5a45' },
                    { at: 60, color: '#6b5a45' },
                    { at: 65, color: '#c6382b', prominent: true },
                  ]}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 font-sans text-[13px] font-semibold text-ink-muted">
                  <span>
                    網站 {sitePart} {bondPart >= 0 ? `＋ 互動 ${bondPart}` : `－ 互動 ${Math.abs(bondPart)}`}/{TUNING.bondMax}
                  </span>
                  <span>在意：{hint.focus}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!compact && (
        <p className="text-right font-sans text-[13px] font-semibold text-ink-muted">
          目標：存續平均 ≥ 35 ｜ 約會第 3 階 ≥ 55 ｜ 個人結局 ≥ 60 ｜ 真結局全 ≥ 65
        </p>
      )}
    </div>
  )
}

export function StatusPanel({ onClose }: { onClose: () => void }) {
  const { stats, week, unlockedCards } = useGame()
  const globalCards = useGlobal((s) => s.cards)
  const globalEndings = useGlobal((s) => s.endings)
  const cardPct = Math.round((unlockedCards.length / KNOWLEDGE_IDS.length) * 100)

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#120c14]/60 px-6 pb-3 pt-14"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="mat-handbook-cover flex h-[636px] w-[1160px] p-[10px]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="社團狀態"
      >
        {/* 左頁：社員手冊基本資料、雷達圖、體壓尺與女主角好感名冊 */}
        <Paper
          tone="cream"
          rule="lined"
          curled={false}
          className="flex min-h-0 w-[586px] shrink-0 flex-col justify-between overflow-hidden rounded-r-none border-r-0 px-5 py-2.5"
        >
          <StatusSummary />
        </Paper>

        {/* 手冊中縫裝訂紋理 */}
        <div aria-hidden="true" className="mat-notebook-spine w-[16px] shrink-0" />

        {/* 右頁：知識卡收集進度與網站檢核報表 */}
        <Paper
          tone="warm"
          rule="lined"
          curled={false}
          className="flex min-h-0 flex-1 flex-col gap-2.5 rounded-l-none border-l-0 px-5 py-3"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-dashed border-[#c7b699] pb-2">
            <h2 className="font-title text-[20px] font-bold text-ink-body">收藏進度與網站檢核</h2>
            <button
              type="button"
              className="mat-washi-btn px-3.5 py-1 font-title text-[15px] font-bold"
              onClick={onClose}
              aria-label="關閉"
            >
              ✕ 關閉
            </button>
          </div>

          <div className="shrink-0 space-y-1.5 rounded-[2px] border border-[#cab799] bg-[#fffdf7]/65 px-3.5 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-title text-[16px] font-bold text-ink-body">
                知識卡收集進度
                <span className="ml-2 font-sans text-[14.5px] font-bold text-[#1f3a6e]">
                  本輪 {unlockedCards.length} / {KNOWLEDGE_IDS.length} 張
                </span>
              </span>
              <span className="font-sans text-[13px] font-semibold text-ink-muted">
                全存檔圖鑑 {globalCards.length} / {KNOWLEDGE_IDS.length} ｜ 已達結局 {globalEndings.length} /{' '}
                {ENDINGS_META.length}
              </span>
            </div>
            <NotebookGauge
              cells={19}
              height={10}
              segments={[{ value: cardPct, color: '#2d7355', pattern: 'pencil' }]}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 pt-1">
            <SiteDashboard stats={stats} week={week} compact />
          </div>
        </Paper>
      </div>
    </div>
  )
}
