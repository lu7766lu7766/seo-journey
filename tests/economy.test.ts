/**
 * Stamina / stress economy regression (see src/systems/schedule.ts RULES / WEEKEND and src/content/activities.ts).
 * Set ECONOMY_REPORT=1 to print the table that the numbers in the PR / task notes come from.
 */
import { describe, expect, it } from 'vitest'
import { ACTIVITIES, ACTIVITY_LIST } from '@/content/activities'
import { initialCore } from '@/engine/effects'
import { INFIRMARY_WEEK_FLAG, previewSchedule, RULES, runScheduleSlot, runWeekSchedule, WEEKEND } from '@/systems/schedule'
import { economyTable } from './economySim'

const RUNS = 300
const rows = Object.fromEntries(economyTable(RUNS).map((r) => [r.key, r]))

describe('economy table (seeded, 300 runs, 6 weeks)', () => {
  it('prints the table when ECONOMY_REPORT=1', () => {
    if (!process.env.ECONOMY_REPORT) return
    const lines = ['策略\t總能力值增加\t保健室/局\t失誤/局\t焦躁格/局\t最高壓力\t結束壓力\t鎖週末/局\t各週平日結束壓力']
    for (const r of Object.values(rows)) {
      lines.push([r.key, r.gain.toFixed(1), r.infirmary.toFixed(2), r.fails.toFixed(2), r.tense.toFixed(2), r.maxStress.toFixed(0), r.endStress.toFixed(0), r.locked.toFixed(2), r.stressByWeek.map((v) => v.toFixed(0)).join('/')].join('\t'))
    }
    console.log('\n' + lines.join('\n'))
  })

  const sustainable = ['3工作1休息 + 約會', '3工作1休息 + 休養', '推薦排程 + 約會']
  const best = Math.max(...sustainable.map((k) => rows[k].gain))

  it('3 work + 1 rest (and the recommended schedule) is the best sustainable pattern', () => {
    for (const k of sustainable) expect(rows[k].gain, k).toBeGreaterThan(rows['2工作2休息 + 約會'].gain)
    for (const k of ['3工作1休息 + 約會', '3工作1休息 + 休養']) {
      expect(rows[k].gain, k).toBeGreaterThanOrEqual(rows['grind4 + 約會'].gain)
      expect(rows[k].gain, k).toBeGreaterThanOrEqual(rows['grind4 + 休養'].gain)
    }
  })

  it('grinding 4 work slots every week is clearly worse (>= 8% lower) whatever you do on weekends', () => {
    expect(rows['grind4 + 休養'].gain).toBeLessThanOrEqual(best * 0.92)
    expect(rows['grind4 + 約會'].gain).toBeLessThanOrEqual(best * 0.92)
  })

  it('the sustainable patterns never collapse, fail, or get stressed out (< 45)', () => {
    for (const k of sustainable) {
      expect(rows[k].infirmary, k).toBeLessThan(0.3)
      expect(rows[k].fails, k).toBeLessThan(0.3)
      expect(rows[k].maxStress, k).toBeLessThan(45)
      expect(rows[k].tense, k).toBeLessThan(0.3)
    }
  })

  it('stress is a reachable mechanic: the grinder is 焦躁 (>= 60) by week 4 and sees failed slots', () => {
    for (const k of ['grind4 + 約會', 'grind4 + 休養']) {
      expect(rows[k].stressByWeek[3], k).toBeGreaterThanOrEqual(60)
      expect(rows[k].maxStress, k).toBeGreaterThanOrEqual(80)
      expect(rows[k].fails, k).toBeGreaterThanOrEqual(1)
      expect(rows[k].fails, k).toBeLessThanOrEqual(3)
      expect(rows[k].tense, k).toBeGreaterThan(3)
      // and it costs infirmary visits / weekends
      expect(rows[k].infirmary, k).toBeGreaterThanOrEqual(1)
      expect(rows[k].locked, k).toBeGreaterThanOrEqual(1)
    }
  })

  it('a short burst is still viable: week 1 of grinding beats week 1 of 3+1', () => {
    const grind = runWeekSchedule(initialCore(), 1, ['techcheck', 'write', 'research', 'qa'], () => 0.99)
    const steady = runWeekSchedule(initialCore(), 1, ['techcheck', 'write', 'research', 'rest'], () => 0.99)
    const total = (s: typeof grind) => Object.values(s.nextState.stats).reduce((a, b) => a + b, 0)
    expect(grind.infirmaryTriggered).toBe(false)
    expect(total(grind)).toBeGreaterThan(total(steady))
  })
})

describe('per-activity numbers', () => {
  it('work slots cost 3-9 stress, social and rest relax', () => {
    for (const a of ACTIVITY_LIST) {
      if (a.id === 'social' || a.id === 'rest') expect(a.stress, a.id).toBeLessThan(0)
      else {
        expect(a.stress, a.id).toBeGreaterThanOrEqual(3)
        expect(a.stress, a.id).toBeLessThanOrEqual(9)
      }
    }
    expect(ACTIVITIES.rest.stamina).toBeGreaterThan(0)
  })

  it('weekend: a date relaxes a little, resting at home a lot', () => {
    expect(WEEKEND.dateStress).toBe(-5)
    expect(WEEKEND.rest.stress).toBe(-20)
  })
})

