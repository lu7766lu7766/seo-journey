import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Background } from '@/art/backgrounds'
import { CharacterAvatar } from '@/art/characters/Avatar'
import { ActivityChibi } from '@/art/chibi/ActivityChibi'
import { audio } from '@/audio'
import { ACTIVITIES, ACTIVITY_LIST, RECOMMENDED_SCHEDULE } from '@/content/activities'
import type { ActivityId } from '@/content/activityIds'
import { CHARACTERS, type CharId } from '@/content/characters'
import { STAT_KEYS, type StatKey } from '@/engine/types'
import { useGame } from '@/store/game'
import { isThemedActivity, previewSchedule, runWeekSchedule, type WeekScheduleResult } from '@/systems/schedule'
import { StatusSummary } from './StatusPanel'

const STAT_SHORT: Record<StatKey, string> = {
  con: '內容',
  tec: '技術',
  str: '結構',
  ans: '可答',
  tru: '信任',
}

export function ScheduleScreen() {
  const s = useGame()
  const [slots, setSlots] = useState<(ActivityId | null)[]>([null, null, null, null])
  const [result, setResult] = useState<WeekScheduleResult | null>(null)
  const [stepIdx, setStepIdx] = useState(0)

  const filledSlots = slots.filter((x): x is ActivityId => x !== null)
  const preview = previewSchedule(s, s.week, filledSlots)

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

  if (result) {
    const out = result.outcomes[stepIdx]
    const def = ACTIVITIES[out.activityId]
    const isLast = stepIdx >= result.outcomes.length - 1
    const chatterChar = out.chatter && CHARACTERS[out.chatter.who].hasSprite ? (out.chatter.who as CharId) : null
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-6" data-testid="schedule-playback">
        <Background id="clubroom" time="day" />
        <div className="pointer-events-none absolute inset-0 bg-[#0c1228]/52 backdrop-blur-[2px]" />
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass relative z-10 flex w-[840px] max-h-[676px] flex-col gap-3.5 rounded-3xl p-6"
        >
          {/* Header + 4-Slot Progress Stepper */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-ink px-4 py-1 text-sm font-bold text-white">
                第 {s.week} 週 · 行程 {stepIdx + 1} / 4
              </span>
              <span className="font-title text-2xl font-bold text-ink">{def.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {result.outcomes.map((item, idx) => {
                const done = idx < stepIdx
                const current = idx === stepIdx
                const icon =
                  item.status === 'fail' ? '✕' : item.status === 'infirmary' || item.status === 'skipped' ? '✚' : done ? '✓' : `${idx + 1}`
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                      current
                        ? 'bg-gradient-to-r from-[#d6334a] to-[#f07b3f] text-white shadow'
                        : done
                          ? 'bg-mint/80 text-ink'
                          : 'bg-white/65 text-ink/55'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{ACTIVITIES[item.activityId].short}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Q版 Japanese Anime Animated Chibi Stage */}
          <ActivityChibi outcome={out} />

          {/* Result Caption & Animated Stat Popups */}
          <div className="rounded-2xl bg-white/88 px-5 py-3.5 shadow-sm">
            {out.status === 'fail' && <p className="mb-1 text-sm font-bold text-[#d6334a]">壓力過高造成失誤！（效果 0）</p>}
            {out.status === 'infirmary' && <p className="mb-1 text-sm font-bold text-[#d6334a]">體力歸零！被送進保健室，剩餘排程作廢。</p>}
            <p className="font-title text-xl leading-snug text-[#251e38]">{out.caption}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {STAT_KEYS.map((k, kIdx) =>
                out.statDelta[k] ? (
                  <motion.span
                    key={k}
                    initial={{ scale: 0.7, y: 6, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ delay: 0.08 + kIdx * 0.05, type: 'spring', stiffness: 320, damping: 18 }}
                    className="rounded-full bg-mint/85 px-3 py-0.5 text-sm font-bold text-ink shadow-xs"
                  >
                    {STAT_SHORT[k]} +{out.statDelta[k]}
                  </motion.span>
                ) : null,
              )}
              {out.staminaDelta !== 0 && (
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                    out.staminaDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  體力 {out.staminaDelta > 0 ? `+${out.staminaDelta}` : out.staminaDelta}
                </span>
              )}
              {out.stressDelta !== 0 && (
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                    out.stressDelta < 0 ? 'bg-sky/35 text-ink' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  壓力 {out.stressDelta > 0 ? `+${out.stressDelta}` : out.stressDelta}
                </span>
              )}
            </div>
          </div>

          {out.chatter && (
            <motion.div
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.14 }}
              className="flex items-center gap-3.5 rounded-2xl border-2 border-sakura/75 bg-white/92 px-4 py-3 shadow-sm"
            >
              {chatterChar && <CharacterAvatar id={chatterChar} size={48} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: CHARACTERS[out.chatter.who].color }}>
                    小插曲 · {CHARACTERS[out.chatter.who].name}
                  </p>
                  {out.chatter.bond && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-[#d6334a]">好感 +1 ♥</span>
                  )}
                </div>
                <p className="mt-0.5 font-title text-base text-[#251e38]">{out.chatter.text.replace(/\{name\}/g, s.playerName)}</p>
              </div>
            </motion.div>
          )}

          {out.status === 'infirmary' && result.infirmaryLines.length > 0 && (
            <div className="space-y-1 rounded-2xl border border-emerald-200 bg-mint/35 px-4 py-2.5 text-sm">
              {result.infirmaryLines.slice(0, 3).map((l, i) => (
                <p key={i}>
                  <strong>{CHARACTERS[l.who].name}：</strong>
                  {l.text}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              className="rounded-full bg-gradient-to-r from-[#d6334a] to-[#f07b3f] px-8 py-2.5 text-lg font-bold text-white shadow-md transition hover:brightness-110"
              data-testid="schedule-next"
              onClick={() => {
                if (!isLast) setStepIdx((v) => v + 1)
                else s.commitScheduleResult(result.nextState)
              }}
            >
              {isLast ? '前往放學後委託 →' : '下一格 →'}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full gap-5 overflow-hidden p-6" data-testid="schedule-screen">
      <Background id="clubroom" time="day" />
      <div className="pointer-events-none absolute inset-0 bg-[#0c1228]/45 backdrop-blur-[2px]" />
      {/* Left: Activity picker & 4 slots */}
      <div className="relative z-10 flex flex-1 flex-col gap-4">
        <div className="glass flex items-center justify-between rounded-2xl px-5 py-3">
          <div>
            <h2 className="font-title text-2xl font-bold">第 {s.week} 週 · 平日排程</h2>
            <p className="text-sm text-ink/75">點擊或拖放活動填滿 4 個時段（帶 ★ 為本週主題 ×1.5 加成）</p>
          </div>
          <button className="btn-pastel text-sm" onClick={autoFill}>推薦排程</button>
        </div>

        {/* 4 Slots */}
        <div className="grid grid-cols-4 gap-3">
          {slots.map((id, idx) => {
            const def = id ? ACTIVITIES[id] : null
            const themed = id ? isThemedActivity(s.week, id) : false
            return (
              <button
                key={idx}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const dropped = e.dataTransfer.getData('text/plain') as ActivityId
                  if (dropped && ACTIVITIES[dropped]) {
                    setSlots((prev) => prev.map((v, i) => (i === idx ? dropped : v)))
                  }
                }}
                onClick={() => clearSlot(idx)}
                data-testid={`slot-box-${idx}`}
                className="glass flex h-24 flex-col items-center justify-center rounded-2xl p-2 text-center hover:brightness-105"
              >
                <span className="text-xs font-bold text-ink/60">時段 {idx + 1}</span>
                {def ? (
                  <>
                    <span className="mt-1 font-title text-lg font-bold">
                      {themed ? '★ ' : ''}
                      {def.short}
                    </span>
                    <span className="text-xs text-ink/65">點此清除</span>
                  </>
                ) : (
                  <span className="mt-1 text-sm text-ink/40">（空）</span>
                )}
              </button>
            )
          })}
        </div>

        {/* 8 Activities */}
        <div className="grid flex-1 grid-cols-2 gap-2.5 overflow-y-auto pr-1">
          {ACTIVITY_LIST.map((a) => {
            const themed = isThemedActivity(s.week, a.id)
            return (
              <button
                key={a.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                onClick={() => assignNext(a.id)}
                data-testid={`act-${a.id}`}
                className={`glass flex flex-col justify-between rounded-2xl p-3 text-left transition hover:scale-[1.01] ${
                  themed ? 'ring-2 ring-[#d6334a]/70' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-title text-base font-bold leading-tight">
                      {themed && <span className="mr-1 text-[#d6334a]">★</span>}
                      {a.name}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-ink/70" title={a.desc}>{a.desc}</p>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs font-bold">
                  {STAT_KEYS.map((k) =>
                    a.stats[k] ? (
                      <span key={k} className="rounded-full bg-sky/35 px-2 py-0.5">
                        {STAT_SHORT[k]}+{themed ? Math.round(a.stats[k]! * 1.5) : a.stats[k]}
                      </span>
                    ) : null,
                  )}
                  <span className="rounded-full bg-white/80 px-2 py-0.5">
                    體力{a.stamina >= 0 ? `+${a.stamina}` : a.stamina}
                  </span>
                  <span className="rounded-full bg-white/80 px-2 py-0.5">
                    壓力{a.stress >= 0 ? `+${a.stress}` : a.stress}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: Status & Pinned Live Preview + Submit CTA */}
      <div className="glass relative z-10 flex h-full min-h-0 w-[420px] flex-col rounded-3xl p-4">
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          <StatusSummary compact />
        </div>

        <div className="mt-2.5 shrink-0 space-y-2.5 border-t border-ink/10 pt-2.5">
          <div className="rounded-2xl border border-ink/10 bg-white/85 p-3 text-sm shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-ink">預期變化</span>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className={`rounded-full px-2.5 py-0.5 ${preview.stamina < 20 ? 'bg-rose-100 text-[#d6334a]' : 'bg-emerald-50 text-emerald-800'}`}>
                  體力 → {preview.stamina}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 ${preview.stress >= 80 ? 'bg-rose-100 text-[#d6334a]' : 'bg-amber-50 text-amber-900'}`}>
                  壓力 → {preview.stress}
                </span>
              </div>
            </div>

            <div className="mt-2 flex min-h-[26px] flex-wrap items-center gap-1.5">
              {STAT_KEYS.some((k) => preview.stats[k] > 0) ? (
                STAT_KEYS.map((k) =>
                  preview.stats[k] > 0 ? (
                    <span key={k} className="rounded-full bg-mint/70 px-2.5 py-0.5 text-xs font-bold text-ink">
                      {STAT_SHORT[k]} +{preview.stats[k]}
                    </span>
                  ) : null,
                )
              ) : (
                <span className="text-xs text-ink/55">點選左側活動或「推薦排程」填滿 4 格</span>
              )}
            </div>

            {(preview.infirmaryRisk || preview.failRisk) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preview.infirmaryRisk && (
                  <span className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-[#d6334a]">
                    ⚠ 體力將歸零，可能進保健室！
                  </span>
                )}
                {preview.failRisk && (
                  <span className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-[#d6334a]">
                    ⚠ 壓力 ≥ 80，有機率失誤！
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            disabled={filledSlots.length < 4}
            onClick={execute}
            data-testid="schedule-go"
            className={`w-full rounded-full py-3 text-lg font-bold transition ${
              filledSlots.length === 4
                ? 'bg-gradient-to-r from-[#d6334a] to-[#f07b3f] text-white shadow-lg hover:brightness-110'
                : 'border-2 border-ink/20 bg-white/70 text-ink/50 cursor-not-allowed'
            }`}
          >
            {filledSlots.length === 4 ? '▶ 開始執行本週排程（4/4）' : `請先排滿 4 個時段（${filledSlots.length}/4）`}
          </button>
        </div>
      </div>
    </div>
  )
}
