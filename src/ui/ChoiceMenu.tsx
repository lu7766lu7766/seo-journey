import { motion } from 'motion/react'
import type { Pause } from '@/engine/types'
import { useGame } from '@/store/game'

type Choice = Extract<Pause, { kind: 'choice' }>

export function ChoiceMenu({ pause }: { pause: Choice }) {
  const choose = useGame((s) => s.choose)
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#070b18]/50 backdrop-blur-[3px]" data-testid="choices">
      {pause.options.map((o, i) => (
        <motion.button
          key={pause.lineId + o.index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="choice-btn flex w-[760px] items-center rounded-2xl px-7 py-4 text-left font-title text-2xl font-bold"
          onClick={(e) => {
            e.stopPropagation()
            choose(o.index)
          }}
        >
          <span className="mr-5 flex h-8 w-8 shrink-0 rotate-45 items-center justify-center rounded-md border border-[#9fd3f0]/80 bg-[#1a2550] text-sm font-bold text-[#9fd3f0] shadow-[0_0_10px_rgba(159,211,240,0.35)]">
            <span className="-rotate-45">{i + 1}</span>
          </span>
          <span className="tracking-wide">{o.text}</span>
        </motion.button>
      ))}
    </div>
  )
}
