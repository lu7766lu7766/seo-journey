import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Background } from '@/art/backgrounds'
import { audio } from '@/audio'
import { CHARACTERS } from '@/content/characters'
import { WEEKLY_COMMENTS } from '@/content/flavor'
import { HEROINES, type HeroineId } from '@/engine/types'
import { useGame } from '@/store/game'
import { scoreParts } from '@/systems/score'
import { readStatSnapshot } from '@/systems/siteMetrics'
import {
  FourPointStar,
  PAPER_INK_ACCENT,
  Paper,
  PolaroidAvatar,
  RoomBadge,
  SearchRule,
  Stamp,
  type StampColor,
  type StampShape,
} from '@/ui/material'
import { SiteDashboard } from './SiteDashboard'

function tierFor(v: number): 'low' | 'mid' | 'high' {
  if (v < 40) return 'low'
  if (v < 65) return 'mid'
  return 'high'
}

const TIER_STAMP: Record<'low' | 'mid' | 'high', { label: string; color: StampColor; shape: StampShape }> = {
  low: { label: '初識階段', color: 'navy', shape: 'rect' },
  mid: { label: '漸入佳境', color: 'forest', shape: 'rect' },
  high: { label: '深度信賴', color: 'vermilion', shape: 'oval' },
}

export function WeeklyReport() {
  const s = useGame()
  const weekStart = readStatSnapshot(s.flags)

  useEffect(() => {
    audio.sfx('bond')
  }, [])

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 pb-3 pt-14"
      data-testid="weekly-report"
    >
      <Background id="council" time="dusk" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#171122]/38 via-[#231718]/20 to-[#120d10]/42 backdrop-blur-[1.5px]"
      />

      {/* 金屬板夾週報成績單 */}
      <div className="relative z-10 flex h-[636px] w-[1216px] flex-col pt-3">
        {/* 頂部拉絲金屬夾頭 */}
        <div
          aria-hidden="true"
          className="mat-clipboard-clip pointer-events-none absolute left-1/2 top-0 z-30 flex h-[30px] w-[228px] -translate-x-1/2 items-center justify-between px-4"
        >
          <span className="h-2.5 w-2.5 rounded-full border border-[#56606d] bg-gradient-to-br from-[#f8fafc] to-[#7d8794] shadow-inner" />
          <span className="flex h-3.5 w-14 items-center justify-center rounded-full border border-[#616b78] bg-[#464e58]/80 shadow-inner">
            <span className="h-1.5 w-8 rounded-full bg-[#2b3038]" />
          </span>
          <span className="h-2.5 w-2.5 rounded-full border border-[#56606d] bg-gradient-to-br from-[#f8fafc] to-[#7d8794] shadow-inner" />
        </div>

        <div className="mat-clipboard-board flex min-h-0 flex-1 p-3.5 pt-4">
          <Paper
            tone="cream"
            rule="lined"
            curled={false}
            className="flex h-full w-full flex-col justify-between px-6 pb-3.5 pt-4"
          >
            {/* 成績單標頭 */}
            <div>
              <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <RoomBadge label="404" />
                  <h2 className="font-title text-[25px] font-bold leading-tight text-ink-body">
                    第 {s.week} 週 · 週日社團評測成績單
                  </h2>
                </div>
                <p className="font-sans text-[13.5px] font-bold text-ink-muted">
                  搜尋祭門檻：存續平均 35 ｜ 個人結局 60 ｜ 真結局全 65
                </p>
              </div>
              <SearchRule className="my-2" />
            </div>

            {/* 左側三位夥伴評測卡 + 右側網站數據列印表 */}
            <div className="grid min-h-0 flex-1 grid-cols-[1fr_458px] items-stretch gap-5">
              <div className="flex min-h-0 flex-col justify-between gap-2.5">
                {HEROINES.map((h: HeroineId, idx) => {
                  const c = CHARACTERS[h]
                  const prev = Math.round(s.prevScores[h] ?? 10)
                  const parts = scoreParts(h, s.stats, s.bond)
                  const now = Math.round(parts.total)
                  const site = Math.round(parts.site)
                  const bond = Math.round(parts.bond)
                  const siteBar = Math.min(now, Math.max(0, site))
                  const bondBar = Math.max(0, now - siteBar)
                  const diff = now - prev
                  const tier = tierFor(now)
                  const stampMeta = TIER_STAMP[tier]
                  const comments = WEEKLY_COMMENTS[h][tier]
                  const line = comments[(s.week + idx) % comments.length]

                  return (
                    <motion.div
                      key={h}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.12 }}
                      className="flex min-h-0 flex-1"
                    >
                      <Paper
                        tone="white"
                        rule="none"
                        curled={false}
                        className="relative flex w-full items-center gap-3.5 overflow-hidden px-4 py-2.5 pl-5"
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-0 w-[4px]"
                          style={{ backgroundColor: c.color }}
                        />

                        <PolaroidAvatar id={h} size="md" rotate={idx === 1 ? 1.5 : -1.8} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="font-title text-[21px] font-bold" style={{ color: PAPER_INK_ACCENT[h] }}>
                                {c.name}
                              </span>
                              <Stamp
                                label={stampMeta.label}
                                color={stampMeta.color}
                                shape={stampMeta.shape}
                                size="sm"
                                rotate={-5}
                              />
                            </div>

                            <div className="flex items-center gap-2.5 font-title font-bold">
                              <span className="text-[21px] leading-none text-ink-body">
                                ♥ {now}
                                <span
                                  className="ml-1.5 font-sans text-[13.5px] font-semibold text-ink-muted"
                                  data-testid={`report-score-parts-${h}`}
                                >
                                  （網站 {site}
                                  {bond >= 0 ? `＋互動 ${bond}` : `－互動 ${Math.abs(bond)}`}）
                                </span>
                              </span>

                              {diff >= 8 ? (
                                <span className="inline-flex items-center gap-1 rounded-[3px] border-2 border-[var(--color-stamp-green)] bg-[#e8f6ee] px-2 py-0.5 text-[15px] text-[var(--color-stamp-green)]">
                                  <FourPointStar size={12} color="#2d7355" />
                                  +{diff}
                                </span>
                              ) : diff > 0 ? (
                                <span className="text-[16px] text-[var(--color-stamp-green)]">+{diff}</span>
                              ) : diff === 0 ? (
                                <span className="text-[15px] text-ink-muted">±0</span>
                              ) : (
                                <span className="rounded-[3px] border border-[var(--color-stamp)]/80 bg-[#fdeceb] px-2 py-0.5 text-[15px] text-[var(--color-stamp)]">
                                  {diff}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 雙色進度尺（含 35 / 60 / 65 門檻刻度） */}
                          <div
                            className="relative mt-1.5 flex h-2.5 w-full overflow-hidden rounded-[2px] border border-[#d6c9b4] bg-[#f1e7d5]"
                            title={`網站 ${site} / 互動 ${bond}`}
                            data-testid={`report-score-bar-${h}`}
                          >
                            <motion.div
                              initial={{ width: `${Math.min(100, Math.min(prev, siteBar))}%` }}
                              animate={{ width: `${Math.min(100, siteBar)}%` }}
                              transition={{ duration: 0.55, delay: 0.15 + idx * 0.12, ease: 'easeOut' }}
                              className="h-full"
                              style={{ background: `color-mix(in srgb, ${c.color} 48%, #f8f2e4)` }}
                            />
                            {bondBar > 0 && (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100 - siteBar, bondBar)}%` }}
                                transition={{ duration: 0.55, delay: 0.22 + idx * 0.12, ease: 'easeOut' }}
                                className="h-full"
                                style={{ background: c.color }}
                              />
                            )}
                            <span aria-hidden="true" className="absolute inset-y-0 left-[35%] z-10 w-px bg-[#5b4d3b]/55" />
                            <span aria-hidden="true" className="absolute inset-y-0 left-[60%] z-10 w-px bg-[#5b4d3b]/55" />
                            <span aria-hidden="true" className="absolute inset-y-0 left-[65%] z-10 w-px bg-[var(--color-stamp)]/65" />
                          </div>

                          <div className="mt-1 flex items-center gap-4 font-sans text-[13px] font-semibold text-ink-muted">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-[1px]"
                                style={{ background: `color-mix(in srgb, ${c.color} 48%, #f8f2e4)` }}
                              />
                              網站 {site}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block h-2.5 w-2.5 rounded-[1px]" style={{ background: c.color }} />
                              互動 {bond}
                            </span>
                          </div>

                          <p className="mt-1 font-title text-[16px] leading-snug text-ink-body">
                            「{line.text.replace(/\{name\}/g, s.playerName)}」
                          </p>
                        </div>
                      </Paper>
                    </motion.div>
                  )
                })}
              </div>

              <div className="flex min-h-0 flex-col justify-center" data-testid="report-dashboard">
                <SiteDashboard stats={s.stats} week={s.week} prevStats={weekStart} compact />
              </div>
            </div>

            {/* 頁尾提示與前進按鈕 */}
            <div className="flex items-center justify-between gap-4 border-t border-dashed border-[#c7b699] pt-2.5">
              <p className="font-sans text-[13.5px] font-bold text-ink-muted">
                {s.week === 1
                  ? '提示：電腦教室換位可在「選單 → 存檔」複製存檔碼帶走進度'
                  : '青葉學園 404 網站研究社 · 週日社團評測紀錄'}
              </p>

              <button
                type="button"
                className="mat-pass-btn px-8 py-2 font-title text-[19px] font-bold"
                data-testid="report-next"
                onClick={() => void s.finishWeeklyReport()}
              >
                <span>{s.week >= 6 ? '前往期末「搜尋祭」' : `進入第 ${s.week + 1} 週`}</span>
                <span aria-hidden="true" className="text-[#ffe39b]">→</span>
              </button>
            </div>
          </Paper>
        </div>
      </div>
    </div>
  )
}
