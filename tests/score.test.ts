import { describe, expect, it } from 'vitest'
import { score, scores, WEIGHTS } from '@/systems/score'
import { STAT_KEYS } from '@/engine/types'

const stats = (v: number) => ({ con: v, tec: v, str: v, ans: v, tru: v })

describe('score', () => {
  it('weights sum to 1', () => {
    for (const h of Object.values(WEIGHTS)) expect(STAT_KEYS.reduce((a, k) => a + h[k], 0)).toBeCloseTo(1)
  })
  it('matches the plan formula', () => {
    const st = { con: 50, tec: 80, str: 20, ans: 10, tru: 40 }
    // rin: 15+28+3+.5+6 = 52.5 (+bond 5)
    expect(score('rin', st, { rin: 5, hare: 0, mirai: 0 })).toBeCloseTo(57.5)
    // hare: 12.5+4+5+4+2 = 27.5
    expect(score('hare', st, { rin: 0, hare: 0, mirai: 0 })).toBeCloseTo(27.5)
    // mirai: 15+4+2+1.5+16 = 38.5 (-10)
    expect(score('mirai', st, { rin: 0, hare: 0, mirai: -10 })).toBeCloseTo(28.5)
  })
  it('clamps to 0..100', () => {
    expect(score('rin', stats(100), { rin: 40, hare: 0, mirai: 0 })).toBe(100)
    expect(score('rin', stats(0), { rin: -20, hare: 0, mirai: 0 })).toBe(0)
    expect(scores(stats(10), { rin: 0, hare: 0, mirai: 0 })).toEqual({ rin: expect.closeTo(10), hare: expect.closeTo(10), mirai: expect.closeTo(10) })
  })
})
