import { describe, expect, it } from 'vitest'
import { TUNING } from '@/systems/score'
import { and, bondIs, evalCond, flag, hasCard, not, or, scoreIs, seen, statIs } from '@/engine/cond'
import { initialCore } from '@/engine/effects'
import type { CondState } from '@/engine/types'

const base = (): CondState => ({ ...initialCore(), seenScenes: ['w1'], unlockedCards: ['canonical'] })

describe('evalCond', () => {
  it('flags: truthy, equals, comparisons, numeric/boolean', () => {
    const s = base()
    s.flags = { blackhat: 2, ok: true, off: false }
    expect(evalCond(flag('ok'), s)).toBe(true)
    expect(evalCond(flag('off'), s)).toBe(false)
    expect(evalCond(flag('nope'), s)).toBe(false)
    expect(evalCond(flag('blackhat'), s)).toBe(true)
    expect(evalCond(flag('blackhat', 'gte', 2), s)).toBe(true)
    expect(evalCond(flag('blackhat', 'lt', 2), s)).toBe(false)
    expect(evalCond(flag('nope', 'eq', 0), s)).toBe(true)
    expect(evalCond(flag('ok', 'eq', true), s)).toBe(true)
    expect(evalCond(flag('blackhat', 'ne', 2), s)).toBe(false)
    expect(evalCond(flag('blackhat', 'gt', 1), s)).toBe(true)
    expect(evalCond(flag('blackhat', 'lte', 1), s)).toBe(false)
  })
  it('stat / bond / score / seen', () => {
    const s = base()
    s.stats.tec = 60
    s.bond.rin = 10
    expect(evalCond(statIs('tec', 'gte', 60), s)).toBe(true)
    expect(evalCond(statIs('tec', 'gt', 60), s)).toBe(false)
    expect(evalCond(bondIs('rin', 'eq', 10), s)).toBe(true)
    // rin weighted stat sum: 3+21+1.5+.5+1.5 = 27.5, scaled by TUNING.statScale, plus bond 10
    const expected = 27.5 * TUNING.statScale + 10
    expect(evalCond(scoreIs('rin', 'gte', expected - 0.01), s)).toBe(true)
    expect(evalCond(scoreIs('rin', 'gt', expected + 0.5), s)).toBe(false)
    expect(evalCond(seen('w1'), s)).toBe(true)
    expect(evalCond(seen('w2'), s)).toBe(false)
    expect(evalCond(hasCard('canonical'), s)).toBe(true)
    expect(evalCond(hasCard('sitemap'), s)).toBe(false)
    expect(evalCond(not(hasCard('sitemap')), s)).toBe(true)
  })
  it('and / or / not', () => {
    const s = base()
    expect(evalCond(and(seen('w1'), not(flag('x'))), s)).toBe(true)
    expect(evalCond(and(seen('w1'), flag('x')), s)).toBe(false)
    expect(evalCond(or(flag('x'), seen('w1')), s)).toBe(true)
    expect(evalCond(or(), s)).toBe(false)
    expect(evalCond(and(), s)).toBe(true)
  })
})
