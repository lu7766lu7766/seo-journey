import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Background } from '@/art/backgrounds'
import { CharacterAvatar } from '@/art/characters/Avatar'
import { audio } from '@/audio'
import { CHARACTERS } from '@/content/characters'
import { WEEKLY_COMMENTS } from '@/content/flavor'
import { HEROINES, type HeroineId } from '@/engine/types'
import { useGame } from '@/store/game'
import { scores } from '@/systems/score'
import { readStatSnapshot } from '@/systems/siteMetrics'
import { SiteDashboard } from './SiteDashboard'

function tierFor(v: number): 'low' | 'mid' | 'high' {
  if (v < 40) return 'low'
  if (v < 65) return 'mid'
  return 'high'
}

const TIER_LABEL: Record<'low' | 'mid' | 'high', { text: string; cls: string }> = {
  low: { text: '初識階段', cls: 'bg-slate-100 text-slate-700' },
  mid: { text: '漸入佳境', cls: 'bg-sky/35 text-ink' },
  high: { text: '深度信賴', cls: 'bg-rose-100 text-[#d6334a]' },
}

export function WeeklyReport() {
  const s = useGame()
  const cur = scores(s.stats, s.bond)
  // stats at the start of this week (stored in flags by the store); old saves simply show no deltas
  const weekStart = readStatSnapshot(s.flags)

  useEffect(() => {
    audio.sfx('bond')
  }, [])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-6" data-testid="weekly-report">
      <Background id="council" time="dusk" />
      <div className="pointer-events-none absolute inset-0 bg-[#0b1024]/55 backdrop-blur-[2px]" />
      <div className="glass relative z-10 flex w-[1180px] flex-col gap-3.5 rounded-3xl px-7 py-5">
        <div className="text-center">
          <h2 className="font-title text-3xl font-bold text-ink">第 {s.week} 週 · 週日評測報告</h2>
          <p className="mt-0.5 text-sm text-ink/75">三位評審檢視了網站研究社本週的成果</p>
        </div>

        <div className="grid grid-cols-[1fr_400px] items-start gap-5">
        <div className="space-y-3">
          {HEROINES.map((h: HeroineId, idx) => {
            const c = CHARACTERS[h]
            const prev = Math.round(s.prevScores[h] ?? 10)
            const now = Math.round(cur[h])
            const diff = now - prev
            const tier = tierFor(now)
            const tierMeta = TIER_LABEL[tier]
            const comments = WEEKLY_COMMENTS[h][tier]
            const line = comments[(s.week + idx) % comments.length]
            return (
              <motion.div
                key={h}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.12 }}
                className="flex items-center gap-4 rounded-2xl bg-white/88 px-4 py-3 shadow-sm"
              >
                <CharacterAvatar id={h} size={60} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="font-title text-2xl font-bold" style={{ color: c.color }}>
                        {c.name}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tierMeta.cls}`}>
                        {tierMeta.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 font-title text-xl font-bold">
                      <span>♥ {now}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-sm ${diff >= 0 ? 'bg-emerald-50 text-[#2b8a57]' : 'bg-rose-50 text-[#d6334a]'}`}>
                        {diff >= 0 ? `+${diff}` : diff}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
                    <motion.div
                      initial={{ width: `${Math.min(100, prev)}%` }}
                      animate={{ width: `${Math.min(100, now)}%` }}
                      transition={{ duration: 0.55, delay: 0.15 + idx * 0.12, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${c.color}, ${c.accent})` }}
                    />
                  </div>
                  <p className="mt-1.5 font-title text-base leading-snug text-[#251e38]">「{line.text.replace(/\{name\}/g, s.playerName)}」</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="rounded-2xl bg-white/60 p-3" data-testid="report-dashboard">
          <SiteDashboard stats={s.stats} week={s.week} prevStats={weekStart} compact />
        </div>
        </div>

        <div className="flex justify-center pt-1">
          <button
            className="btn-pastel px-10 py-3 text-xl"
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