describe('stress tiers', () => {
  const at = (stress: number, stamina = 80) => ({ ...initialCore(), stress, stamina })

  it('stress >= 60 is 焦躁: work gains x0.75 (rounded, min 1); rest and stress < 60 are unaffected', () => {
    // week 2 theme: qa is themed (ans 6 -> 9)
    const calm = runScheduleSlot(at(59), 2, 'qa', 0, () => 0.99).outcome
    const tense = runScheduleSlot(at(60), 2, 'qa', 0, () => 0.99).outcome
    expect(calm.tense).toBe(false)
    expect(calm.statDelta.ans).toBe(9)
    expect(tense.tense).toBe(true)
    expect(tense.status).toBe('ok')
    expect(tense.statDelta.ans).toBe(7) // round(9 * 0.75)
    const social = runScheduleSlot(at(70), 2, 'social', 0, () => 0.99).outcome
    expect(social.tense).toBe(true) // social counts as work (it just relaxes you afterwards)
    expect(runScheduleSlot(at(70), 2, 'rest', 0, () => 0.99).outcome.tense).toBe(false)
    // never drops a gain to 0
    const minOne = runScheduleSlot(at(60), 1, 'authors', 0, () => 0.99).outcome
    expect(minOne.statDelta.con).toBe(1)
  })

  it('stress >= 80 keeps the 30% fail chance on work only', () => {
    expect(runScheduleSlot(at(79), 1, 'write', 0, () => 0).outcome.status).toBe('ok')
    const fail = runScheduleSlot(at(80), 1, 'write', 0, () => 0.1).outcome
    expect(fail.status).toBe('fail')
    expect(fail.statDelta).toEqual({})
    expect(runScheduleSlot(at(80), 1, 'write', 0, () => 0.3).outcome.status).toBe('ok')
    expect(runScheduleSlot(at(100), 1, 'rest', 0, () => 0).outcome.status).toBe('ok')
    expect(RULES.failChance).toBe(0.3)
  })

  it('stamina < 20 still halves the gains (and stacks with 焦躁)', () => {
    const tired = runScheduleSlot(at(10, 19), 1, 'write', 0, () => 0.99).outcome
    expect(tired.halfTired).toBe(true)
    expect(tired.statDelta.con).toBe(3) // 6 -> 3
    const both = runScheduleSlot(at(65, 19), 1, 'write', 0, () => 0.99).outcome
    expect(both.statDelta.con).toBe(2) // 3 * 0.75 = 2.25 -> 2
  })
})

describe('infirmary week', () => {
  it('collapsing sets the infirmaryWeek flag; a normal week does not', () => {
    const weak = { ...initialCore(), stamina: 10 }
    const collapsed = runWeekSchedule(weak, 1, ['write', 'write', 'write', 'write'], () => 0.99)
    expect(collapsed.infirmaryTriggered).toBe(true)
    expect(collapsed.nextState.flags[INFIRMARY_WEEK_FLAG]).toBe(true)
    // the collapsing slot gave nothing, the rest were cancelled, and only a little stamina came back
    expect(collapsed.outcomes[0].status).toBe('infirmary')
    expect(collapsed.outcomes[0].statDelta).toEqual({})
    expect(collapsed.outcomes.slice(1).every((o) => o.status === 'skipped')).toBe(true)
    expect(collapsed.nextState.stamina).toBe(RULES.infirmaryStamina)

    const fine = runWeekSchedule(initialCore(), 1, ['techcheck', 'write', 'research', 'rest'], () => 0.99)
    expect(fine.infirmaryTriggered).toBe(false)
    expect(fine.nextState.flags[INFIRMARY_WEEK_FLAG]).toBeUndefined()
  })

  it('a failed slot that drains the last stamina is also an infirmary collapse', () => {
    const s = { ...initialCore(), stamina: 5, stress: 90 }
    const res = runWeekSchedule(s, 1, ['write', 'write', 'write', 'write'], () => 0)
    expect(res.outcomes[0].status).toBe('infirmary')
    expect(res.nextState.flags[INFIRMARY_WEEK_FLAG]).toBe(true)
  })
})

describe('schedule preview', () => {
  it('matches what runWeekSchedule really gives and reports the new risks', () => {
    const slots = ['techcheck', 'write', 'research', 'rest'] as const
    const p = previewSchedule(initialCore(), 1, [...slots])
    const r = runWeekSchedule(initialCore(), 1, [...slots], () => 0.99)
    expect(p.stamina).toBe(r.nextState.stamina)
    expect(p.stress).toBe(r.nextState.stress)
    expect(p.infirmaryRisk || p.failRisk || p.tenseRisk || p.tiredRisk).toBe(false)
    for (const k of Object.keys(p.stats) as (keyof typeof p.stats)[]) {
      expect(p.stats[k]).toBe(r.nextState.stats[k] - initialCore().stats[k])
    }

    const stressed = previewSchedule({ ...initialCore(), stress: 62 }, 2, ['qa', 'rest', 'rest', 'rest'])
    expect(stressed.tenseRisk).toBe(true)
    expect(stressed.failRisk).toBe(false)
    const high = previewSchedule({ ...initialCore(), stress: 85 }, 2, ['qa', 'rest', 'rest', 'rest'])
    expect(high.failRisk).toBe(true)
    const empty = previewSchedule({ ...initialCore(), stamina: 10 }, 2, ['qa', 'qa', 'qa', 'qa'])
    expect(empty.infirmaryRisk).toBe(true)
    expect(empty.tiredRisk).toBe(true)
  })
})
