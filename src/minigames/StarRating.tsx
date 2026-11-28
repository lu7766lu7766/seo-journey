import { motion, useReducedMotion } from 'motion/react'
import { FourPointStar } from '@/ui/material'
import { starsCaption, type Attempt, type Stars } from './stars'

const SPARKS = [
  { x: -52, y: -32, d: 0.0 },
  { x: 48, y: -34, d: 0.1 },
  { x: -68, y: 6, d: 0.2 },
  { x: 68, y: 10, d: 0.05 },
  { x: -24, y: -48, d: 0.15 },
  { x: 24, y: -50, d: 0.25 },
]

/** Result-card star row with a small celebratory pop-in using the brand four-point star motif. */
export function StarRating({
  stars,
  attempt,
  retryAvailable,
}: {
  stars: Stars
  attempt: Attempt
  retryAvailable: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <div className="flex flex-col items-center" data-testid="minigame-stars" data-stars={stars}>
      <div className="relative flex items-center justify-center gap-3" aria-label={`獲得 ${stars} 顆星，滿分 3 顆`}>
        {[0, 1, 2].map((i) => {
          const earned = i < stars
          return (
            <motion.span
              key={i}
              aria-hidden
              className="inline-flex select-none items-center justify-center"
              style={earned ? { filter: 'drop-shadow(0 2px 6px rgba(212, 136, 20, 0.45))' } : undefined}
              initial={reduce ? false : { scale: 0, rotate: -45, opacity: 0 }}
              animate={
                reduce
                  ? undefined
                  : earned
                    ? { scale: [0, 1.35, 1], rotate: [-45, 10, 0], opacity: 1 }
                    : { scale: 1, rotate: 0, opacity: 1 }
              }
              transition={
                earned
                  ? { duration: 0.52, delay: 0.18 + i * 0.2, ease: 'easeOut' }
                  : { duration: 0.28, delay: 0.18 + i * 0.2 }
              }
            >
              <FourPointStar
                size={42}
                color={earned ? '#d98a18' : '#efe7d4'}
                stroke={earned ? undefined : '#a49274'}
                strokeWidth={1.3}
              />
            </motion.span>
          )
        })}
        {stars === 3 &&
          !reduce &&
          SPARKS.map((s, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
              animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [0.3, 1.15, 0.55] }}
              transition={{ duration: 0.9, delay: 0.85 + s.d, ease: 'easeOut' }}
            >
              <FourPointStar size={14} color="#e5a024" />
            </motion.span>
          ))}
      </div>
      <p className="mt-2 font-title text-[15px] font-bold text-ink-body">
        {starsCaption(stars, attempt, retryAvailable)}
      </p>
    </div>
  )
}

/** Compact best-star label for lists (Gallery practice mode). */
export function BestStars({ stars, testId }: { stars: number; testId?: string }) {
  const k = Math.max(0, Math.min(3, Math.floor(stars)))
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1"
      data-testid={testId}
      data-stars={k}
      title={k ? `最佳成績：${k} 顆星` : '尚未過關'}
      aria-label={k ? `最佳成績：${k} 顆星` : '尚未過關'}
    >
      {[0, 1, 2].map((i) => (
        <FourPointStar
          key={i}
          size={20}
          color={i < k ? '#d48814' : '#efe7d4'}
          stroke={i < k ? undefined : '#a49274'}
          strokeWidth={1.2}
          className={i < k ? 'drop-shadow-[0_1px_1px_rgba(120,70,8,0.28)]' : ''}
        />
      ))}
    </span>
  )
}
