import { motion } from 'motion/react'
import type { Pause } from '@/engine/types'
import { useGame } from '@/store/game'

type Choice = Extract<Pause, { kind: 'choice' }>

export function ChoiceMenu({ pause }: { pause: Choice }) {
  const choose = useGame((s) => s.choose)
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-ink/20" data-testid="choices">
      {pause.options.map((o, i) => (
        <motion.button
          key={pause.lineId + o.index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="glass choice-btn w-[720px] rounded-full px-8 py-4 font-title text-2xl hover:brightness-110"
          onClick={(e) => {
            e.stopPropagation()
            choose(o.index)
          }}
        >
          <span className="mr-3 text-sakura">{i + 1}</span>
          {o.text}
        </motion.button>
      ))}
    </div>
  )
}
