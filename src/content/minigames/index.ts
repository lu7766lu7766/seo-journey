/**
 * Minigame id registry. Ids are typed so `minigame('typo')` is a compile error.
 * Question/target DATA is added in P4 (src/content/minigames/*.ts); only the ids + engine kind live here.
 */
export type MinigameKind = 'quiz' | 'spot' | 'serp' | 'placeholder'

export const MINIGAMES = {
  'demo-quiz': { kind: 'placeholder' },
  'w1-robots': { kind: 'spot' },
  'w2-serp': { kind: 'serp' },
  'w3-jsonld': { kind: 'spot' },
  'w4-cwv': { kind: 'quiz' },
  'w5-cite': { kind: 'quiz' },
  'w6-update': { kind: 'quiz' },
  'sq-r1': { kind: 'quiz' },
  'sq-r2': { kind: 'spot' },
  'sq-r3': { kind: 'spot' },
  'sq-h1': { kind: 'spot' },
  'sq-h2': { kind: 'serp' },
  'sq-h3': { kind: 'quiz' },
  'sq-m1': { kind: 'spot' },
  'sq-m2': { kind: 'quiz' },
  'sq-m3': { kind: 'quiz' },
  'sq-x1': { kind: 'quiz' },
} as const satisfies Record<string, { kind: MinigameKind }>

export type MinigameId = keyof typeof MINIGAMES
export const MINIGAME_IDS = Object.keys(MINIGAMES) as MinigameId[]
