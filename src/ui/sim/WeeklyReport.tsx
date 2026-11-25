import { motion } from 'motion/react'
import { CHARACTERS } from '@/content/characters'
import { WEEKLY_COMMENTS } from '@/content/flavor'
import { HEROINES, type HeroineId } from '@/engine/types'
import { useGame } from '@/store/game'
import { scores } from '@/systems/score'

function tierFor(v: number): 'low' | 'mid' | 'high' {
  if (v < 40) return 'low'
  if (v < 65) return 'mid'
  return 'high'
}

export function WeeklyReport() {
  const s = useGame()
  const cur = scores(s.stats, s.bond)

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream via-sakura/20 to-sky/30 p-8" data-testid="weekly-report">
      <div className="glass flex w-[880px] flex-col gap-6 rounded-3xl p-8">
        <div className="text-center">
          <h2 className="font-title text-4xl font-bold">第 {s.week} 週 · 週日評測報告</h2>
          <p className="mt-1 text-base text-ink/75">三位評審檢視了網站研究社本週的成果</p>
        </div>

        <div className="space-y-4">
          {HEROINES.map((h: HeroineId, idx) => {
            const c = CHARACTERS[h]
            const prev = Math.round(s.prevScores[h] ?? 10)
            const now = Math.round(cur[h])
            const diff = now - prev
            const comments = WEEKLY_COMMENTS[h][tierFor(now)]
            const line = comments[(s.week + idx) % comments.length]
            return (
              <motion.div
                key={h}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.12 }}
                className="rounded-2xl bg-white/85 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-title text-2xl font-bold" style={{ color: c.color }}>
                    {c.name}
                  </span>
                  <div className="flex items-center gap-3 font-title text-xl font-bold">
                    <span>♥ {now}</span>
                    <span className={diff >= 0 ? 'text-[#2b8a57]' : 'text-[#d6334a]'}>
                      ({diff >= 0 ? `+${diff}` : diff})
                    </span>
                  </div>
                </div>
                <p className="mt-2 font-title text-lg text-[#251e38]">「{line.text.replace(/\{name\}/g, s.playerName)}」</p>
              </motion.div>
            )
          })}
        </div>

        <div className="flex justify-center">
          <button
            className="btn-pastel px-10 py-3 text-2xl"
            data-testid="report-next"
            onClick={() => void s.finishWeeklyReport()}
          >
            {s.week >= 6 ? '前往期末「搜尋祭」 →' : `進入第 ${s.week + 1} 週 →`}
          </button>
        </div>
      </div>
    </div>
  )
}
