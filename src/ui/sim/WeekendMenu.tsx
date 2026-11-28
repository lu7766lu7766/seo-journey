import { useState } from 'react'
import { Background } from '@/art/backgrounds'
import { CharacterSprite } from '@/art/characters'
import { CHARACTERS } from '@/content/characters'
import { HEROINES } from '@/engine/types'
import { useGame } from '@/store/game'
import { getDateCount, pickDateScene } from '@/systems/ending'
import { INFIRMARY_WEEK_FLAG, WEEKEND } from '@/systems/schedule'
import { scoreParts } from '@/systems/score'

/** a cozy house + moon, standing in for a character sprite on the 「在家休息」 card */
function RestIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="h-full" aria-hidden="true">
      <circle cx="150" cy="48" r="22" fill="#fff3c4" />
      <g fill="#fff" opacity="0.9">
        <circle cx="38" cy="40" r="2.5" /><circle cx="70" cy="24" r="2" /><circle cx="108" cy="52" r="2.5" /><circle cx="22" cy="78" r="2" />
      </g>
      <path d="M32 112 L100 56 L168 112 Z" fill="#e8a4ba" stroke="#b9708a" strokeWidth="3" strokeLinejoin="round" />
      <rect x="46" y="110" width="108" height="64" rx="4" fill="#fff7ee" stroke="#c9a98a" strokeWidth="3" />
      <rect x="86" y="132" width="28" height="42" rx="3" fill="#b98a62" />
      <rect x="58" y="124" width="22" height="22" rx="2" fill="#ffe599" stroke="#c9a98a" strokeWidth="2" />
      <rect x="120" y="124" width="22" height="22" rx="2" fill="#ffe599" stroke="#c9a98a" strokeWidth="2" />
      <text x="146" y="104" fontSize="20" fontWeight="700" fill="#9fd3f0" fontFamily="sans-serif">z</text>
      <text x="160" y="88" fontSize="14" fontWeight="700" fill="#9fd3f0" fontFamily="sans-serif">z</text>
    </svg>
  )
}

export function WeekendMenu() {
  const s = useGame()
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
    <div className="relative flex h-full w-full flex-col overflow-hidden px-8 pb-6 pt-14" data-testid="weekend-menu">
      <Background id="street" time="day" />
      <div className="pointer-events-none absolute inset-0 bg-[#0d1430]/45 backdrop-blur-[2px]" />
      <div className="vn-box relative z-10 rounded-2xl px-6 py-4 text-white">
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
        </div>
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-4 gap-4 pt-4">
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
              <div className="pointer-events-none absolute inset-x-0 top-2 flex h-[300px] justify-center opacity-95 transition group-hover:scale-105">
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

        <button
          type="button"
          disabled={busy}
          data-testid="weekend-rest"
          onClick={() => void pickRest()}
          className={`glass group relative flex flex-col items-center justify-end overflow-hidden rounded-3xl p-5 text-center transition hover:ring-2 hover:ring-sakura disabled:opacity-60 ${locked ? 'ring-2 ring-[#9fd3f0]' : ''}`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-2 flex h-[300px] items-center justify-center transition group-hover:scale-105">
            <RestIllustration />
          </div>
          <div className="relative z-10 w-full rounded-2xl bg-white/92 p-4 shadow-md">
            <p className="font-title text-2xl font-bold text-[#3b5a8a]">在家休息</p>
            <p className="mt-1 text-sm font-bold text-ink/80" data-testid="weekend-rest-effect">
              體力 +{WEEKEND.rest.stamina}、壓力 {WEEKEND.rest.stress < 0 ? '−' : '+'}{Math.abs(WEEKEND.rest.stress)}
            </p>
            <p className="mt-0.5 text-xs font-bold text-ink/70">不出門，好好充電</p>
            <p className="mt-1 text-xs text-ink/65">{locked ? '這週只能選這個' : '留在家裡補充體力、舒緩壓力'}</p>
          </div>
        </button>
      </div>
    </div>
  )
}
