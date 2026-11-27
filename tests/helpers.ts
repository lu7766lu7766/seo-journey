import { applyEffects, initialCore } from '@/engine/effects'
import type { RunnerHost } from '@/engine/runner'
import type { Cmd, CondState, Effects } from '@/engine/types'

/** Minimal in-memory host for runner tests. */
export function makeHost(name = '小明') {
  const st: CondState & { playerName: string } = { ...initialCore(), seenScenes: [], unlockedCards: [], playerName: name }
  const emitted: Cmd[] = []
  const picks: string[] = []
  const host: RunnerHost = {
    getState: () => st,
    applyEffects: (e: Effects) => Object.assign(st, applyEffects(st, e)),
    onCmd: (c) => {
      emitted.push(c)
      if (c.k === 'card' && !st.unlockedCards.includes(c.id)) st.unlockedCards.push(c.id)
    },
    onChoice: (_id, t) => void picks.push(t),
  }
  return { st, host, emitted, picks }
}
