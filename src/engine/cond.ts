import { score } from '@/systems/score'
import type { CmpOp, Cond, CondState, FlagValue, HeroineId, KnowledgeId, StatKey } from './types'

function cmp(a: number, op: CmpOp, b: number): boolean {
  switch (op) {
    case 'eq': return a === b
    case 'ne': return a !== b
    case 'gt': return a > b
    case 'gte': return a >= b
    case 'lt': return a < b
    case 'lte': return a <= b
  }
}

const num = (v: FlagValue | undefined) => (typeof v === 'number' ? v : v ? 1 : 0)

export function evalCond(c: Cond, s: CondState): boolean {
  switch (c.t) {
    case 'flag': {
      const v = s.flags[c.key]
      // no op → truthy test (numeric > 0 or true)
      if (!c.op) return c.value === undefined ? !!v : num(v) === num(c.value)
      return cmp(num(v), c.op, num(c.value ?? 0))
    }
    case 'stat': return cmp(s.stats[c.key], c.op, c.value)
    case 'bond': return cmp(s.bond[c.who], c.op, c.value)
    case 'score': return cmp(score(c.who, s.stats, s.bond), c.op, c.value)
    case 'seen': return s.seenScenes.includes(c.scene)
    case 'card': return s.unlockedCards.includes(c.id)
    case 'and': return c.all.every((x) => evalCond(x, s))
    case 'or': return c.any.some((x) => evalCond(x, s))
    case 'not': return !evalCond(c.cond, s)
  }
}

// ---- condition builders ----
export const flag = (key: string, op?: CmpOp, value?: FlagValue): Cond => ({ t: 'flag', key, op, value })
export const statIs = (key: StatKey, op: CmpOp, value: number): Cond => ({ t: 'stat', key, op, value })
export const bondIs = (who: HeroineId, op: CmpOp, value: number): Cond => ({ t: 'bond', who, op, value })
export const scoreIs = (who: HeroineId, op: CmpOp, value: number): Cond => ({ t: 'score', who, op, value })
export const seen = (scene: string): Cond => ({ t: 'seen', scene })
/** true once the player has unlocked this knowledge card in the current run */
export const hasCard = (id: KnowledgeId): Cond => ({ t: 'card', id })
export const and = (...all: Cond[]): Cond => ({ t: 'and', all })
export const or = (...any: Cond[]): Cond => ({ t: 'or', any })
export const not = (cond: Cond): Cond => ({ t: 'not', cond })
