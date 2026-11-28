import { useEffect, useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { Background } from '@/art/backgrounds'
import { ActivityChibi } from '@/art/chibi/ActivityChibi'
import { audio } from '@/audio'
import { ACTIVITIES, ACTIVITY_LIST, RECOMMENDED_SCHEDULE, WEEK_THEMES } from '@/content/activities'
import type { ActivityId } from '@/content/activityIds'
import { CHARACTERS, type CharId } from '@/content/characters'
import { HEROINES, STAT_KEYS, type HeroineId, type StatKey } from '@/engine/types'
import { useGame } from '@/store/game'
import { useUI } from '@/store/ui'
import { scores } from '@/systems/score'
import { isThemedActivity, previewSchedule, RULES, runWeekSchedule, type WeekScheduleResult } from '@/systems/schedule'
import {
  FourPointStar,
  NotebookGauge,
  PAPER_INK_ACCENT,
  Paper,
  PolaroidAvatar,
  RoomBadge,
  SearchRule,
  Stamp,
  StickyNote,
  Tape,
  paperInkFor,
} from '@/ui/material'

const WEEKDAYS = ['星期一', '星期二', '星期三', '星期四'] as const
const WEEKDAYS_SHORT = ['週一', '週二', '週三', '週四'] as const
const WEEKDAYS_EN = ['MON', 'TUE', 'WED', 'THU'] as const

const STAT_SHORT: Record<StatKey, string> = {
  con: '內容',
  tec: '技術',
  str: '結構',
  ans: '解答',
  tru: '信任',
}

const STAT_LABEL: Record<StatKey, string> = {
  con: '內容力',
  tec: '技術力',
  str: '結構力',
  ans: '解答力',
  tru: '信任力',
}

interface StickerStyle {
  bg: string
  iconBg: string
  iconInk: string
  accent: string
  radius: string
  rotate: number
}

const ACTIVITY_STICKER: Record<ActivityId, StickerStyle> = {
  write: {
    bg: '#fcebd8',
    iconBg: '#f3c699',
    iconInk: '#6e2e0e',
    accent: '#c25e28',
    radius: '15px 12px 16px 13px / 13px 15px 12px 14px',
    rotate: -0.9,
  },
  research: {
    bg: '#e1effe',
    iconBg: '#b3d4f6',
    iconInk: '#1a436e',
    accent: '#2f5d8c',
    radius: '12px 16px 13px 15px / 14px 12px 15px 13px',
    rotate: 0.8,
  },
  techcheck: {
    bg: '#ddf2ee',
    iconBg: '#a4dcd4',
    iconInk: '#134e4a',
    accent: '#1e7874',
    radius: '14px 15px 12px 16px / 12px 14px 15px 13px',
    rotate: 0.7,
  },
  schema: {
    bg: '#ece5fb',
    iconBg: '#cbbef2',
    iconInk: '#3e2f78',
    accent: '#5b4b99',
    radius: '16px 13px 14px 12px / 13px 16px 12px 14px',
    rotate: -0.8,
  },
  qa: {
    bg: '#fdecd7',
    iconBg: '#f4cc98',
    iconInk: '#753c06',
    accent: '#b45309',
    radius: '13px 16px 15px 12px / 15px 13px 12px 16px',
    rotate: -0.6,
  },
  authors: {
    bg: '#faf1cf',
    iconBg: '#ebd58e',
    iconInk: '#664708',
    accent: '#8f6514',
    radius: '15px 13px 12px 16px / 12px 15px 14px 13px',
    rotate: 0.9,
  },
  social: {
    bg: '#fce3ec',
    iconBg: '#f4b8ce',
    iconInk: '#7d2244',
    accent: '#b33b62',
    radius: '12px 15px 16px 13px / 14px 12px 13px 16px',
    rotate: 0.6,
  },
  rest: {
    bg: '#dff3e4',
    iconBg: '#a9dec0',
    iconInk: '#1b5239',
    accent: '#2d7355',
    radius: '16px 14px 13px 15px / 14px 15px 13px 12px',
    rotate: -0.8,
  },
}

const SLOT_ROTATES = [-1.4, 1.1, -1.0, 1.3] as const

const INK_GAIN = '#1e6645'
const INK_COST = '#b02e23'

/** 8 張活動貼紙統一風格的手繪文具線條圖示。 */
function ActivityStickerIcon({ id, color, size = 25 }: { id: ActivityId; color: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 28 28',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.85,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    className: 'pointer-events-none shrink-0',
  }

  switch (id) {
    case 'write':
      // 鋼筆筆尖與紙上墨跡曲線
      return (
        <svg {...common}>
          <path d="M18.5 4.2 L23.8 9.5 L12.4 20.9 L6.2 21.8 L7.1 15.6 Z" fill={color} fillOpacity="0.14" />
          <path d="M16.2 6.5 L21.5 11.8" />
          <path d="M9.6 18.4 L13.4 14.6" />
          <circle cx="14.2" cy="13.8" r="1.1" fill={color} />
          <path d="M5 24 C9 23.2, 13.5 24.4, 18.5 23.4" />
        </svg>
      )
    case 'research':
      // 放大鏡與搜尋關鍵星點
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="6.4" fill={color} fillOpacity="0.14" />
          <path d="M16.7 16.7 L22.6 22.6" strokeWidth="2.3" />
          <path d="M9.3 9.7 C10.3 8.5, 11.8 8.3, 13.2 8.9" />
          <path d="M21 5.2 L21.7 7 L23.5 7.7 L21.7 8.4 L21 10.2 L20.3 8.4 L18.5 7.7 L20.3 7 Z" fill={color} strokeWidth="1" />
        </svg>
      )
    case 'techcheck':
      // 手繪開口扳手與小螺帽
      return (
        <svg {...common}>
          <path
            d="M17.2 5.4 A4.8 4.8 0 0 0 11.6 11.8 L5.6 17.8 A2.1 2.1 0 0 0 8.6 20.8 L14.6 14.8 A4.8 4.8 0 0 0 21.8 10 L18.8 10.6 L16.9 8.7 Z"
            fill={color}
            fillOpacity="0.15"
          />
          <circle cx="20.4" cy="20.4" r="3" />
          <circle cx="20.4" cy="20.4" r="0.9" fill={color} />
        </svg>
      )
    case 'schema':
      // 結構化標籤吊牌與節點
      return (
        <svg {...common}>
          <path d="M5 6.8 H13.4 L22.6 16 L15.4 23.2 L6.2 14 Z" fill={color} fillOpacity="0.14" />
          <circle cx="9.8" cy="10.8" r="1.4" fill={color} />
          <path d="M12.2 14.6 L17.6 14.6 M13.8 17.6 L16.8 17.6" />
          <circle cx="22.4" cy="7.2" r="1.8" />
          <path d="M18.6 8.4 L20.7 7.6" />
        </svg>
      )
    case 'qa':
      // 問答對話氣泡與結論短線
      return (
        <svg {...common}>
          <path
            d="M5.2 6.8 Q5.2 5 7 5 H21 Q22.8 5 22.8 6.8 V16.4 Q22.8 18.2 21 18.2 H13 L8.2 22.4 V18.2 H7 Q5.2 18.2 5.2 16.4 Z"
            fill={color}
            fillOpacity="0.14"
          />
          <path d="M11.6 9.4 C11.6 8, 14.8 7.8, 14.8 9.6 C14.8 11, 13.1 11.2, 13.1 12.6" />
          <circle cx="13.1" cy="14.9" r="0.9" fill={color} />
          <path d="M17.4 10.2 L19.4 10.2 M17.4 13.2 L19.4 13.2" />
        </svg>
      )
    case 'authors':
      // 作者名片與來源檢核欄
      return (
        <svg {...common}>
          <rect x="4.5" y="6.2" width="19" height="15.6" rx="2.5" fill={color} fillOpacity="0.13" />
          <circle cx="10" cy="12" r="2.1" />
          <path d="M7.2 17.4 C7.7 15.6, 12.3 15.6, 12.8 17.4" />
          <path d="M15.2 11.2 H20.4 M15.2 14.4 H20.4 M15.2 17.4 H18.8" />
        </svg>
      )
    case 'social':
      // 手繪地球儀與外部交流連線
      return (
        <svg {...common}>
          <circle cx="14" cy="14" r="8.2" fill={color} fillOpacity="0.13" />
          <ellipse cx="14" cy="14" rx="3.7" ry="8.2" />
          <path d="M6.4 11.2 H21.6 M6.4 16.8 H21.6" />
          <circle cx="22.4" cy="6.2" r="1.4" fill={color} />
        </svg>
      )
    case 'rest':
      // 紅豆麵包與冒熱氣茶杯
      return (
        <svg {...common}>
          <path d="M4.5 18.6 C4.5 13.4, 8.2 10.8, 12.4 10.8 C16.6 10.8, 19.6 13.4, 19.6 18.6 Z" fill={color} fillOpacity="0.16" />
          <circle cx="11" cy="14.2" r="0.7" fill={color} />
          <circle cx="13" cy="13.6" r="0.7" fill={color} />
          <circle cx="13.6" cy="15.3" r="0.7" fill={color} />
          <path d="M17.8 21.8 H23.2 C23.2 21.8, 23.6 17.2, 23.6 17.2 H17.4 Z" fill={color} fillOpacity="0.12" />
          <path d="M19.2 9.2 C18.5 7.9, 19.9 7, 19.2 5.6 M22 9.5 C21.3 8.2, 22.7 7.3, 22 5.9" />
        </svg>
      )
  }
}

