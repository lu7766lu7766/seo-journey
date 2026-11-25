import { clamp, BOND_MAX, BOND_MIN } from '@/systems/score'
import { HEROINES, STAT_KEYS, type CoreState, type Effects } from './types'

export function initialCore(): CoreState {
  return {
    stats: { con: 10, tec: 10, str: 10, ans: 10, tru: 10 },
    bond: { rin: 0, hare: 0, mirai: 0 },
    stamina: 80,
    stress: 10,
    flags: {},
  }
}

/** Pure: returns a new CoreState with the effects applied and values clamped. */
export function applyEffects<T extends CoreState>(state: T, e: Effects): T {
  const next: T = {
    ...state,
    stats: { ...state.stats },
    bond: { ...state.bond },
    flags: { ...state.flags },
  }
  if (e.stats) for (const k of STAT_KEYS) if (e.stats[k] !== undefined) next.stats[k] = clamp(next.stats[k] + e.stats[k]!, 0, 100)
  if (e.bond) for (const h of HEROINES) if (e.bond[h] !== undefined) next.bond[h] = clamp(next.bond[h] + e.bond[h]!, BOND_MIN, BOND_MAX)
  if (e.stamina) next.stamina = clamp(next.stamina + e.stamina, 0, 100)
  if (e.stress) next.stress = clamp(next.stress + e.stress, 0, 100)
  if (e.flags) Object.assign(next.flags, e.flags)
  if (e.inc) for (const [k, v] of Object.entries(e.inc)) {
    const cur = next.flags[k]
    next.flags[k] = (typeof cur === 'number' ? cur : cur ? 1 : 0) + v
  }
  return next
}
