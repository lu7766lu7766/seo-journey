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
  stripe: string
  rotate: number
}

const ACTIVITY_STICKER: Record<ActivityId, StickerStyle> = {
  write: { bg: '#fff7ec', stripe: '#c25e28', rotate: -0.7 },
  research: { bg: '#f1f7ff', stripe: '#2f5d8c', rotate: 0.6 },
  techcheck: { bg: '#eef9f7', stripe: '#1e7874', rotate: 0.5 },
  schema: { bg: '#f6f2ff', stripe: '#5b4b99', rotate: -0.6 },
  qa: { bg: '#fff5ea', stripe: '#b45309', rotate: -0.5 },
  authors: { bg: '#fefae8', stripe: '#8f6514', rotate: 0.7 },
  social: { bg: '#fff1f5', stripe: '#b33b62', rotate: 0.5 },
  rest: { bg: '#eef9f1', stripe: '#2d7355', rotate: -0.6 },
}

const SLOT_ROTATES = [-1.0, 0.9, -0.8, 1.0] as const

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
            {/* 頂部頁首與星期一～四頁籤進度 */}
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#c7b699] pb-2.5">
              <div className="flex items-center gap-2.5">
                <RoomBadge label={`第 ${s.week} 週`} />
                <span className="font-title text-[24px] font-bold leading-tight text-ink-body">
                  {WEEKDAYS[stepIdx]} · {def.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
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
                      className={`flex items-center gap-1 rounded-[3px] border px-2.5 py-1 text-[13px] font-bold transition ${
                        current
                          ? 'border-[var(--color-stamp)] bg-[#fff4f1] text-[var(--color-stamp)] shadow-[0_2px_4px_rgba(38,18,6,0.12)]'
                          : done
                            ? 'border-[#89c4a8] bg-[#e5f5ec] text-[#225c42]'
                            : 'border-[#d6c7ae] bg-[#f4ebd7]/80 text-ink-muted'
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

            {/* 手帳每日記事與數值變化 */}
            <div className="rounded-[3px] border border-[#d5c5ab] bg-[#fffdf8]/90 px-5 py-3 shadow-[0_2px_6px_rgba(38,18,6,0.08)]">
              {(out.status === 'fail' || out.status === 'infirmary' || (out.status === 'ok' && (out.halfTired || out.tense))) && (
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
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
                      className="inline-block rounded-[2px] border border-[#dc9aa8] bg-[#ffe7ec] px-2.5 py-0.5 text-[13.5px] font-bold text-[#a32236]"
                      data-testid="tired-badge"
                    >
                      體力不足：能力值減半
                    </span>
                  )}
                  {out.tense && out.status === 'ok' && (
                    <span
                      className="inline-block rounded-[2px] border border-[#d9b36c] bg-[#fff2cc] px-2.5 py-0.5 text-[13.5px] font-bold text-[#7a4b0b]"
                      data-testid="tense-badge"
                    >
                      焦躁中：能力值 ×{RULES.tenseMul}
                    </span>
                  )}
                </div>
              )}

              <p className="font-title text-[19px] font-semibold leading-snug text-ink-body">{out.caption}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {STAT_KEYS.map((k, kIdx) =>
                  out.statDelta[k] ? (
                    <motion.span
                      key={k}
                      initial={{ scale: 0.72, y: 6, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{ delay: 0.08 + kIdx * 0.05, type: 'spring', stiffness: 320, damping: 18 }}
                      className="rounded-[2px] border border-[#8dc9ad] bg-[#dcf4e8] px-2.5 py-0.5 font-sans text-[14.5px] font-bold text-[#1d5b3f]"
                    >
                      {STAT_SHORT[k]} +{out.statDelta[k]}
                    </motion.span>
                  ) : null,
                )}
                {out.staminaDelta !== 0 && (
                  <span
                    className={`rounded-[2px] border px-2.5 py-0.5 font-sans text-[14px] font-bold ${
                      out.staminaDelta > 0
                        ? 'border-[#8dc9ad] bg-[#e2f7ec] text-[#1d5b3f]'
                        : 'border-[#cbbca3] bg-[#f4ead6] text-ink-body'
                    }`}
                  >
                    體力 {out.staminaDelta > 0 ? `+${out.staminaDelta}` : out.staminaDelta}
                  </span>
                )}
                {out.stressDelta !== 0 && (
                  <span
                    className={`rounded-[2px] border px-2.5 py-0.5 font-sans text-[14px] font-bold ${
                      out.stressDelta < 0
                        ? 'border-[#9ec4e2] bg-[#e5f2fc] text-[#1f4f78]'
                        : 'border-[#dfbb81] bg-[#fdf0d5] text-[#854a0e]'
                    }`}
                  >
                    壓力 {out.stressDelta > 0 ? `+${out.stressDelta}` : out.stressDelta}
                  </span>
                )}
              </div>
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
                          <span className="rounded-[2px] border border-[var(--color-stamp)] bg-[#fff8eb] px-2 py-0.5 font-sans text-[13.5px] font-bold text-[var(--color-stamp)]">
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
                <div className="space-y-1 text-[14.5px] leading-snug">
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
                  className="mat-washi-btn px-4 py-1.5 text-[14.5px]"
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
        {/* 左頁：星期一～四週計畫格 + 8 張活動貼紙 */}
        <Paper
          tone="cream"
          rule="grid"
          curled={false}
          className="flex min-h-0 flex-1 flex-col rounded-r-none border-r-0 px-5 py-3.5"
        >
          {/* 左頁表頭 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <RoomBadge label="404" />
              <h2 className="font-title text-[24px] font-bold leading-tight text-ink-body">
                第 {s.week} 週 · 社團週計畫
              </h2>
              {theme && (
                <span className="inline-flex items-center gap-1 rounded-[2px] border border-[#cfb589] bg-[#f7e7c4] px-2.5 py-0.5 text-[13px] font-bold text-[#7c5338]">
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

          {/* 四天週計畫欄位：星期一～星期四 */}
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
                  className={`group flex h-[104px] flex-col rounded-[3px] border text-left transition ${
                    isDropTarget
                      ? 'border-[#2f5d8c] bg-[#e9f3fc] ring-2 ring-[#2f5d8c]/35'
                      : def
                        ? 'border-[#bda889] bg-[#f8f0dc]/90 hover:border-[#8f6c44]'
                        : 'border-dashed border-[#bfa989] bg-[#fbf6eb]/65 hover:border-[#8f6c44] hover:bg-[#f7eedb]'
                  } focus-visible:outline-3 focus-visible:outline-[#2b6ea8] focus-visible:outline-offset-2`}
                >
                  <div className="flex items-center justify-between rounded-t-[2px] border-b border-dashed border-[#cab797] bg-[#efe2c6]/85 px-2.5 py-1">
                    <span className="font-title text-[14.5px] font-bold text-ink-body">{WEEKDAYS[idx]}</span>
                    <span className="font-sans text-[13px] font-bold tracking-wider text-ink-muted">
                      {WEEKDAYS_EN[idx]}
                    </span>
                  </div>

                  <div className="flex min-h-0 flex-1 items-center justify-center p-2">
                    {def && st ? (
                      <div
                        className="relative flex h-full w-full flex-col justify-between rounded-[3px] border-2 border-[#fffdf8] px-2.5 py-1 shadow-[0_2px_6px_rgba(38,18,6,0.18)]"
                        style={{
                          backgroundColor: st.bg,
                          borderLeftWidth: '5px',
                          borderLeftColor: st.stripe,
                          transform: `rotate(${SLOT_ROTATES[idx]}deg)`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-title text-[16.5px] font-bold leading-tight text-ink-body">
                            {def.short}
                          </span>
                          {themed && (
                            <span className="shrink-0 font-sans text-[13px] font-bold text-[var(--color-stamp)]">
                              ★×1.5
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] font-semibold text-ink-muted group-hover:text-[var(--color-stamp)]">
                          點此撕下
                        </span>
                      </div>
                    ) : (
                      <span className="font-title text-[14px] text-ink-muted/85">點選貼紙填入</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 貼紙收納區導引 */}
          <div className="mt-2.5 mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[13.5px] font-bold text-ink-muted">
              活動貼紙（點擊依序貼入，或拖放至星期一～四）
            </span>
            <span className="text-[13px] font-bold text-[var(--color-stamp)]">★ 本週主題 ×1.5 加成</span>
          </div>

          {/* 8 項活動貼紙 */}
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-4 gap-2">
            {ACTIVITY_LIST.map((a) => {
              const themed = isThemedActivity(s.week, a.id)
              const st = ACTIVITY_STICKER[a.id]
              return (
                <button
                  key={a.id}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                  onClick={() => assignNext(a.id)}
                  data-testid={`act-${a.id}`}
                  className={`mat-sticker flex flex-col justify-between overflow-hidden px-3 py-1.5 pl-3.5 text-left ${
                    themed ? 'ring-1 ring-[var(--color-stamp)]/75' : ''
                  }`}
                  style={
                    {
                      '--mat-rot': `${st.rotate}deg`,
                      backgroundColor: st.bg,
                    } as CSSProperties
                  }
                >
                  {/* 左側彩色紙膠帶色條 */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-[5px]"
                    style={{ backgroundColor: st.stripe }}
                  />

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-title text-[16px] font-bold leading-tight text-ink-body">
                        {a.name}
                      </span>
                      {themed && (
                        <span className="shrink-0 rounded-[2px] border border-[var(--color-stamp)]/65 bg-[#fff2ef] px-1.5 py-px font-sans text-[13px] font-bold leading-none text-[var(--color-stamp)]">
                          ★ ×1.5
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-[1.32] text-ink-muted" title={a.desc}>
                      {a.desc}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 font-sans text-[13px] font-bold leading-tight">
                    {STAT_KEYS.map((k) =>
                      a.stats[k] ? (
                        <span key={k} className="rounded-[2px] bg-[#d8f1e4] px-1.5 py-px text-[#1c593e]">
                          {STAT_SHORT[k]}+{themed ? Math.round(a.stats[k]! * 1.5) : a.stats[k]}
                        </span>
                      ) : null,
                    )}
                    <span
                      className={`rounded-[2px] px-1.5 py-px ${
                        a.stamina >= 0 ? 'bg-[#d8f1e4] text-[#1c593e]' : 'bg-[#f1e5cd] text-ink-body'
                      }`}
                    >
                      體力{a.stamina >= 0 ? `+${a.stamina}` : a.stamina}
                    </span>
                    <span
                      className={`rounded-[2px] px-1.5 py-px ${
                        a.stress < 0 ? 'bg-[#ddeefb] text-[#1d507a]' : 'bg-[#fae7ca] text-[#85460c]'
                      }`}
                    >
                      壓力{a.stress >= 0 ? `+${a.stress}` : a.stress}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </Paper>

        {/* 中央手帳金屬雙線圈 */}
        <NotebookBindingRings />

        {/* 右頁：社團手帳現況、預期變化、便利貼風險提醒與啟動按鈕 */}
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

          {/* 體力與壓力手繪刻度尺 */}
          <div className="grid grid-cols-2 gap-2.5 rounded-[3px] border border-[#d6c6aa] bg-[#fffdf8]/88 px-3 py-2">
            <div>
              <div className="flex items-baseline justify-between text-[13.5px] font-bold">
                <span className="text-ink-body">體力</span>
                <span className={preview.infirmaryRisk || preview.stamina < 20 ? 'text-[var(--color-stamp)]' : 'text-[#205e42]'}>
                  {s.stamina}
                  {filledSlots.length > 0 && ` → ${preview.infirmaryRisk ? `0→${preview.stamina}` : preview.stamina}`}
                </span>
              </div>
              <div className="relative mt-1 h-2.5 overflow-hidden rounded-[2px] border border-[#cbbba0] bg-[#efe5d0]">
                <div
                  className="h-full bg-[#398967] transition-all"
                  style={{ width: `${filledSlots.length > 0 ? preview.stamina : s.stamina}%` }}
                />
                <span aria-hidden="true" className="absolute inset-y-0 left-[20%] w-px bg-[var(--color-stamp)]/55" />
                <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-[#8f7958]/40" />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between text-[13.5px] font-bold">
                <span className="flex items-center gap-1 text-ink-body">
                  <span>壓力</span>
                  {s.stress >= RULES.tenseAt && (
                    <span
                      className="rounded-[2px] bg-[#fde2dc] px-1 text-[13px] font-bold text-[var(--color-stamp)]"
                      data-testid="stress-tier"
                    >
                      {s.stress >= RULES.failAt ? '過高' : '焦躁'}
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
              <div className="relative mt-1 h-2.5 overflow-hidden rounded-[2px] border border-[#cbbba0] bg-[#efe5d0]">
                <div
                  className="h-full bg-[#c9623b] transition-all"
                  style={{ width: `${filledSlots.length > 0 ? preview.stress : s.stress}%` }}
                />
                <span aria-hidden="true" className="absolute inset-y-0 left-[60%] w-px bg-[#9e4f0c]/60" />
                <span aria-hidden="true" className="absolute inset-y-0 left-[80%] w-px bg-[var(--color-stamp)]/75" />
              </div>
            </div>
          </div>

          {/* 網站屬性預期手寫表 + 夥伴好感 */}
          <div className="rounded-[3px] border border-[#d6c6aa] bg-[#fffdf8]/90 px-3 py-2">
            <div className="space-y-1.5">
              {STAT_KEYS.map((k) => {
                const nowVal = s.stats[k]
                const gain = preview.stats[k]
                const nextVal = Math.min(100, nowVal + gain)
                return (
                  <div key={k} className="flex items-center gap-2 text-[13.5px]">
                    <span className="w-[46px] shrink-0 font-bold text-ink-body">{STAT_LABEL[k]}</span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-[2px] border border-[#d2c3aa] bg-[#f2e8d4]">
                      <div className="h-full bg-[#2f5d8c]" style={{ width: `${nowVal}%` }} />
                      {gain > 0 && (
                        <div
                          className="absolute inset-y-0 bg-[#48a87e]"
                          style={{ left: `${nowVal}%`, width: `${nextVal - nowVal}%` }}
                        />
                      )}
                    </div>
                    <span className="w-[62px] shrink-0 text-right font-sans font-bold text-ink-body">
                      {nowVal}
                      {gain > 0 && <span className="ml-1 text-[#246e4c]">+{gain}</span>}
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
              <p className="font-title text-[14.5px] font-bold leading-snug text-ink-body">
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
