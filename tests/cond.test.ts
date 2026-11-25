import { describe, expect, it } from 'vitest'
import { and, bondIs, evalCond, flag, not, or, scoreIs, seen, statIs } from '@/engine/cond'
import { initialCore } from '@/engine/effects'
import type { CondState } from '@/engine/types'

const base = (): CondState => ({ ...initialCore(), seenScenes: ['w1'] })

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
    // rin: 10*.3+60*.35+10*.15+10*.05+10*.15 +10 = 3+21+1.5+.5+1.5+10 = 37.5
    expect(evalCond(scoreIs('rin', 'gte', 37.5), s)).toBe(true)
    expect(evalCond(scoreIs('rin', 'gt', 38), s)).toBe(false)
    expect(evalCond(seen('w1'), s)).toBe(true)
    expect(evalCond(seen('w2'), s)).toBe(false)
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