/** 活動數值摘要格式化（改為手寫墨水字陣列）。 */
function activityDeltaTokens(a: (typeof ACTIVITIES)[ActivityId], themed: boolean): { text: string; good: boolean }[] {
  const out: { text: string; good: boolean }[] = []
  for (const k of STAT_KEYS) {
    const v = a.stats[k]
    if (v) {
      const shown = themed ? Math.round(v * 1.5) : v
      out.push({ text: `${STAT_SHORT[k]}+${shown}`, good: true })
    }
  }
  out.push({ text: `體力${a.stamina >= 0 ? `+${a.stamina}` : a.stamina}`, good: a.stamina >= 0 })
  out.push({ text: `壓力${a.stress >= 0 ? `+${a.stress}` : a.stress}`, good: a.stress < 0 })
  return out
}

/** 手帳中央金屬雙線圈裝飾（純裝飾）。 */
function NotebookBindingRings() {
  return (
    <div
      aria-hidden="true"
      className="mat-notebook-spine flex w-[22px] shrink-0 flex-col items-center justify-evenly py-6"
    >
      {Array.from({ length: 10 }, (_, i) => (
        <svg key={i} width="26" height="18" viewBox="0 0 26 18" className="pointer-events-none overflow-visible">
          <ellipse cx="4" cy="9" rx="2.4" ry="2.8" fill="#3a2110" opacity="0.65" />
          <ellipse cx="22" cy="9" rx="2.4" ry="2.8" fill="#3a2110" opacity="0.65" />
          <path
            d="M4 7.5 C8 2.5, 18 2.5, 22 7.5"
            fill="none"
            stroke="#c9c2b8"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M4 11 C8 6, 18 6, 22 11"
            fill="none"
            stroke="#8e867c"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M7 5.5 C10 3.5, 16 3.5, 19 5.5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      ))}
    </div>
  )
}

