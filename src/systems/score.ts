import { HEROINES, STAT_KEYS, type Bonds, type HeroineId, type Stats } from '@/engine/types'

/** plan §2.2. Each row sums to 1.0. Final values are tuned in P2 by balance simulation. */
export const WEIGHTS: Record<HeroineId, Record<(typeof STAT_KEYS)[number], number>> = {
  rin: { con: 0.3, tec: 0.35, str: 0.15, ans: 0.05, tru: 0.15 },
  hare: { con: 0.25, tec: 0.05, str: 0.25, ans: 0.4, tru: 0.05 },
  mirai: { con: 0.3, tec: 0.05, str: 0.1, ans: 0.15, tru: 0.4 },
}

/**
 * Global balance knobs, tuned with the full-content simulator (tests/fullSim.ts, tests/balance.test.ts).
 * statScale: how much of the weighted stat sum counts toward a heroine's score (the stats themselves stay raw).
 *             0.5 means a site with all stats at 60 is worth 30 hearts from the stat side; the rest must come
 *             from the relationship (bond). Before tuning, scores saturated at 100 for anyone who played.
 * bondMax:   cap of a single heroine's bond. Bond income was also rebalanced (main story x0.6, side quests x0.45,
 *            dates unchanged) so that doing everything gives ~35 per heroine while courting one heroine reaches the cap.
 * Mutable only so the simulator can sweep them.
 */
export const TUNING = { statScale: 0.5, bondScale: 1, bondMax: 40 }

export const BOND_MIN = -20

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** score_h = clamp( Σ w[h][s]·stat_s + bond_h, 0, 100 ) */
export function score(who: HeroineId, stats: Stats, bond: Bonds): number {
  let sum = 0
  for (const s of STAT_KEYS) sum += WEIGHTS[who][s] * stats[s]
  return clamp(sum * TUNING.statScale + bond[who] * TUNING.bondScale, 0, 100)
}

export function scores(stats: Stats, bond: Bonds): Record<HeroineId, number> {
  return Object.fromEntries(HEROINES.map((h) => [h, score(h, stats, bond)])) as Record<HeroineId, number>
}
