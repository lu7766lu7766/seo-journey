import { CharacterSprite } from '@/art/characters'
import { CHARACTERS } from '@/content/characters'
import { HEROINES } from '@/engine/types'
import { useGame } from '@/store/game'
import { getDateCount, pickDateScene } from '@/systems/ending'
import { score } from '@/systems/score'

export function WeekendMenu() {
  const s = useGame()

  return (
    <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-sakura/25 via-cream to-sky/30 p-8" data-testid="weekend-menu">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-title text-3xl font-bold">第 {s.week} 週 · 週末自由行動</h2>
          <p className="text-base text-ink/75">邀請一位夥伴出門，或留在家裡好好休息（體力 +25、壓力 -15）</p>
        </div>
        <button className="btn-pastel px-6 py-2.5 text-lg" data-testid="weekend-rest" onClick={() => void s.startWeekendRest()}>
          在家休息
        </button>
      </div>

      <div className="grid flex-1 grid-cols-3 gap-6 py-6">
        {HEROINES.map((h) => {
          const c = CHARACTERS[h]
          const count = getDateCount(h, s)
          const sc = Math.round(score(h, s.stats, s.bond))
          const pick = pickDateScene(h, s)
          const lockedStage3 = count === 2 && sc < 55
          return (
            <button
              key={h}
              data-testid={`date-${h}`}
              onClick={() => void s.startWeekendDate(h)}
              className="glass group relative flex flex-col items-center justify-end overflow-hidden rounded-3xl p-5 text-center transition hover:scale-[1.02]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-2 flex h-[340px] justify-center opacity-95 transition group-hover:scale-105">
                <CharacterSprite id={h} face="smile" />
              </div>
              <div className="relative z-10 w-full rounded-2xl bg-white/92 p-4 shadow-md">
                <p className="font-title text-2xl font-bold" style={{ color: c.color }}>
                  {c.name}
                </p>
                <p className="mt-1 text-sm font-bold text-ink/80">
                  好感度 ♥ {sc} · 已約會 {count} 次
                </p>
                <p className="mt-1 text-xs text-ink/65">
                  {lockedStage3
                    ? '第 3 階段約會需好感度 ≥ 55（本次為普通相處）'
                    : pick.stage === 'casual'
                      ? '進行普通相處'
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