export function ScheduleScreen() {
  const s = useGame()
  const overlay = useUI((u) => u.overlay)
  const [slots, setSlots] = useState<(ActivityId | null)[]>([null, null, null, null])
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [result, setResult] = useState<WeekScheduleResult | null>(null)
  const [stepIdx, setStepIdx] = useState(0)

  const filledSlots = slots.filter((x): x is ActivityId => x !== null)
  const preview = previewSchedule(s, s.week, filledSlots)
  const baseScores = scores(s.stats, s.bond)
  const previewStats = {
    con: Math.min(100, s.stats.con + preview.stats.con),
    tec: Math.min(100, s.stats.tec + preview.stats.tec),
    str: Math.min(100, s.stats.str + preview.stats.str),
    ans: Math.min(100, s.stats.ans + preview.stats.ans),
    tru: Math.min(100, s.stats.tru + preview.stats.tru),
  }
  const previewScores = scores(previewStats, s.bond)
  const theme = WEEK_THEMES[s.week]

  const assignNext = (id: ActivityId) => {
    const empty = slots.indexOf(null)
    if (empty === -1) return
    setSlots((prev) => prev.map((v, i) => (i === empty ? id : v)))
  }

  const clearSlot = (idx: number) => {
    setSlots((prev) => prev.map((v, i) => (i === idx ? null : v)))
  }

  const autoFill = () => {
    setSlots([...(RECOMMENDED_SCHEDULE[s.week] ?? ['write', 'research', 'authors', 'rest'])])
  }

  const execute = () => {
    if (filledSlots.length < 4) return
    const res = runWeekSchedule(s, s.week, filledSlots)
    setResult(res)
    setStepIdx(0)
  }

  useEffect(() => {
    if (!result) return
    const out = result.outcomes[stepIdx]
    if (!out) return
    if (out.status === 'fail' || out.status === 'infirmary') audio.sfx('fail')
    else if (out.chatter) audio.sfx('bond')
    else if (out.status === 'ok') audio.sfx('grow')
  }, [result, stepIdx])

  useEffect(() => {
    if (!result || overlay) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      if ((e.target as HTMLElement | null)?.closest('button, input, textarea')) return
      e.preventDefault()
      if (stepIdx < result.outcomes.length - 1) setStepIdx((v) => v + 1)
      else s.commitScheduleResult(result.nextState)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result, stepIdx, overlay, s])

  // ── 排程執行演出畫面：手帳每日紀錄頁 ──
  if (result) {
    const out = result.outcomes[stepIdx]
    const def = ACTIVITIES[out.activityId]
    const isLast = stepIdx >= result.outcomes.length - 1
    const chatterChar = out.chatter && CHARACTERS[out.chatter.who].hasSprite ? (out.chatter.who as CharId) : null
    const chatterBondTotal = out.chatter ? Object.values(out.bondDelta).reduce((a, b) => a + (b ?? 0), 0) : 0

    const playbackDeltas: { key: string; text: string; good: boolean }[] = []
    for (const k of STAT_KEYS) {
      const val = out.statDelta[k]
      if (val) playbackDeltas.push({ key: k, text: `${STAT_SHORT[k]} +${val}`, good: true })
    }
    if (out.staminaDelta !== 0) {
      playbackDeltas.push({
        key: 'stamina',
        text: `體力 ${out.staminaDelta > 0 ? `+${out.staminaDelta}` : out.staminaDelta}`,
        good: out.staminaDelta > 0,
      })
    }
    if (out.stressDelta !== 0) {
      playbackDeltas.push({
        key: 'stress',
        text: `壓力 ${out.stressDelta > 0 ? `+${out.stressDelta}` : out.stressDelta}`,
        good: out.stressDelta < 0,
      })
    }

    return (
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 pb-4 pt-14"
        data-testid="schedule-playback"
      >
        {/* 體力歸零送保健室時切換至保健室背景 */}
        <Background id={out.status === 'infirmary' || out.status === 'skipped' ? 'infirmary' : 'clubroom'} time="day" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#171122]/36 via-[#231718]/20 to-[#120d10]/40 backdrop-blur-[1.5px]"
        />

        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mat-notebook-cover relative z-10 w-[896px] p-[9px]"
        >
          <Paper
            tone="cream"
            rule="lined"
            curled={false}
            className="flex max-h-[618px] flex-col gap-3 px-7 pb-4 pt-4"
          >
            {/* 頂部頁首與星期一～四手寫進度標記 */}
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#c7b699] pb-2.5">
              <div className="flex items-center gap-2.5">
                <RoomBadge label={`第 ${s.week} 週`} />
                <span className="font-title text-[24px] font-bold leading-tight text-ink-body">
                  {WEEKDAYS[stepIdx]} · {def.name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {result.outcomes.map((item, idx) => {
                  const done = idx < stepIdx
                  const current = idx === stepIdx
                  const mark =
                    item.status === 'fail'
                      ? '✕'
                      : item.status === 'infirmary' || item.status === 'skipped'
                        ? '✚'
                        : done
                          ? '✓'
                          : WEEKDAYS_SHORT[idx]
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-1 pb-0.5 font-title text-[14px] font-bold transition ${
                        current
                          ? 'border-b-2 border-[var(--color-stamp)] text-[var(--color-stamp)]'
                          : done
                            ? 'text-[#225c42]'
                            : 'text-ink-muted'
                      }`}
                    >
                      <span>{mark}</span>
                      <span>{ACTIVITIES[item.activityId].short}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 拍立得相框包裹活動插圖 */}
            <div
              className="relative border border-[#d6c7ae] bg-[#fffdf8] p-2.5 pb-3 shadow-[0_6px_16px_rgba(38,18,6,0.22)]"
              style={{ transform: 'rotate(-0.3deg)' }}
            >
              <Tape color="sakura" pattern="stripe" rotate={-11} width={66} height={17} className="absolute -top-2 left-5 z-20" />
              <Tape color="sky" pattern="solid" rotate={9} width={66} height={17} className="absolute -top-2 right-5 z-20" />
              <ActivityChibi outcome={out} />
            </div>

            {/* 手帳每日記事與手寫墨水數值變化 */}
            <div className="border-y border-[#cdbda2] bg-[#fffdf7]/60 px-5 py-3">
              {(out.status === 'fail' || out.status === 'infirmary' || (out.status === 'ok' && (out.halfTired || out.tense))) && (
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                  {out.status === 'fail' && (
                    <>
                      <Stamp label="壓力失誤" color="vermilion" shape="rect" size="sm" rotate={-5} />
                      <p className="text-[15px] font-bold text-[var(--color-stamp)]">壓力過高造成失誤！（能力效果歸零）</p>
                    </>
                  )}
                  {out.status === 'infirmary' && (
                    <>
                      <Stamp label="送醫休養" color="vermilion" shape="rect" size="sm" rotate={-5} />
                      <p className="text-[15px] font-bold text-[var(--color-stamp)]" data-testid="infirmary-note">
                        體力歸零！被送進保健室，這格白做了、剩餘排程作廢，這週週末也只能在家休養。
                      </p>
                    </>
                  )}
                  {out.halfTired && out.status === 'ok' && (
                    <span
                      className="mat-stamp inline-block border border-[var(--color-stamp)]/80 bg-transparent px-2 py-0.5 font-title text-[13.5px] font-bold text-[var(--color-stamp)]"
                      style={{ '--mat-rot': '-2deg' } as CSSProperties}
                      data-testid="tired-badge"
                    >
                      體力不足：能力值減半
                    </span>
                  )}
                  {out.tense && out.status === 'ok' && (
                    <span
                      className="mat-stamp inline-block border border-[#9e4f0c]/80 bg-transparent px-2 py-0.5 font-title text-[13.5px] font-bold text-[#7a4b0b]"
                      style={{ '--mat-rot': '-1.5deg' } as CSSProperties}
                      data-testid="tense-badge"
                    >
                      焦躁中：能力值 ×{RULES.tenseMul}
                    </span>
                  )}
                </div>
              )}

              <p className="font-title text-[19px] font-semibold leading-snug text-ink-body">{out.caption}</p>

              {playbackDeltas.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center font-title text-[16px] font-bold leading-snug">
                  {playbackDeltas.map((d, dIdx) => (
                    <motion.span
                      key={d.key}
                      initial={{ scale: 0.78, y: 5, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{ delay: 0.08 + dIdx * 0.05, type: 'spring', stiffness: 320, damping: 18 }}
                      className="inline-flex items-center"
                    >
                      {dIdx > 0 && (
                        <span aria-hidden="true" className="mx-2 text-[#8c7a62]">
                          ·
                        </span>
                      )}
                      <span style={{ color: d.good ? INK_GAIN : INK_COST }}>{d.text}</span>
                    </motion.span>
                  ))}
                </div>
              )}
            </div>

            {/* 角色小插曲便利貼 */}
            {out.chatter && (
              <motion.div
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14 }}
              >
                <StickyNote
                  color="pink"
                  rotate={0.4}
                  attach="tape"
                  tapeColor="sakura"
                  className="flex items-center gap-3.5 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3.5">
                    {chatterChar && <PolaroidAvatar id={chatterChar} size="sm" rotate={-2.5} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <p className="font-sans text-[14.5px] font-bold" style={{ color: paperInkFor(out.chatter.who) }}>
                          小插曲 · {CHARACTERS[out.chatter.who].name}
                        </p>
                        {chatterBondTotal > 0 && (
                          <span className="border border-[var(--color-stamp)]/75 bg-transparent px-1.5 py-0 font-title text-[13.5px] font-bold leading-tight text-[var(--color-stamp)]">
                            好感 +{chatterBondTotal} ♥
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-title text-[16px] leading-snug text-ink-body">
                        {out.chatter.text.replace(/\{name\}/g, s.playerName)}
                      </p>
                    </div>
                  </div>
                </StickyNote>
              </motion.div>
            )}

            {/* 保健室關懷便條 */}
            {out.status === 'infirmary' && result.infirmaryLines.length > 0 && (
              <StickyNote color="mint" rotate={-0.4} attach="tape" tapeColor="mint" className="px-4 py-2.5">
                <div className="space-y-1 text-[15px] leading-snug">
                  {result.infirmaryLines.slice(0, 3).map((l, i) => (
                    <p key={i}>
                      <strong style={{ color: paperInkFor(l.who) }}>{CHARACTERS[l.who].name}：</strong>
                      <span className="text-ink-body">{l.text}</span>
                    </p>
                  ))}
                </div>
              </StickyNote>
            )}

            {/* 底部操作列 */}
            <div className="flex items-center justify-between gap-3 pt-0.5">
              {!isLast ? (
                <button
                  type="button"
                  className="mat-washi-btn px-4 py-1.5 text-[15px]"
                  data-testid="schedule-skip"
                  onClick={() => s.commitScheduleResult(result.nextState)}
                >
                  略過本週演出 ⏭
                </button>
              ) : (
                <span className="text-[13.5px] font-semibold text-ink-muted">按 Space / Enter 繼續</span>
              )}
              <button
                type="button"
                className="mat-pass-btn px-7 py-2 font-title text-[18.5px] font-bold"
                data-testid="schedule-next"
                onClick={() => {
                  if (!isLast) setStepIdx((v) => v + 1)
                  else s.commitScheduleResult(result.nextState)
                }}
              >
                {isLast ? '前往放學後委託 →' : '下一天 →'}
              </button>
            </div>
          </Paper>
        </motion.div>
      </div>
    )
  }

  // ── 平日排程規劃畫面：攤開在社辦木桌上的學生手帳雙頁跨頁 ──
  const hasAnyRisk = preview.infirmaryRisk || preview.failRisk || preview.tenseRisk || preview.tiredRisk

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 pb-4 pt-14"
      data-testid="schedule-screen"
    >
      <Background id="clubroom" time="day" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#171122]/36 via-[#231718]/18 to-[#120d10]/38 backdrop-blur-[1.5px]"
      />

      <div className="mat-notebook-cover relative z-10 flex h-[636px] w-[1224px] items-stretch p-[10px]">
        {/* 左頁：星期一～四週計畫格 + 8 張模切活動貼紙 */}
        <Paper
          tone="cream"
          rule="grid"
          curled={false}
          className="flex min-h-0 flex-1 flex-col rounded-r-none border-r-0 px-5 py-3"
        >
          {/* 左頁表頭 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <RoomBadge label="404" />
              <h2 className="font-title text-[24px] font-bold leading-tight text-ink-body">
                第 {s.week} 週 · 社團週計畫
              </h2>
              {theme && (
                <span className="inline-flex items-center gap-1 border-b border-dashed border-[#b08d57] pb-0.5 font-title text-[14px] font-bold text-[#7c4d25]">
                  <FourPointStar size={12} color="#c6382b" />
                  主題：{theme.topic}
                </span>
              )}
            </div>

            <button
              type="button"
              className="mat-washi-btn shrink-0 px-4 py-1.5 font-title text-[15px] font-bold"
              onClick={autoFill}
            >
              推薦排程
            </button>
          </div>

          {/* 四天週計畫欄位：星期一～星期四（手寫入格＋墨色底線＋小圓貼） */}
          <div className="mt-2.5 grid grid-cols-4 gap-2.5">
            {slots.map((id, idx) => {
              const def = id ? ACTIVITIES[id] : null
              const themed = id ? isThemedActivity(s.week, id) : false
              const st = id ? ACTIVITY_STICKER[id] : null
              const isDropTarget = dragOverIdx === idx

              return (
                <button
                  key={idx}
                  type="button"
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (dragOverIdx !== idx) setDragOverIdx(idx)
                  }}
                  onDragLeave={() => {
                    if (dragOverIdx === idx) setDragOverIdx(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOverIdx(null)
                    const dropped = e.dataTransfer.getData('text/plain') as ActivityId
                    if (dropped && ACTIVITIES[dropped]) {
                      setSlots((prev) => prev.map((v, i) => (i === idx ? dropped : v)))
                    }
                  }}
                  onClick={() => clearSlot(idx)}
                  data-testid={`slot-box-${idx}`}
                  className={`group flex h-[96px] flex-col rounded-[2px] border text-left transition ${
                    isDropTarget
                      ? 'border-[#2f5d8c] bg-[#e9f3fc] ring-2 ring-[#2f5d8c]/35'
                      : def
                        ? 'border-[#b9a27e] bg-[#fbf5e6]/80 hover:border-[#8f6c44]'
                        : 'border-dashed border-[#bfa989] bg-[#fbf6eb]/45 hover:border-[#8f6c44] hover:bg-[#f7eedb]/80'
                  } focus-visible:outline-3 focus-visible:outline-[#2b6ea8] focus-visible:outline-offset-2`}
                >
                  <div className="flex items-center justify-between border-b border-[#cab797]/80 bg-[#efe2c6]/65 px-2.5 py-0.5">
                    <span className="font-title text-[14.5px] font-bold text-ink-body">{WEEKDAYS[idx]}</span>
                    <span className="font-sans text-[13px] font-bold tracking-wider text-ink-muted">
                      {WEEKDAYS_EN[idx]}
                    </span>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-1">
                    {def && st ? (
                      <div
                        className="flex w-full flex-col items-center gap-0.5"
                        style={{ transform: `rotate(${SLOT_ROTATES[idx]}deg)` }}
                      >
                        <div className="flex w-full items-center justify-center gap-1">
                          <span
                            className="flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#fffdf9] shadow-[0_1px_3px_rgba(42,22,6,0.22)]"
                            style={{ backgroundColor: st.iconBg }}
                          >
                            <ActivityStickerIcon id={def.id} color={st.iconInk} size={13} />
                          </span>
                          <span className="truncate font-title text-[16px] font-bold leading-tight text-ink-body">
                            {def.short}
                          </span>
                          {themed && (
                            <span className="shrink-0 font-title text-[13px] font-bold text-[var(--color-stamp)]">
                              ★×1.5
                            </span>
                          )}
                        </div>
                        <svg
                          viewBox="0 0 120 6"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                          className="h-[5px] w-full"
                        >
                          <path
                            d="M2 3.6 Q32 1.8 60 3.2 T118 2.8"
                            fill="none"
                            stroke={st.accent}
                            strokeWidth="2.1"
                            strokeLinecap="round"
                            strokeOpacity="0.82"
                          />
                        </svg>
                        <span className="font-title text-[13px] font-semibold leading-none text-ink-muted group-hover:text-[var(--color-stamp)]">
                          點此撕下
                        </span>
                      </div>
                    ) : (
                      <span className="font-title text-[14px] text-ink-muted/80">點選貼紙填入</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 貼紙收納區導引 */}
          <div className="mt-2 mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[13.5px] font-bold text-ink-muted">
              活動貼紙（點擊貼入星期一～四，或拖放指定日期）
            </span>
            <span className="font-title text-[13.5px] font-bold text-[var(--color-stamp)]">★ 本週主題 ×1.5 加成</span>
          </div>

          {/* 8 張模切活動貼紙（外圈 3px 白邊＋不規則圓角＋手繪圖示＋手寫墨水數值） */}
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-4 gap-2.5">
            {ACTIVITY_LIST.map((a) => {
              const themed = isThemedActivity(s.week, a.id)
              const st = ACTIVITY_STICKER[a.id]
              const tokens = activityDeltaTokens(a, themed)

              return (
                <button
                  key={a.id}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                  onClick={() => assignNext(a.id)}
                  data-testid={`act-${a.id}`}
                  className="mat-diecut-sticker flex items-center gap-2.5 px-2.5 py-1.5 text-left"
                  style={
                    {
                      '--mat-rot': `${st.rotate}deg`,
                      '--sticker-radius': st.radius,
                      backgroundColor: st.bg,
                    } as CSSProperties
                  }
                >
                  {/* 左側：手繪圖示圓章 */}
                  <span
                    className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#fffdf9]/95 shadow-[inset_0_1px_2px_rgba(42,22,6,0.12)]"
                    style={{ backgroundColor: st.iconBg }}
                  >
                    <ActivityStickerIcon id={a.id} color={st.iconInk} size={25} />
                  </span>

                  {/* 右側：手寫活動名＋說明＋手寫墨水數值 */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-title text-[16px] font-bold leading-tight text-ink-body">
                        {a.name}
                      </span>
                      {themed && (
                        <span
                          className="mat-stamp shrink-0 border border-[var(--color-stamp)]/80 bg-transparent px-1.5 py-0 font-title text-[13px] font-bold leading-tight text-[var(--color-stamp)]"
                          style={{ '--mat-rot': '-4deg' } as CSSProperties}
                        >
                          ★×1.5
                        </span>
                      )}
                    </div>

                    <p className="text-[13px] leading-[1.28] text-ink-muted" title={a.desc}>
                      {a.desc}
                    </p>

                    <div className="flex flex-wrap items-center font-title text-[13.5px] font-bold leading-tight">
                      {tokens.map((tok, tIdx) => (
                        <span key={tIdx} className="inline-flex items-center">
                          {tIdx > 0 && (
                            <span aria-hidden="true" className="mx-1 text-[#8c7a62]">
                              ·
                            </span>
                          )}
                          <span style={{ color: tok.good ? INK_GAIN : INK_COST }}>{tok.text}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </Paper>

        {/* 中央手帳金屬雙線圈 */}
        <NotebookBindingRings />

        {/* 右頁：社團手帳現況、方格塗色進度條、便利貼風險提醒與啟動按鈕 */}
        <Paper
          tone="warm"
          rule="lined"
          curled={false}
          className="flex w-[408px] shrink-0 flex-col justify-between gap-2 rounded-l-none border-l-0 px-4 py-3.5"
        >
          {/* 右頁表頭 */}
          <div className="flex items-center justify-between gap-2 border-b border-dashed border-[#c7b699] pb-1.5">
            <h3 className="font-title text-[19px] font-bold text-ink-body">手帳現況與預期</h3>
            <span className="font-sans text-[13px] font-bold text-ink-muted">
              {theme ? `W${s.week} · ${theme.title}` : `第 ${s.week} 週`}
            </span>
          </div>

          {/* 體力與壓力：手帳方格塗色尺 */}
          <div className="grid grid-cols-2 gap-3 border-y border-[#c7b699]/85 bg-[#fffdf7]/45 px-2.5 py-2">
            <div>
              <div className="flex items-baseline justify-between text-[13.5px] font-bold">
                <span className="text-ink-body">體力</span>
                <span className={preview.infirmaryRisk || preview.stamina < 20 ? 'text-[var(--color-stamp)]' : 'text-[#205e42]'}>
                  {s.stamina}
                  {filledSlots.length > 0 && ` → ${preview.infirmaryRisk ? `0→${preview.stamina}` : preview.stamina}`}
                </span>
              </div>
              <NotebookGauge
                cells={10}
                height={11}
                className="mt-1.5"
                segments={[
                  {
                    value: filledSlots.length > 0 ? preview.stamina : s.stamina,
                    color: preview.infirmaryRisk || preview.stamina < 20 ? '#c6382b' : '#2f825e',
                    pattern: 'pencil',
                  },
                ]}
                thresholds={[
                  { at: 20, color: '#c6382b', prominent: true },
                  { at: 50, color: '#8c7758' },
                ]}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between text-[13.5px] font-bold">
                <span className="flex items-center gap-1 text-ink-body">
                  <span>壓力</span>
                  {s.stress >= RULES.tenseAt && (
                    <span
                      className="font-title text-[13px] font-bold text-[var(--color-stamp)]"
                      data-testid="stress-tier"
                    >
                      〔{s.stress >= RULES.failAt ? '過高' : '焦躁'}〕
                    </span>
                  )}
                </span>
                <span
                  className={
                    preview.stress >= RULES.failAt
                      ? 'text-[var(--color-stamp)]'
                      : preview.stress >= RULES.tenseAt
                        ? 'text-[#9e4f0c]'
                        : 'text-ink-body'
                  }
                >
                  {s.stress}
                  {filledSlots.length > 0 && ` → ${preview.stress}`}
                </span>
              </div>
              <NotebookGauge
                cells={10}
                height={11}
                className="mt-1.5"
                segments={[
                  {
                    value: filledSlots.length > 0 ? preview.stress : s.stress,
                    color: preview.stress >= RULES.failAt ? '#c6382b' : '#c96b38',
                    pattern: 'pencil',
                  },
                ]}
                thresholds={[
                  { at: 60, color: '#b45309' },
                  { at: 80, color: '#c6382b', prominent: true },
                ]}
              />
            </div>
          </div>

          {/* 網站屬性預期手寫表 + 夥伴好感 */}
          <div className="border-y border-[#c7b699]/85 bg-[#fffdf7]/45 px-2.5 py-2">
            <div className="space-y-1.5">
              {STAT_KEYS.map((k) => {
                const nowVal = s.stats[k]
                const gain = preview.stats[k]
                const nextVal = Math.min(100, nowVal + gain)
                return (
                  <div key={k} className="flex items-center gap-2 text-[13.5px]">
                    <span className="w-[46px] shrink-0 font-bold text-ink-body">{STAT_LABEL[k]}</span>
                    <NotebookGauge
                      cells={20}
                      height={10}
                      className="flex-1"
                      segments={[
                        { value: nowVal, color: '#2f5d8c', pattern: 'pencil' },
                        ...(gain > 0
                          ? [{ value: nextVal - nowVal, color: '#3ea374', pattern: 'highlighter' as const }]
                          : []),
                      ]}
                    />
                    <span className="w-[62px] shrink-0 text-right font-sans font-bold text-ink-body">
                      {nowVal}
                      {gain > 0 && <span className="ml-1 text-[#1e6645]">+{gain}</span>}
                    </span>
                  </div>
                )
              })}
            </div>

            <SearchRule className="my-2" />

            <div className="space-y-1">
              {HEROINES.map((h: HeroineId) => {
                const c = CHARACTERS[h]
                const base = baseScores[h]
                const delta = previewScores[h] - base
                return (
                  <div key={h} className="flex items-center justify-between text-[13.5px] font-bold">
                    <span style={{ color: PAPER_INK_ACCENT[h] }}>{c.name}</span>
                    <span className="font-sans text-ink-body">
                      ♥ {Math.round(base)}
                      {delta >= 0.1 && (
                        <span className="ml-1.5 text-[var(--color-stamp)]">+{delta.toFixed(1)}</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 風險提醒／備忘便利貼 */}
          {hasAnyRisk ? (
            <StickyNote
              color={preview.infirmaryRisk || preview.failRisk ? 'pink' : 'yellow'}
              rotate={-0.7}
              attach="tape"
              tapeColor="cream"
              data-testid="schedule-risks"
              className="px-4 py-2.5"
            >
              <div className="space-y-0.5 font-sans text-[13px] font-bold leading-[1.35] text-ink-body">
                {preview.infirmaryRisk && (
                  <p className="text-[var(--color-stamp-dark)]">
                    • {WEEKDAYS[preview.infirmarySlot ?? 0]}體力將歸零：進保健室、後續排程作廢，週末僅能休養
                  </p>
                )}
                {preview.failRisk && (
                  <p className="text-[var(--color-stamp-dark)]">
                    • 壓力 ≥ {RULES.failAt}：工作有 {Math.round(RULES.failChance * 100)}% 機率失誤（效果歸零）
                  </p>
                )}
                {preview.tenseRisk && (
                  <p className="text-[#7c4209]" data-testid="risk-tense">
                    • 壓力 ≥ {RULES.tenseAt}「焦躁」：能力值 ×{RULES.tenseMul}（已計入預期）
                  </p>
                )}
                {preview.tiredRisk && (
                  <p className="text-[#7c4209]">
                    • 體力 &lt; {RULES.tiredBelow}：能力值減半（已計入預期）
                  </p>
                )}
              </div>
            </StickyNote>
          ) : (
            <StickyNote color="mint" rotate={0.6} attach="tape" tapeColor="sky" className="px-3.5 py-2.5">
              <p className="font-title text-[15px] font-bold leading-snug text-ink-body">
                {filledSlots.length < 4
                  ? '備忘：點選左側貼紙或按「推薦排程」填滿星期一～四。'
                  : '備忘：本週體力與壓力穩健，可以安心執行排程！'}
              </p>
            </StickyNote>
          )}

          {/* 底部啟動按鈕 */}
          <button
            type="button"
            disabled={filledSlots.length < 4}
            onClick={execute}
            data-testid="schedule-go"
            className={
              filledSlots.length === 4
                ? 'mat-pass-btn w-full justify-center py-2.5 font-title text-[19px] font-bold'
                : 'w-full cursor-not-allowed rounded-[6px] border-2 border-dashed border-[#b29873] bg-[#ebdcb9]/75 py-2.5 font-title text-[16.5px] font-bold text-ink-muted'
            }
          >
            {filledSlots.length === 4 ? (
              <>
                <span>開始執行本週排程（4/4）</span>
                <span aria-hidden="true" className="text-[#ffe39b]">→</span>
              </>
            ) : (
              `請先排滿星期一～四（${filledSlots.length}/4）`
            )}
          </button>
        </Paper>
      </div>
    </div>
  )
}
