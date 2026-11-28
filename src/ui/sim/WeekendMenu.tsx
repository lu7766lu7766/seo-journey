import { useState } from 'react'
import { Background } from '@/art/backgrounds'
import { CharacterSprite } from '@/art/characters'
import { CHARACTERS } from '@/content/characters'
import { HEROINES } from '@/engine/types'
import { useGame } from '@/store/game'
import { useUI } from '@/store/ui'
import { getDateCount, pickDateScene } from '@/systems/ending'
import { INFIRMARY_WEEK_FLAG, WEEKEND } from '@/systems/schedule'
import { scoreParts } from '@/systems/score'

export function WeekendMenu() {
  const s = useGame()
  const setOverlay = useUI((u) => u.setOverlay)
  const [busy, setBusy] = useState(false)
  // collapsing in the infirmary this week costs the weekend: only resting at home is possible
  const locked = s.flags[INFIRMARY_WEEK_FLAG] === true

  const pickDate = async (h: (typeof HEROINES)[number]) => {
    if (busy) return
    setBusy(true)
    try {
      await s.startWeekendDate(h)
    } finally {
      setBusy(false)
    }
  }

  const pickRest = async () => {
    if (busy) return
    setBusy(true)
    try {
      await s.startWeekendRest()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden p-8" data-testid="weekend-menu">
      <Background id="street" time="day" />
      <div className="pointer-events-none absolute inset-0 bg-[#0d1430]/45 backdrop-blur-[2px]" />
      <div className="vn-box relative z-10 flex items-center justify-between gap-4 rounded-2xl px-6 py-4 text-white">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-title text-3xl font-bold text-white">第 {s.week} 週 · 週末自由行動</h2>
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${s.stamina < 20 ? 'bg-rose-500/35 text-[#ffd6e2]' : 'bg-emerald-500/25 text-[#b5ead7]'}`}>
              體力 {s.stamina}/100
            </span>
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${s.stress >= 60 ? 'bg-amber-400/30 text-[#ffe599]' : 'bg-white/15 text-[#d5e3ff]'}`}>
              壓力 {s.stress}/100
            </span>
          </div>
          {locked ? (
            <p className="text-base font-bold text-[#ffd6e2]" data-testid="infirmary-lock">
              這週倒下過，週末只能好好休息（約會暫時鎖定）
            </p>
          ) : (
            <p className="text-base text-[#d5e3ff]">邀請一位夥伴出門（不耗體力、壓力 {WEEKEND.dateStress}），或留在家裡好好休息</p>
          )}
          <p className="text-sm text-[#b9cdf2]">
            在家休息：體力 +{WEEKEND.rest.stamina}、壓力 {WEEKEND.rest.stress}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="hud-pill" onClick={() => setOverlay('status')}>狀態</button>
          <button type="button" className="hud-pill" onClick={() => setOverlay('menu')}>選單 (Esc)</button>
          <button disabled={busy} className="btn-pastel px-6 py-2.5 text-lg disabled:opacity-50" data-testid="weekend-rest" onClick={() => void pickRest()}>
            在家休息
          </button>
        </div>
      </div>

      <div className="relative z-10 grid flex-1 grid-cols-3 gap-6 py-6">
        {HEROINES.map((h) => {
          const c = CHARACTERS[h]
          const count = getDateCount(h, s)
          const parts = scoreParts(h, s.stats, s.bond)
          const sc = Math.round(parts.total)
          const site = Math.round(parts.site)
          const bond = Math.round(parts.bond)
          const pick = pickDateScene(h, s)
          const lockedStage3 = count === 2 && pick.stage === 'casual'
          return (
            <button
              key={h}
              disabled={busy || locked}
              data-testid={`date-${h}`}
              onClick={() => void pickDate(h)}
              className={`glass group relative flex flex-col items-center justify-end overflow-hidden rounded-3xl p-5 text-center transition hover:ring-2 hover:ring-sakura disabled:opacity-60 ${locked ? 'grayscale' : ''}`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-2 flex h-[340px] justify-center opacity-95 transition group-hover:scale-105">
                <CharacterSprite id={h} face="smile" />
              </div>
              <div className="relative z-10 w-full rounded-2xl bg-white/92 p-4 shadow-md">
                <p className="font-title text-2xl font-bold" style={{ color: c.color }}>
                  {c.name}
                </p>
                <p className="mt-1 text-sm font-bold text-ink/80" data-testid={`weekend-score-parts-${h}`}>
                  ♥ {sc}（網站 {site}{bond >= 0 ? `＋互動 ${bond}` : `－互動 ${Math.abs(bond)}`}）
                </p>
                <p className="mt-0.5 text-xs font-bold text-ink/70">
                  已約會 {count} 次
                </p>
                <p className="mt-1 text-xs text-ink/65">
                  {locked
                    ? '🔒 這週倒下過，沒辦法赴約'
                    : lockedStage3
                      ? '第 3 階段約會需好感度 ≥ 55（本次為普通相處）'
                      : pick.stage === 'casual'
                        ? '進行普通相處'
                        : count < 2
                          ? `將觸發第 ${pick.stage} 階段約會（第 3 階需 ♥ 55）`
                          : `將觸發第 ${pick.stage} 階段約會`}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
