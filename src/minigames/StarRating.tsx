import { motion, useReducedMotion } from 'motion/react'
import { starsCaption, type Attempt, type Stars } from './stars'

const SPARKS = [
  { x: -46, y: -34, d: 0.0 },
  { x: 42, y: -38, d: 0.1 },
  { x: -64, y: 6, d: 0.2 },
  { x: 62, y: 10, d: 0.05 },
  { x: -22, y: -52, d: 0.15 },
  { x: 24, y: -54, d: 0.25 },
]

/** Result-card star row with a small celebratory pop-in. */
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
      <div className="relative flex items-center justify-center gap-2" aria-label={`獲得 ${stars} 顆星，滿分 3 顆`}>
        {[0, 1, 2].map((i) => {
          const earned = i < stars
          return (
            <motion.span
              key={i}
              aria-hidden
              className={`select-none text-5xl leading-none ${earned ? 'text-amber-400' : 'text-ink/25'}`}
              style={earned ? { textShadow: '0 2px 0 rgba(180,110,0,.45), 0 0 14px rgba(255,200,60,.65)' } : undefined}
              initial={reduce ? false : { scale: 0, rotate: -50, opacity: 0 }}
              animate={
                reduce
                  ? undefined
                  : earned
                    ? { scale: [0, 1.5, 1], rotate: [-50, 12, 0], opacity: 1 }
                    : { scale: 1, rotate: 0, opacity: 1 }
              }
              transition={
                earned
                  ? { duration: 0.55, delay: 0.2 + i * 0.22, ease: 'easeOut' }
                  : { duration: 0.3, delay: 0.2 + i * 0.22 }
              }
            >
              {earned ? '★' : '☆'}
            </motion.span>
          )
        })}
        {stars === 3 &&
          !reduce &&
          SPARKS.map((s, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 text-xl text-amber-300"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
              animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [0.3, 1.2, 0.6] }}
              transition={{ duration: 0.9, delay: 0.9 + s.d, ease: 'easeOut' }}
            >
              ✦
            </motion.span>
          ))}
      </div>
      <p className="mt-2 text-sm font-bold text-ink/80">{starsCaption(stars, attempt, retryAvailable)}</p>
    </div>
  )
}

/** Compact best-star label for lists (Gallery practice mode). */
export function BestStars({ stars, testId }: { stars: number; testId?: string }) {
  const k = Math.max(0, Math.min(3, Math.floor(stars)))
  return (
    <span className="shrink-0 text-base tracking-wider" data-testid={testId} data-stars={k} title={k ? `最佳成績：${k} 顆星` : '尚未過關'}>
      <span className="text-amber-500">{'★'.repeat(k)}</span>
      <span className="text-ink/25">{'☆'.repeat(3 - k)}</span>
    </span>
  )
}
