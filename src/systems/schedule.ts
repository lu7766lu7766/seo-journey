import { ACTIVITIES, WEEK_THEMES } from '@/content/activities'
import type { ActivityId } from '@/content/activityIds'
import {
  ACTIVITY_CHATTER,
  ACTIVITY_RESULT,
  FAIL_LINES,
  INFIRMARY_LINES,
  type FlavorLine,
} from '@/content/flavor'
import { applyEffects } from '@/engine/effects'
import { STAT_KEYS, type CoreState, type HeroineId, type StatKey } from '@/engine/types'

export type Rng = () => number

/**
 * Stamina / stress rules (plan §2.4, retuned for real trade-offs):
 * - stamina < tiredBelow : work gains are halved (min 1)
 * - stress >= tenseAt   : 「焦躁」 work gains x tenseMul (min 1)
 * - stress >= failAt    : additionally failChance that a work slot FAILS (effect 0)
 * - stamina 0 on a work slot: infirmary (+infirmaryStamina / infirmaryStress), the rest of the weekdays are cancelled
 *   and the weekend can only be spent resting at home (flag `infirmaryWeek`).
 */
export const RULES = {
  tiredBelow: 20,
  tenseAt: 60,
  tenseMul: 0.75,
  failAt: 80,
  failChance: 0.3,
  infirmaryStamina: 25,
  infirmaryStress: 0,
} as const

/** Weekend: a date costs no stamina but relaxes a little; resting is the weekend-rest scene (+30 stamina, -20 stress). */
export const WEEKEND = { dateStress: -5, rest: { stamina: 30, stress: -20 } } as const

/** flag set when the weekday schedule ended in the infirmary; cleared at the end of the weekend */
export const INFIRMARY_WEEK_FLAG = 'infirmaryWeek'

/** One slot's stat gain after the theme bonus and the tired / tense penalties. */
export function slotGain(
  base: number,
  opts: { themed: boolean; halfTired: boolean; tense: boolean },
): number {
  let v = opts.themed ? Math.round(base * 1.5) : base
  if (opts.halfTired) v = Math.max(1, Math.floor(v / 2))
  if (opts.tense) v = Math.max(1, Math.round(v * RULES.tenseMul))
  return v
}

export interface SlotOutcome {
  slotIndex: number
  activityId: ActivityId
  status: 'ok' | 'fail' | 'infirmary' | 'skipped'
  themed: boolean
  halfTired: boolean
  /** stress >= 60: work gains x0.75 */
  tense?: boolean
  statDelta: Partial<Record<StatKey, number>>
  bondDelta: Partial<Record<HeroineId, number>>
  staminaDelta: number
  stressDelta: number
  caption: string
  chatter?: FlavorLine
  failLine?: FlavorLine
}

export interface WeekScheduleResult {
  nextState: CoreState
  outcomes: SlotOutcome[]
  infirmaryTriggered: boolean
  infirmaryLines: FlavorLine[]
}

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))]
}

export function isThemedActivity(week: number, activityId: ActivityId): boolean {
  return WEEK_THEMES[week]?.bonusActivities.includes(activityId) ?? false
}

/** Run a single activity slot purely (plan §2.4 rules). */
export function runScheduleSlot(
  state: CoreState,
  week: number,
  activityId: ActivityId,
  slotIndex: number,
  rng: Rng = Math.random,
): { state: CoreState; outcome: SlotOutcome } {
  const def = ACTIVITIES[activityId]
  const themed = isThemedActivity(week, activityId)
  const isWork = activityId !== 'rest'

  // Stamina < 20 halves gains; stress >= 60 makes work 焦躁 (x0.75); stress >= 80 adds a 30% fail chance on work
  const halfTired = isWork && state.stamina < RULES.tiredBelow
  const tense = isWork && state.stress >= RULES.tenseAt
  const failed = isWork && state.stress >= RULES.failAt && rng() < RULES.failChance

  if (failed) {
    const next = applyEffects(state, { stamina: def.stamina, stress: def.stress })
    const failLine = pick(FAIL_LINES, rng)
    const triggeredInfirmary = next.stamina <= 0
    const finalState = triggeredInfirmary
      ? applyEffects(next, { stamina: RULES.infirmaryStamina, stress: RULES.infirmaryStress })
      : next
    return {
      state: finalState,
      outcome: {
        slotIndex,
        activityId,
        status: triggeredInfirmary ? 'infirmary' : 'fail',
        themed,
        halfTired,
        tense,
        statDelta: {},
        bondDelta: {},
        staminaDelta: finalState.stamina - state.stamina,
        stressDelta: finalState.stress - state.stress,
        caption: failLine.text,
        failLine,
      },
    }
  }

  // running on empty: the slot that drains the last stamina collapses before it produces anything
  const collapses = isWork && state.stamina + def.stamina <= 0
  const statDelta: Partial<Record<StatKey, number>> = {}
  if (!collapses) {
    for (const k of STAT_KEYS) {
      const base = def.stats[k]
      if (!base) continue
      statDelta[k] = slotGain(base, { themed, halfTired, tense })
    }
  }

  let next = applyEffects(state, {
    stats: statDelta,
    stamina: def.stamina,
    stress: def.stress,
  })

  let chatter: FlavorLine | undefined
  const bondDelta: Partial<Record<HeroineId, number>> = {}
  if (!collapses && rng() < 0.15) {
    chatter = pick(ACTIVITY_CHATTER[activityId], rng)
    if (chatter.bond) {
      for (const [h, d] of Object.entries(chatter.bond) as [HeroineId, number][]) {
        bondDelta[h] = d
      }
      next = applyEffects(next, { bond: chatter.bond })
    }
  }

  const triggeredInfirmary = isWork && next.stamina <= 0
  if (triggeredInfirmary) {
    next = applyEffects(next, { stamina: RULES.infirmaryStamina, stress: RULES.infirmaryStress })
  }

  return {
    state: next,
    outcome: {
      slotIndex,
      activityId,
      status: triggeredInfirmary ? 'infirmary' : 'ok',
      themed,
      halfTired,
      tense,
      statDelta,
      bondDelta,
      staminaDelta: next.stamina - state.stamina,
      stressDelta: next.stress - state.stress,
      caption: pick(ACTIVITY_RESULT[activityId], rng),
      chatter,
    },
  }
}

