/**
 * Week-level economy simulator (stamina / stress trade-offs), independent of the story content.
 * Plays 6 weeks of weekday schedules (runWeekSchedule) + the weekend (date / rest / forced rest after an
 * infirmary collapse) with a seeded rng.
 */
import { RECOMMENDED_SCHEDULE, WEEK_THEMES } from '@/content/activities'
import type { ActivityId } from '@/content/activityIds'
import { applyEffects, initialCore } from '@/engine/effects'
import { STAT_KEYS, type CoreState } from '@/engine/types'
import { INFIRMARY_WEEK_FLAG, runWeekSchedule, WEEKEND } from '@/systems/schedule'
import { makeRng } from './fullSim'

export type Weekend = 'date' | 'rest'
export interface EconomyPolicy {
  name: string
  slots: (week: number, state: CoreState) => ActivityId[]
  weekend: Weekend
}

const POOL: ActivityId[] = ['write', 'techcheck', 'schema', 'qa', 'authors', 'research']

/** the week's theme activity first, then a rotating mix, so 3-work and 4-work patterns share their first three slots */
export function workOrder(week: number): ActivityId[] {
  const theme = WEEK_THEMES[week].bonusActivities[0]
  const rest = POOL.filter((a) => a !== theme)
  const rot = (week * 2) % rest.length
  return [theme, ...rest.slice(rot), ...rest.slice(0, rot)]
}

export const pattern =
  (works: number): EconomyPolicy['slots'] =>
  (week) => {
    const w = workOrder(week).slice(0, works)
    const rests = Array<ActivityId>(4 - works).fill('rest')
    return [...w, ...rests]
  }

export const ECONOMY_POLICIES: Record<string, EconomyPolicy> = {
  'grind4 + 約會': { name: '4 工作＋週末約會', slots: pattern(4), weekend: 'date' },
  'grind4 + 休養': { name: '4 工作＋週末休養', slots: pattern(4), weekend: 'rest' },
  '3工作1休息 + 約會': { name: '3 工作＋1 休息＋週末約會', slots: pattern(3), weekend: 'date' },
  '3工作1休息 + 休養': { name: '3 工作＋1 休息＋週末休養', slots: pattern(3), weekend: 'rest' },
  '2工作2休息 + 約會': { name: '2 工作＋2 休息＋週末約會', slots: pattern(2), weekend: 'date' },
  '推薦排程 + 約會': { name: '推薦排程＋週末約會', slots: (w) => RECOMMENDED_SCHEDULE[w], weekend: 'date' },
}

export interface EconomyRun {
  gain: number
  infirmary: number
  fails: number
  tenseSlots: number
  maxStress: number
  endStress: number
  /** stress at the end of each week's weekdays */
  stressByWeek: number[]
  /** weekends lost to an infirmary collapse */
  lockedWeekends: number
}

export function simulateEconomy(pol: EconomyPolicy, rng: () => number): EconomyRun {
  let state = initialCore()
  const start = STAT_KEYS.reduce((a, k) => a + state.stats[k], 0)
  const run: EconomyRun = { gain: 0, infirmary: 0, fails: 0, tenseSlots: 0, maxStress: state.stress, endStress: 0, stressByWeek: [], lockedWeekends: 0 }
  for (let week = 1; week <= 6; week++) {
    const res = runWeekSchedule(state, week, pol.slots(week, state), rng)
    state = res.nextState
    for (const o of res.outcomes) {
      if (o.status === 'fail') run.fails++
      if (o.status === 'infirmary') run.infirmary++
      if (o.tense && o.status !== 'skipped') run.tenseSlots++
    }
    run.maxStress = Math.max(run.maxStress, state.stress)
    run.stressByWeek.push(state.stress)
    const locked = state.flags[INFIRMARY_WEEK_FLAG] === true
    if (locked) run.lockedWeekends++
    if (locked || pol.weekend === 'rest') state = applyEffects(state, WEEKEND.rest)
    else state = applyEffects(state, { stress: WEEKEND.dateStress })
    state = applyEffects(state, { flags: { [INFIRMARY_WEEK_FLAG]: false } })
  }
  run.gain = STAT_KEYS.reduce((a, k) => a + state.stats[k], 0) - start
  run.endStress = state.stress
  return run
}

export interface EconomyRow {
  key: string
  gain: number
  infirmary: number
  fails: number
  tense: number
  maxStress: number
  endStress: number
  locked: number
  stressByWeek: number[]
}

export function economyTable(n = 400, seed = 20261127): EconomyRow[] {
  return Object.entries(ECONOMY_POLICIES).map(([key, pol]) => {
    const rng = makeRng(seed)
    const sum = { gain: 0, infirmary: 0, fails: 0, tense: 0, maxStress: 0, endStress: 0, locked: 0 }
    const byWeek = [0, 0, 0, 0, 0, 0]
    for (let i = 0; i < n; i++) {
      const r = simulateEconomy(pol, rng)
      sum.gain += r.gain
      sum.infirmary += r.infirmary
      sum.fails += r.fails
      sum.tense += r.tenseSlots
      sum.maxStress += r.maxStress
      sum.endStress += r.endStress
      sum.locked += r.lockedWeekends
      r.stressByWeek.forEach((v, w) => (byWeek[w] += v))
    }
    return {
      key,
      gain: sum.gain / n,
      infirmary: sum.infirmary / n,
      fails: sum.fails / n,
      tense: sum.tense / n,
      maxStress: sum.maxStress / n,
      endStress: sum.endStress / n,
      locked: sum.locked / n,
      stressByWeek: byWeek.map((v) => v / n),
    }
  })
}
