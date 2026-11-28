/**
 * Balance regression: plays the REAL scenes with the REAL schedule/quest/date/ending logic
 * (tests/fullSim.ts) under different player behaviours, fixed seeds. If you change any bond/stat number,
 * threshold, weight or TUNING value, this tells you what happened to the ending distribution.
 * Set BALANCE_REPORT=1 to print the full table.
 */
import { describe, expect, it } from 'vitest'
import { HEROINES } from '@/engine/types'
import { ENDING_ORDER, POLICIES, makeRng, simulateRun } from './fullSim'
import type { EndingId } from '@/systems/ending'

const N = 200
const cache = new Map<string, Promise<{ pct: Record<EndingId, number>; avg: Record<string, number>; third: number }>>()

function batch(key: string) {
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const rng = makeRng(20261125)
      const counts = Object.fromEntries(ENDING_ORDER.map((e) => [e, 0])) as Record<EndingId, number>
      const avg: Record<string, number> = { rin: 0, hare: 0, mirai: 0 }
      let third = 0
      for (let i = 0; i < N; i++) {
        const r = await simulateRun(POLICIES[key], rng)
        counts[r.ending]++
        for (const h of HEROINES) avg[h] += r.scores[h] / N
        if (HEROINES.some((h) => Number(r.state.flags[`dateCount.${h}`] ?? 0) >= 3)) third++
      }
      const pct = Object.fromEntries(ENDING_ORDER.map((e) => [e, (counts[e] / N) * 100])) as Record<EndingId, number>
      return { pct, avg, third: (third / N) * 100 }
    })())
  }
  return cache.get(key)!
}

describe('ending balance on real content', () => {
  it('prints the table when BALANCE_REPORT=1', async () => {
    if (!process.env.BALANCE_REPORT) return
    const rows = ['策略\t' + ENDING_ORDER.map((e) => e.replace('end-', '')).join('\t') + '\t分數 凜/晴/未\t3rd約會']
    for (const k of Object.keys(POLICIES)) {
      const b = await batch(k)
      rows.push([POLICIES[k].name.slice(0, 10), ...ENDING_ORDER.map((e) => `${Math.round(b.pct[e])}%`), HEROINES.map((h) => b.avg[h].toFixed(0)).join('/'), `${Math.round(b.third)}%`].join('\t'))
    }
    console.log('\n' + rows.join('\n'))
  }, 120000)

  it('neglect leads to the bad ending; the blackhat path is actually reachable', async () => {
    expect((await batch('neglect')).pct['end-bad']).toBeGreaterThanOrEqual(95)
    expect((await batch('tempted-blackhat')).pct['end-blackhat']).toBeGreaterThanOrEqual(95)
  })

  it('committing to one heroine gives her ending (and never the true ending)', async () => {
    for (const h of HEROINES) {
      const f = await batch(`focus-${h}`)
      expect(f.pct[`end-${h}` as EndingId], `focus-${h}`).toBeGreaterThanOrEqual(95)
      expect(f.pct['end-true']).toBe(0)
    }
  })

  it('leaning on a heroine (4 of 6 weekends) matters: her ending dominates, and she gets her 3rd date', async () => {
    for (const h of HEROINES) {
      const l = await batch(`lean-${h}`)
      expect(l.pct[`end-${h}` as EndingId], `lean-${h}`).toBeGreaterThanOrEqual(85)
      expect(l.pct['end-true'], `lean-${h} true`).toBeLessThanOrEqual(15)
      expect(l.third).toBeGreaterThanOrEqual(90)
    }
  })

  it('the true ending rewards care but is not handed out for button-mashing', async () => {
    expect((await batch('attentive-balanced')).pct['end-true']).toBeGreaterThanOrEqual(70)
    const decent = (await batch('decent')).pct['end-true']
    expect(decent).toBeGreaterThanOrEqual(45)
    expect(decent).toBeLessThanOrEqual(90)
    expect((await batch('lazy-clicker')).pct['end-true']).toBeLessThanOrEqual(25)
  })

  it('lazy clicking without romantic commitment rarely triggers a personal confession ending', async () => {
    const lazy = await batch('lazy-clicker')
    const personal = lazy.pct['end-rin'] + lazy.pct['end-hare'] + lazy.pct['end-mirai']
    expect(personal).toBeLessThan(30)
    expect(lazy.pct['end-normal']).toBeGreaterThanOrEqual(60)
  })

  it('half-hearted and random play mostly end normally; the true ending is essentially unreachable', async () => {
    const half = await batch('half-engaged')
    expect(half.pct['end-true']).toBeLessThanOrEqual(5)
    expect(half.pct['end-normal']).toBeGreaterThanOrEqual(60)
    const rnd = await batch('casual-random')
    expect(rnd.pct['end-true']).toBeLessThanOrEqual(3)
    expect(rnd.pct['end-normal']).toBeGreaterThanOrEqual(50)
    expect(rnd.pct['end-bad']).toBeLessThanOrEqual(30)
  })

  it('never looking at the stamina bar is punished: the blind random player ends clearly worse than the aware one', async () => {
    const aware = await batch('casual-random')
    const blind = await batch('blind-random')
    expect(blind.pct['end-true']).toBeLessThanOrEqual(3)
    expect(blind.pct['end-bad']).toBeGreaterThan(aware.pct['end-bad'] + 10)
    expect(blind.pct['end-normal']).toBeLessThan(aware.pct['end-normal'])
  })

  it('every one of the 7 endings is reachable (>= 10% for at least one behaviour)', async () => {
    for (const e of ENDING_ORDER) {
      let best = 0
      for (const k of Object.keys(POLICIES)) best = Math.max(best, (await batch(k)).pct[e])
      expect(best, e).toBeGreaterThanOrEqual(10)
    }
  })
})
