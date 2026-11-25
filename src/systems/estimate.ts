import type { Cmd, Scene } from '@/engine/types'

export interface SceneStats {
  chars: number
  lines: number
  choices: number
  minigames: number
}

/** Count code points (Chinese chars = 1). `{name}` counts as 3. */
export function textLength(text: string): number {
  return [...text.replace(/\{name\}/g, '〇〇〇')].length
}

const ZERO: SceneStats = { chars: 0, lines: 0, choices: 0, minigames: 0 }
const add = (a: SceneStats, b: SceneStats): SceneStats => ({
  chars: a.chars + b.chars, lines: a.lines + b.lines, choices: a.choices + b.choices, minigames: a.minigames + b.minigames,
})
const bigger = (a: SceneStats, b: SceneStats) => (b.chars + b.lines * 10 >= a.chars + a.lines * 10 ? b : a)

/** Stats of ONE path through the cmds: for branches (choice/if) the longest branch is counted. */
export function countCmds(cmds: Cmd[]): SceneStats {
  let t = ZERO
  for (const c of cmds) {
    if (c.k === 'say') t = add(t, { ...ZERO, chars: textLength(c.text), lines: 1 })
    else if (c.k === 'minigame') t = add(t, { ...ZERO, minigames: 1 })
    else if (c.k === 'choice') {
      const best = c.options.reduce((acc, o) => bigger(acc, countCmds(o.then ?? [])), ZERO)
      t = add(add(t, { ...ZERO, choices: 1 }), best)
    } else if (c.k === 'if') t = add(t, bigger(countCmds(c.then), countCmds(c.else ?? [])))
  }
  return t
}

export const countScene = (s: Scene) => countCmds(s.cmds)

/** plan §3.1: chars/450 min + 1.2s per line + 4s per choice + 60s per minigame + 40s per scheduling round */
export function estimateSeconds(s: SceneStats, scheduleRounds = 0): number {
  return (s.chars / 450) * 60 + s.lines * 1.2 + s.choices * 4 + s.minigames * 60 + scheduleRounds * 40
}

export const estimateMinutes = (s: SceneStats, scheduleRounds = 0) => estimateSeconds(s, scheduleRounds) / 60
