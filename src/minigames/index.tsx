import { useEffect, useState } from 'react'
import { MINIGAMES, type MinigameId } from '@/content/minigames'
import { MINIGAME_DATA } from '@/content/minigames/data'
import { Quiz } from './Quiz'
import { Serp } from './Serp'
import { Spot } from './Spot'
import { enterMinigameBgm } from './minigameBgm'
import type { Attempt } from './stars'

/**
 * PUBLIC MINIGAME INTERFACE (P4 quiz/spot/serp engines keyed off MINIGAMES[id].kind).
 * Call onResolve(won, stars?) exactly once when finished. `stars` is 0-3 (see ./stars.ts for the rules);
 * old callers that only look at `won` keep working. A failed first attempt may be retried once INSIDE the host
 * (same game, hint shown from the start); onResolve only fires when the player finishes for good.
 */
export function MinigameHost({
  id,
  onResolve,
}: {
  id: MinigameId
  onResolve: (won: boolean, stars?: number) => void
}) {
  const [attempt, setAttempt] = useState<Attempt>(1)
  // 小遊戲專用配樂；卸載（結算或離開）時淡回原本的曲子
  useEffect(() => enterMinigameBgm(), [])
  const registeredKind = MINIGAMES[id].kind
  const game = MINIGAME_DATA[id]
  // remounting on `key` resets every engine to a fresh run (and re-shuffles option order)
  const common = { attempt, onResolve, onRetry: () => setAttempt(2) }

  const renderGame = () => {
    if ((registeredKind === 'placeholder' || registeredKind === 'quiz') && game.kind === 'quiz') {
      return <Quiz game={game} key={attempt} {...common} />
    }
    if (registeredKind === 'spot' && game.kind === 'spot') {
      return <Spot game={game} key={attempt} {...common} />
    }
    if (registeredKind === 'serp' && game.kind === 'serp') {
      return <Serp game={game} key={attempt} {...common} />
    }
    if (game.kind === 'quiz') return <Quiz game={game} key={attempt} {...common} />
    if (game.kind === 'spot') return <Spot game={game} key={attempt} {...common} />
    return <Serp game={game} key={attempt} {...common} />
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#120d16]/78 px-4 pb-3 pt-14 backdrop-blur-[2px]"
      data-testid="minigame"
      onClick={(e) => e.stopPropagation()}
    >
      {renderGame()}
    </div>
  )
}
