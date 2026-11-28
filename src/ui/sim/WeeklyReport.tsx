import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Background } from '@/art/backgrounds'
import { audio } from '@/audio'
import { weeklyReportSfx } from '@/audio/cues'
import { CHARACTERS } from '@/content/characters'
import { WEEKLY_COMMENTS } from '@/content/flavor'
import { HEROINES, type HeroineId } from '@/engine/types'
import { useGame } from '@/store/game'
import { scoreParts, scores } from '@/systems/score'
import { readStatSnapshot } from '@/systems/siteMetrics'
import {
  FourPointStar,
  NotebookGauge,
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

/** 固定於成績單照片格對角的炭黑照片角貼（Photo Corners）。 */
function PhotoCorners({ rotate }: { rotate: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <svg viewBox="0 0 16 16" className="mat-photo-corner -left-1 -top-1">
        <path d="M0 0 H15 L0 15 Z" fill="#3a332e" fillOpacity="0.88" />
        <path d="M1 1 H12 L1 12 Z" fill="none" stroke="#a6957c" strokeWidth="0.6" strokeOpacity="0.6" />
      </svg>
      <svg viewBox="0 0 16 16" className="mat-photo-corner -bottom-1 -right-1">
        <path d="M16 16 H1 L16 1 Z" fill="#3a332e" fillOpacity="0.88" />
        <path d="M15 15 H4 L15 4 Z" fill="none" stroke="#a6957c" strokeWidth="0.6" strokeOpacity="0.6" />
      </svg>
    </div>
  )
}

export function WeeklyReport() {
  const s = useGame()
  const weekStart = readStatSnapshot(s.flags)

  useEffect(() => {
    // 只在進週報時依本週分數升降播一次
    const sfx = weeklyReportSfx(s.prevScores, scores(s.stats, s.bond))
    if (sfx) audio.sfx(sfx)
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

            {/* 左側：成績單表格（相片角貼拍立得＋方格塗色條＋鋼筆評語） + 右側：網站數據列印表 */}
            <div className="grid min-h-0 flex-1 grid-cols-[1fr_458px] items-stretch gap-5">
              <div className="flex min-h-0 flex-1 flex-col border-x border-y-[3px] border-x-[#c4b192]/75 border-y-[#786147]/75 border-double bg-[#fffdf7]/42">
                {/* 成績單表頭列 */}
                <div className="flex items-center border-b border-[#8f795c]/65 bg-[#efe3c8]/65 font-sans text-[13px] font-bold text-ink-muted">
                  <span className="w-[88px] shrink-0 border-r border-[#cab799]/75 py-1 text-center">評測夥伴</span>
                  <div className="flex flex-1 items-center justify-between px-3.5 py-1">
                    <span>評等階段・網站與互動進度・夥伴親筆評語</span>
                    <span>總評／週變動</span>
                  </div>
                </div>

                {/* 三位女主角評測表格列 */}
                <div className="flex min-h-0 flex-1 flex-col divide-y divide-[#b8a487]/80">
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
                    const photoRotate = idx === 1 ? 1.5 : -1.8
                    const siteColor = `color-mix(in srgb, ${c.color} 46%, #f8f2e4)`

                    return (
                      <motion.div
                        key={h}
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.12 }}
                        className="flex min-h-0 flex-1 items-stretch"
                      >
                        {/* 左格：以相片角貼固定在成績單上的拍立得頭像（角色色僅於拍立得邊框／姓名墨色呈現） */}
                        <div className="flex w-[88px] shrink-0 items-center justify-center border-r border-[#cab799]/75 px-2">
                          <div className="relative inline-block">
                            <PolaroidAvatar id={h} size="md" rotate={photoRotate} />
                            <PhotoCorners rotate={photoRotate} />
                          </div>
                        </div>

                        {/* 右格：姓名、印章、手寫鋼筆變動分、方格塗色條與評語 */}
                        <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-1.5">
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

                            <div className="flex items-baseline gap-3 font-title font-bold">
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
                                <span className="inline-flex items-center gap-1.5 border-b-[3px] border-double border-[var(--color-stamp-green)]/85 pb-px text-[18px] leading-none text-[var(--color-stamp-green)]">
                                  <span>+{diff}</span>
                                  <FourPointStar size={13} color="#c97a16" />
                                </span>
                              ) : diff > 0 ? (
                                <span className="text-[17px] leading-none text-[var(--color-stamp-green)]">+{diff}</span>
                              ) : diff === 0 ? (
                                <span className="text-[15px] leading-none text-ink-muted">±0</span>
                              ) : (
                                <span className="border-b-2 border-[var(--color-stamp)]/85 pb-px text-[17px] leading-none text-[var(--color-stamp)]">
                                  {diff}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 手帳方格塗色進度條（含 35 / 60 / 65 門檻刻度） */}
                          <NotebookGauge
                            cells={20}
                            height={12}
                            animate
                            className="mt-1.5"
                            title={`網站 ${site} / 互動 ${bond}`}
                            data-testid={`report-score-bar-${h}`}
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

                          <div className="mt-1 flex items-center gap-4 font-sans text-[13px] font-semibold text-ink-muted">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="mat-pencil-fill inline-block h-3 w-3 rounded-[1px] border border-[#a89578]"
                                style={{ backgroundColor: siteColor }}
                              />
                              網站 {site}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span
                                className="mat-pencil-fill inline-block h-3 w-3 rounded-[1px] border border-[#a89578]"
                                style={{ backgroundColor: c.color }}
                              />
                              互動 {bond}
                            </span>
                          </div>

                          <p className="mt-1 font-title text-[16px] leading-snug text-ink-body">
                            「{line.text.replace(/\{name\}/g, s.playerName)}」
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
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
