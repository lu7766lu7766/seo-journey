import { describe, expect, it } from 'vitest'
import type { ActivityId } from '@/content/activityIds'
import { applyEffects, initialCore } from '@/engine/effects'
import type { CoreState, HeroineId } from '@/engine/types'
import { determineEnding, pickDateScene, type EndingId } from '@/systems/ending'
import { availableQuests, MAX_QUESTS_PER_WEEK, questDoneFlag } from '@/systems/quests'
import { runWeekSchedule } from '@/systems/schedule'

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

const SQ_REWARDS: Record<string, Parameters<typeof applyEffects>[1]> = {
  'sq-r1': { stats: { tec: 8 }, bond: { rin: 5 } },
  'sq-r2': { stats: { str: 6, tec: 4 }, bond: { rin: 5 } },
  'sq-r3': { stats: { tec: 6, con: 4 }, bond: { rin: 8 } },
  'sq-h1': { stats: { str: 6, ans: 4 }, bond: { hare: 5 } },
  'sq-h2': { stats: { con: 5, ans: 5 }, bond: { hare: 5 } },
  'sq-h3': { stats: { ans: 8 }, bond: { hare: 8 } },
  'sq-m1': { stats: { tru: 8 }, bond: { mirai: 5 } },
  'sq-m2': { stats: { tec: 4, tru: 4 }, bond: { mirai: 5 } },
  'sq-m3': { stats: { con: 6, tru: 4 }, bond: { mirai: 8 } },
  'sq-x1': { stats: { tru: 6 }, bond: { rin: 2, hare: 2, mirai: 2 } },
}

const DATE_BOND: Record<HeroineId, number> = { rin: 5, hare: 5, mirai: 5 }

type Strategy = 'focus-rin' | 'focus-hare' | 'focus-mirai' | 'balanced-sq' | 'random' | 'rest-all' | 'blackhat-2'

