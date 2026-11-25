import { motion } from 'motion/react'
import type { Pause } from '@/engine/types'
import { useGame } from '@/store/game'

type Choice = Extract<Pause, { kind: 'choice' }>

export function ChoiceMenu({ pause }: { pause: Choice }) {
  const choose = useGame((s) => s.choose)
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-ink/35 backdrop-blur-[2px]" data-testid="choices">
      {pause.options.map((o, i) => (
        <motion.button
          key={pause.lineId + o.index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="choice-btn flex w-[740px] items-center rounded-full px-7 py-4 text-left font-title text-2xl font-bold"
          onClick={(e) => {
            e.stopPropagation()
            choose(o.index)
          }}
        >
          <span className="mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-base font-bold text-white">
            {i + 1}
          </span>
          <span>{o.text}</span>
        </motion.button>
      ))}
    </div>
  )
}
