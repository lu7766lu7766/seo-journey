import { MINIGAMES, type MinigameId } from '@/content/minigames'
import { MINIGAME_DATA } from '@/content/minigames/data'
import { Quiz } from './Quiz'
import { Serp } from './Serp'
import { Spot } from './Spot'

/**
 * PUBLIC MINIGAME INTERFACE (P4 quiz/spot/serp engines keyed off MINIGAMES[id].kind).
 * Call onResolve(true|false) exactly once when finished.
 */
export function MinigameHost({ id, onResolve }: { id: MinigameId; onResolve: (won: boolean) => void }) {
  const registeredKind = MINIGAMES[id].kind
  const game = MINIGAME_DATA[id]

  const renderGame = () => {
    if ((registeredKind === 'placeholder' || registeredKind === 'quiz') && game.kind === 'quiz') {
      return <Quiz game={game} onResolve={onResolve} />
    }
    if (registeredKind === 'spot' && game.kind === 'spot') {
      return <Spot game={game} onResolve={onResolve} />
    }
    if (registeredKind === 'serp' && game.kind === 'serp') {
      return <Serp game={game} onResolve={onResolve} />
    }
    if (game.kind === 'quiz') return <Quiz game={game} onResolve={onResolve} />
    if (game.kind === 'spot') return <Spot game={game} onResolve={onResolve} />
    return <Serp game={game} onResolve={onResolve} />
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-ink/50"
      data-testid="minigame"
      onClick={(e) => e.stopPropagation()}
    >
      {renderGame()}
    </div>
  )
}
