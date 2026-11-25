import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Background } from '@/art/backgrounds'
import { audio } from '@/audio'
import { ACTIVITIES, ACTIVITY_LIST, WEEK_THEMES } from '@/content/activities'
import type { ActivityId } from '@/content/activityIds'
import { CHARACTERS } from '@/content/characters'
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

  const theme = WEEK_THEMES[s.week]
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
    const bonus = theme?.bonusActivities[0] ?? 'write'
    setSlots([bonus, 'research', 'authors', 'rest'])
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
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-8" data-testid="schedule-playback">
        <Background id="clubroom" time="day" />
        <div className="pointer-events-none absolute inset-0 bg-[#0c1228]/50 backdrop-blur-[2px]" />
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass relative z-10 flex w-[760px] flex-col gap-5 rounded-3xl p-8"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-ink px-4 py-1 text-sm font-bold text-white">
              第 {s.week} 週 · 行程 {stepIdx + 1} / 4
            </span>
            <span className="font-title text-xl font-bold">{def.name}</span>
          </div>

          <div className="rounded-2xl bg-white/85 p-5">
            {out.status === 'fail' && <p className="mb-2 text-sm font-bold text-[#d6334a]">壓力過高造成失誤！（效果 0）</p>}
            {out.status === 'infirmary' && <p className="mb-2 text-sm font-bold text-[#d6334a]">體力歸零！被送進保健室，剩餘排程作廢。</p>}
            <p className="font-title text-2xl leading-relaxed text-[#251e38]">{out.caption}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {STAT_KEYS.map((k) =>
                out.statDelta[k] ? (
                  <span key={k} className="rounded-full bg-mint/70 px-3 py-1 text-sm font-bold">
                    {STAT_SHORT[k]} +{out.statDelta[k]}
                  </span>
                ) : null,
              )}
              {out.themed && out.status === 'ok' && <span className="rounded-full bg-sakura/60 px-3 py-1 text-sm font-bold">本週主題 ×1.5</span>}
              {out.halfTired && out.status === 'ok' && <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold">疲勞減半</span>}
            </div>
          </div>

          {out.chatter && (
            <div className="rounded-2xl border-2 border-sakura/70 bg-white/90 p-4">
              <p className="text-sm font-bold" style={{ color: CHARACTERS[out.chatter.who].color }}>
                小插曲 · {CHARACTERS[out.chatter.who].name}
              </p>
              <p className="mt-1 font-title text-lg">{out.chatter.text.replace(/\{name\}/g, s.playerName)}</p>
            </div>
          )}

          {out.status === 'infirmary' && result.infirmaryLines.length > 0 && (
            <div className="space-y-1 rounded-2xl bg-mint/30 p-4 text-sm">
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
              className="btn-pastel px-8 py-2.5 text-xl"
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
                <div className="flex items-center justify-between gap-2">
                  <span className="font-title text-lg font-bold">
                    {themed && <span className="mr-1 text-[#d6334a]">★</span>}
                    {a.name}
                  </span>
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

      {/* Right: Status & Live Preview */}
      <div className="glass relative z-10 flex w-[410px] flex-col justify-between rounded-3xl p-4">
        <StatusSummary compact />

        <div className="mt-2 space-y-1.5 rounded-2xl bg-white/75 p-2.5 text-sm">
          <div className="font-bold">預期變化：</div>
          <div className="flex flex-wrap gap-1.5">
            {STAT_KEYS.map((k) =>
              preview.stats[k] > 0 ? (
                <span key={k} className="rounded-full bg-mint/60 px-2.5 py-0.5 font-bold">
                  {STAT_SHORT[k]} +{preview.stats[k]}
                </span>
              ) : null,
            )}
            <span>預估體力 {preview.stamina}</span>
            <span>· 預估壓力 {preview.stress}</span>
          </div>
          {preview.infirmaryRisk && <p className="font-bold text-[#d6334a]">⚠ 體力將歸零，可能進保健室！</p>}
          {preview.failRisk && <p className="font-bold text-[#d6334a]">⚠ 壓力 ≥ 80，有機率失誤！</p>}
        </div>

        <button
          disabled={filledSlots.length < 4}
          onClick={execute}
          data-testid="schedule-go"
          className="btn-pastel mt-3 py-3 text-xl disabled:opacity-40"
        >
          開始執行本週排程（{filledSlots.length}/4）
        </button>
      </div>
    </div>
  )
}
