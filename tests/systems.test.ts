import { describe, expect, it } from 'vitest'
import { initialCore } from '@/engine/effects'
import { determineEnding, pickDateScene } from '@/systems/ending'
import { availableQuests, questDoneFlag } from '@/systems/quests'
import { runWeekSchedule } from '@/systems/schedule'

describe('schedule & quests & ending systems', () => {
  it('applies week theme x1.5 bonus and cancels remaining slots on stamina=0', () => {
    const s = { ...initialCore(), stamina: 20, stress: 10 }
    // Week 1 theme bonus is techcheck (tec+6 -> round(6*1.5)=9).
    // Slot 0: 20 -> 4 stamina (not tired yet at start). Slot 1: 4 -> 0: halfTired, and the slot that collapses yields nothing.
    const res = runWeekSchedule(s, 1, ['techcheck', 'techcheck', 'write', 'authors'], () => 0.99)
    expect(res.infirmaryTriggered).toBe(true)
    expect(res.outcomes[0].statDelta.tec).toBe(9)
    expect(res.outcomes[1].status).toBe('infirmary')
    expect(res.outcomes[1].halfTired).toBe(true)
    expect(res.outcomes[1].statDelta).toEqual({})
    expect(res.nextState.flags.infirmaryWeek).toBe(true)
    expect(res.outcomes[2].status).toBe('skipped')
    expect(res.outcomes[3].status).toBe('skipped')
  })

  it('unlocks side quest chains in order and respects week ranges', () => {
    const w1 = availableQuests(1, {}).map((q) => q.id)
    expect(w1).toEqual(['sq-r1', 'sq-h1'])

    const w2Done = availableQuests(2, { [questDoneFlag('sq-r1')]: true }).map((q) => q.id)
    expect(w2Done).toContain('sq-r2')
    expect(w2Done).not.toContain('sq-r1')
    expect(w2Done).not.toContain('sq-h2')
  })

  it('enforces >= 55 threshold for stage 3 date and ending tie-breakers', () => {
    const low = { ...initialCore(), flags: { 'dateCount.rin': 2 } }
    expect(pickDateScene('rin', low).sceneId).toBe('date-rin-casual')

    const high = {
      ...initialCore(),
      stats: { con: 60, tec: 60, str: 60, ans: 60, tru: 60 },
      bond: { rin: 30, hare: 0, mirai: 0 },
      flags: { 'dateCount.rin': 2 },
    }
    expect(pickDateScene('rin', high).sceneId).toBe('date-rin-3')

    // Tie-breaker: equal scores -> higher bond wins; equal bond -> rin > hare > mirai
    const tied = {
      ...initialCore(),
      stats: { con: 100, tec: 100, str: 100, ans: 100, tru: 100 },
      bond: { rin: 20, hare: 20, mirai: 20 },
    }
    expect(determineEnding(tied)).toBe('end-true')

    const tiedSingle = {
      ...initialCore(),
      stats: { con: 100, tec: 100, str: 100, ans: 100, tru: 100 },
      bond: { rin: 12, hare: 12, mirai: 12 },
    }
    // Without 3rd date or week 6 choice for the top heroine, falls back to normal ending
    expect(determineEnding(tiedSingle)).toBe('end-normal')

    // Tie-breaker picks rin; passing her emotional gate via 3rd date or w6Choice unlocks end-rin
    expect(determineEnding({ ...tiedSingle, flags: { 'dateCount.rin': 3 } })).toBe('end-rin')
    expect(determineEnding({ ...tiedSingle, flags: { w6Choice: 1 } })).toBe('end-rin')

    // Only the top heroine is checked: runner-up meeting the gate does NOT steal the ending
    expect(determineEnding({ ...tiedSingle, flags: { 'dateCount.hare': 3, w6Choice: 2 } })).toBe('end-normal')
  })
})