/** Run 4 weekday schedule slots sequentially, cancelling remaining slots on stamina=0 infirmary. */
export function runWeekSchedule(
  initialState: CoreState,
  week: number,
  slots: ActivityId[],
  rng: Rng = Math.random,
): WeekScheduleResult {
  let state = initialState
  const outcomes: SlotOutcome[] = []
  let infirmaryTriggered = false

  for (let i = 0; i < slots.length; i++) {
    const activityId = slots[i]
    if (infirmaryTriggered) {
      outcomes.push({
        slotIndex: i,
        activityId,
        status: 'skipped',
        themed: isThemedActivity(week, activityId),
        halfTired: false,
        tense: false,
        statDelta: {},
        bondDelta: {},
        staminaDelta: 0,
        stressDelta: 0,
        caption: '在保健室休養中，剩下的排程取消了。',
      })
      continue
    }
    const res = runScheduleSlot(state, week, activityId, i, rng)
    state = res.state
    outcomes.push(res.outcome)
    if (res.outcome.status === 'infirmary') infirmaryTriggered = true
  }

  // collapsing also costs the weekend: only resting at home is possible (cleared at the end of the weekend)
  if (infirmaryTriggered) state = applyEffects(state, { flags: { [INFIRMARY_WEEK_FLAG]: true } })

  return {
    nextState: state,
    outcomes,
    infirmaryTriggered,
    infirmaryLines: infirmaryTriggered ? INFIRMARY_LINES : [],
  }
}

export interface SchedulePreview {
  stats: Record<StatKey, number>
  stamina: number
  stress: number
  infirmaryRisk: boolean
  /** 0-based index of the slot that triggers the infirmary, or null */
  infirmarySlot: number | null
  failRisk: boolean
  /** some work slot would start with stress >= 60 (gains x0.75) */
  tenseRisk: boolean
  /** some work slot would start with stamina < 20 (gains halved) */
  tiredRisk: boolean
}

/** Deterministic preview of expected stat/stamina/stress changes for the UI. */
export function previewSchedule(state: CoreState, week: number, slots: ActivityId[]): SchedulePreview {
  let simStamina = state.stamina
  let simStress = state.stress
  const gains: Record<StatKey, number> = { con: 0, tec: 0, str: 0, ans: 0, tru: 0 }
  let infirmaryRisk = false
  let infirmarySlot: number | null = null
  let failRisk = false
  let tenseRisk = false
  let tiredRisk = false

  for (let idx = 0; idx < slots.length; idx++) {
    const id = slots[idx]
    const def = ACTIVITIES[id]
    const themed = isThemedActivity(week, id)
    const isWork = id !== 'rest'
    const failChance = isWork && simStress >= RULES.failAt
    if (failChance) failRisk = true
    const halfTired = isWork && simStamina < RULES.tiredBelow
    const tense = isWork && simStress >= RULES.tenseAt
    if (halfTired) tiredRisk = true
    if (tense) tenseRisk = true
    if (isWork && simStamina + def.stamina <= 0) {
      infirmaryRisk = true
      infirmarySlot = idx
      simStamina = RULES.infirmaryStamina
      break
    }
    for (const k of STAT_KEYS) {
      const base = def.stats[k]
      if (!base) continue
      gains[k] += slotGain(base, { themed, halfTired, tense })
    }
    simStamina = Math.min(100, Math.max(0, simStamina + def.stamina))
    simStress = Math.min(100, Math.max(0, simStress + def.stress))
  }
  return { stats: gains, stamina: simStamina, stress: simStress, infirmaryRisk, infirmarySlot, failRisk, tenseRisk, tiredRisk }
}
