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

export interface SlotOutcome {
  slotIndex: number
  activityId: ActivityId
  status: 'ok' | 'fail' | 'infirmary' | 'skipped'
  themed: boolean
  halfTired: boolean
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

  // Stamina < 20 halves positive stat gains; stress >= 80 gives 30% fail chance on work
  const halfTired = isWork && state.stamina < 20
  const failed = isWork && state.stress >= 80 && rng() < 0.3

  if (failed) {
    const next = applyEffects(state, { stamina: def.stamina, stress: def.stress })
    const failLine = pick(FAIL_LINES, rng)
    const triggeredInfirmary = next.stamina <= 0
    const finalState = triggeredInfirmary
      ? applyEffects(next, { stamina: 35, stress: -15 })
      : next
    return {
      state: finalState,
      outcome: {
        slotIndex,
        activityId,
        status: triggeredInfirmary ? 'infirmary' : 'fail',
        themed,
        halfTired,
        statDelta: {},
        bondDelta: {},
        staminaDelta: finalState.stamina - state.stamina,
        stressDelta: finalState.stress - state.stress,
        caption: failLine.text,
        failLine,
      },
    }
  }

  const statDelta: Partial<Record<StatKey, number>> = {}
  for (const k of STAT_KEYS) {
    const base = def.stats[k]
    if (!base) continue
    let v = themed ? Math.round(base * 1.5) : base
    if (halfTired) v = Math.max(1, Math.floor(v / 2))
    statDelta[k] = v
  }

  let next = applyEffects(state, {
    stats: statDelta,
    stamina: def.stamina,
    stress: def.stress,
  })

  let chatter: FlavorLine | undefined
  const bondDelta: Partial<Record<HeroineId, number>> = {}
  if (rng() < 0.15) {
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
    next = applyEffects(next, { stamina: 35, stress: -15 })
  }

  return {
    state: next,
    outcome: {
      slotIndex,
      activityId,
      status: triggeredInfirmary ? 'infirmary' : 'ok',
      themed,
      halfTired,
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

  return {
    nextState: state,
    outcomes,
    infirmaryTriggered,
    infirmaryLines: infirmaryTriggered ? INFIRMARY_LINES : [],
  }
}

/** Deterministic preview of expected stat/stamina/stress changes for the UI. */
export function previewSchedule(
  state: CoreState,
  week: number,
  slots: ActivityId[],
): { stats: Record<StatKey, number>; stamina: number; stress: number; infirmaryRisk: boolean; failRisk: boolean } {
  let simStamina = state.stamina
  let simStress = state.stress
  const gains: Record<StatKey, number> = { con: 0, tec: 0, str: 0, ans: 0, tru: 0 }
  let infirmaryRisk = false
  let failRisk = false

  for (const id of slots) {
    const def = ACTIVITIES[id]
    const themed = isThemedActivity(week, id)
    const isWork = id !== 'rest'
    if (isWork && simStress >= 80) failRisk = true
    const halfTired = isWork && simStamina < 20
    for (const k of STAT_KEYS) {
      const base = def.stats[k]
      if (!base) continue
      let v = themed ? Math.round(base * 1.5) : base
      if (halfTired) v = Math.max(1, Math.floor(v / 2))
      gains[k] += v
    }
    simStamina = Math.min(100, Math.max(0, simStamina + def.stamina))
    simStress = Math.min(100, Math.max(0, simStress + def.stress))
    if (isWork && simStamina <= 0) {
      infirmaryRisk = true
      break
    }
  }
  return { stats: gains, stamina: simStamina, stress: simStress, infirmaryRisk, failRisk }
}
