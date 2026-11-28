import { AnimatePresence, motion } from 'motion/react'
import { CharacterSprite } from '@/art/characters'
import { useAfterPreload } from '@/art/hooks'
import { useArtManifest } from '@/art/manifest'
import { resolveSpriteSrc } from '@/art/resolve'
import type { CharId, Face, SpeakerId } from '@/content/characters'
import type { Slot, StageState } from '@/engine/types'

const SLOT_X: Record<Slot, number> = { left: 250, center: 640, right: 1030 }
const SPRITE_H = 640
const SPRITE_W = SPRITE_H * 0.6

/**
 * Crossfades between expressions, but only switches to a new face once its image is loaded (normally it was
 * preloaded with the scene, so this is instant); otherwise the previous expression stays instead of a blank frame.
 */
function Expression({ who, face, speaking }: { who: CharId; face: Face; speaking: boolean }) {
  const manifest = useArtManifest()
  const shown = useAfterPreload(
    face,
    (f) => f,
    (f) => {
      const r = resolveSpriteSrc(manifest, who, f)
      return r ? [r.src] : []
    },
  )
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={shown}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <CharacterSprite id={who} face={shown} speaking={speaking} />
      </motion.div>
    </AnimatePresence>
  )
}

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
              <Expression who={c.who} face={c.face} speaking={speaking} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
