import { AnimatePresence, motion } from 'motion/react'
import { CharacterSprite } from '@/art/characters'
import type { SpeakerId } from '@/content/characters'
import type { Slot, StageState } from '@/engine/types'

const SLOT_X: Record<Slot, number> = { left: 250, center: 640, right: 1030 }
const SPRITE_H = 640
const SPRITE_W = SPRITE_H * 0.6

export function CharacterLayer({ chars, speaker }: { chars: StageState['chars']; speaker?: SpeakerId }) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <AnimatePresence>
        {(Object.entries(chars) as [Slot, NonNullable<StageState['chars'][Slot]>][]).map(([slot, c]) => {
          const speaking = speaker === c.who
          return (
            <motion.div
              key={c.who}
              initial={{ opacity: 0, x: SLOT_X[slot] - SPRITE_W / 2, y: 30 }}
              animate={{ opacity: 1, x: SLOT_X[slot] - SPRITE_W / 2, y: speaking ? -6 : 0, filter: speaking ? 'brightness(1)' : 'brightness(0.78)' }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.3 }}
              style={{ position: 'absolute', top: 720 - SPRITE_H + 70, width: SPRITE_W, height: SPRITE_H }}
              data-testid={`char-${c.who}`}
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={c.face}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ position: 'absolute', inset: 0 }}
                >
                  <CharacterSprite id={c.who} face={c.face} speaking={speaking} />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