function simulateRun(strategy: Strategy, rng: () => number): EndingId {
  let state: CoreState = initialCore()

  // Prologue choice
  if (strategy === 'focus-rin' || strategy === 'balanced-sq') state = applyEffects(state, { bond: { rin: 4 } })
  else if (strategy === 'random') state = applyEffects(state, { bond: { rin: rng() < 0.5 ? 2 : 0 } })

  for (let week = 1; week <= 6; week++) {
    // Weekly main story choice + minigame
    if (strategy === 'focus-rin') {
      if (week === 1) state = applyEffects(state, { bond: { rin: 5 }, stats: { tec: 3 } })
      if (week === 4) state = applyEffects(state, { bond: { rin: 3, hare: 3, mirai: 3 } })
      if (week === 6) state = applyEffects(state, { bond: { rin: 8 } })
    } else if (strategy === 'focus-hare') {
      if (week === 2) state = applyEffects(state, { bond: { hare: 6 } })
      if (week === 4) state = applyEffects(state, { bond: { rin: 3, hare: 3, mirai: 3 } })
      if (week === 6) state = applyEffects(state, { bond: { hare: 8 } })
    } else if (strategy === 'focus-mirai') {
      if (week === 3) state = applyEffects(state, { bond: { mirai: 6 } })
      if (week === 4) state = applyEffects(state, { bond: { rin: 3, hare: 3, mirai: 3 } })
      if (week === 5) state = applyEffects(state, { bond: { mirai: 6 }, stats: { tru: 4 } })
      if (week === 6) state = applyEffects(state, { bond: { mirai: 8 } })
    } else if (strategy === 'balanced-sq') {
      if (week === 1) state = applyEffects(state, { bond: { rin: 5 }, stats: { tec: 3 } })
      if (week === 2) state = applyEffects(state, { bond: { hare: 6 } })
      if (week === 3) state = applyEffects(state, { bond: { mirai: 6 } })
      if (week === 4) state = applyEffects(state, { bond: { rin: 3, hare: 3, mirai: 3 } })
      if (week === 5) state = applyEffects(state, { bond: { mirai: 6 }, stats: { tru: 4 } })
      if (week === 6) state = applyEffects(state, { bond: { [(['rin', 'hare', 'mirai'] as const)[Math.floor(rng() * 3)]]: 8 } })
    } else if (strategy === 'blackhat-2') {
      if (week === 4) state = applyEffects(state, { inc: { blackhat: 1 }, stats: { con: 15 }, bond: { rin: -3, hare: -3, mirai: -3 } })
      if (week === 6) state = applyEffects(state, { inc: { blackhat: 1 }, stats: { con: -20, tru: -10 } })
    } else if (strategy === 'random') {
      if (week === 1 && rng() < 0.5) state = applyEffects(state, { bond: { rin: 5 }, stats: { tec: 3 } })
      if (week === 2 && rng() < 0.5) state = applyEffects(state, { bond: { hare: 4 } })
      if (week === 3 && rng() < 0.5) state = applyEffects(state, { bond: { mirai: 4 } })
      if (week === 4 && rng() < 0.15) state = applyEffects(state, { inc: { blackhat: 1 } })
      if (week === 6) {
        const who = (['rin', 'hare', 'mirai'] as const)[Math.floor(rng() * 3)]
        state = applyEffects(state, { bond: { [who]: 8 } })
      }
    }

    // Pick 4 schedule slots
    const slots: ActivityId[] = []
    if (strategy === 'rest-all') {
      slots.push('rest', 'rest', 'rest', 'rest')
    } else if (strategy === 'focus-rin') {
      slots.push('techcheck', 'write', week === 3 ? 'schema' : 'techcheck', 'rest')
    } else if (strategy === 'focus-hare') {
      slots.push('qa', 'research', 'schema', 'rest')
    } else if (strategy === 'focus-mirai') {
      slots.push('authors', 'write', 'qa', 'rest')
    } else if (strategy === 'balanced-sq') {
      const cycle: ActivityId[][] = [
        ['techcheck', 'write', 'authors', 'rest'],
        ['qa', 'research', 'schema', 'rest'],
        ['schema', 'authors', 'techcheck', 'rest'],
        ['techcheck', 'qa', 'write', 'rest'],
        ['authors', 'write', 'schema', 'rest'],
        ['write', 'authors', 'qa', 'rest'],
      ]
      slots.push(...cycle[week - 1])
    } else {
      const pool: ActivityId[] = ['write', 'research', 'techcheck', 'schema', 'qa', 'authors', 'social', 'rest']
      for (let i = 0; i < 4; i++) slots.push(pool[Math.floor(rng() * pool.length)])
    }

    state = runWeekSchedule(state, week, slots, rng).nextState

    // Side quests
    const avail = availableQuests(week, state.flags)
    if (strategy === 'balanced-sq') {
      for (const q of avail.slice(0, MAX_QUESTS_PER_WEEK)) {
        state = applyEffects(state, SQ_REWARDS[q.id])
        state = applyEffects(state, { flags: { [questDoneFlag(q.id)]: true } })
      }
    } else if (strategy === 'focus-rin' || strategy === 'focus-hare' || strategy === 'focus-mirai') {
      const target = strategy.replace('focus-', '') as HeroineId
      for (const q of avail.filter((x) => x.heroine === target).slice(0, MAX_QUESTS_PER_WEEK)) {
        state = applyEffects(state, SQ_REWARDS[q.id])
        state = applyEffects(state, { flags: { [questDoneFlag(q.id)]: true } })
      }
    } else if (strategy === 'random' && avail.length > 0 && rng() < 0.3) {
      const q = avail[Math.floor(rng() * avail.length)]
      state = applyEffects(state, SQ_REWARDS[q.id])
      state = applyEffects(state, { flags: { [questDoneFlag(q.id)]: true } })
    }

    // Weekend action
    if (strategy === 'rest-all') {
      state = applyEffects(state, { stamina: 25, stress: -15 })
    } else if (strategy === 'focus-rin' || strategy === 'focus-hare' || strategy === 'focus-mirai') {
      const who = strategy.replace('focus-', '') as HeroineId
      const pick = pickDateScene(who, state)
      state = applyEffects(state, { bond: { [who]: DATE_BOND[who] } })
      if (pick.increment) state = applyEffects(state, { inc: { [`dateCount.${who}`]: 1 } })
    } else if (strategy === 'balanced-sq') {
      const who = (['rin', 'hare', 'mirai'] as const)[(week - 1) % 3]
      const pick = pickDateScene(who, state)
      state = applyEffects(state, { bond: { [who]: DATE_BOND[who] } })
      if (pick.increment) state = applyEffects(state, { inc: { [`dateCount.${who}`]: 1 } })
    } else if (rng() < 0.5) {
      const who = (['rin', 'hare', 'mirai'] as const)[Math.floor(rng() * 3)]
      state = applyEffects(state, { bond: { [who]: 3 } })
    } else {
      state = applyEffects(state, { stamina: 25, stress: -15 })
    }
  }

  return determineEnding(state)
}

function runBatch(strategy: Strategy, n = 1000): Record<EndingId, number> {
  const rng = makeRng(20261125)
  const counts: Record<EndingId, number> = {
    'end-blackhat': 0,
    'end-true': 0,
    'end-rin': 0,
    'end-hare': 0,
    'end-mirai': 0,
    'end-normal': 0,
    'end-bad': 0,
  }
  for (let i = 0; i < n; i++) counts[simulateRun(strategy, rng)]++
  return counts
}

describe('balance simulation (plan §7.3)', () => {
  it('focusing on a heroine yields >= 80% her ending', () => {
    expect(runBatch('focus-rin')['end-rin']).toBeGreaterThanOrEqual(800)
    expect(runBatch('focus-hare')['end-hare']).toBeGreaterThanOrEqual(800)
    expect(runBatch('focus-mirai')['end-mirai']).toBeGreaterThanOrEqual(800)
  })

  it('balanced play + side quests + good choices yields >= 60% true ending', () => {
    expect(runBatch('balanced-sq')['end-true']).toBeGreaterThanOrEqual(600)
  })

  it('random play yields majority normal ending', () => {
    const res = runBatch('random')
    expect(res['end-normal']).toBeGreaterThan(500)
  })

  it('all rest yields bad ending', () => {
    expect(runBatch('rest-all')['end-bad']).toBe(1000)
  })

  it('accepting blackhat twice yields blackhat ending 100%', () => {
    expect(runBatch('blackhat-2')['end-blackhat']).toBe(1000)
  })
})
