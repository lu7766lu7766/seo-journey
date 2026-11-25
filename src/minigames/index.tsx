import type { MinigameId } from '@/content/minigames'

/**
 * PUBLIC MINIGAME INTERFACE (P4 replaces the body with quiz/spot/serp engines keyed off MINIGAMES[id].kind).
 * Call onResolve(true|false) exactly once when finished.
 */
export function MinigameHost({ id, onResolve }: { id: MinigameId; onResolve: (won: boolean) => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/50" data-testid="minigame">
      <div className="glass rounded-3xl p-10 text-center">
        <h2 className="mb-2 font-title text-3xl font-bold">小遊戲（佔位）</h2>
        <p className="mb-6 text-lg">{id}</p>
        <div className="flex justify-center gap-4">
          <button className="btn-pastel text-xl" onClick={() => onResolve(true)}>過關</button>
          <button className="btn-pastel text-xl" onClick={() => onResolve(false)}>失敗</button>
        </div>
      </div>
    </div>
  )
}
