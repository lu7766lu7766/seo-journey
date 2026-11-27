import { describe, expect, it } from 'vitest'
import { initialCore } from '@/engine/effects'
import { STAT_KEYS, type StatKey, type Stats } from '@/engine/types'
import { LCP_GOOD, METRIC_META, metricRatio, readStatSnapshot, serpMock, SITE_TOTAL_PAGES, siteMetrics, statSnapshotFlags, type MetricKey } from '@/systems/siteMetrics'

const flat = (v: number): Stats => ({ con: v, tec: v, str: v, ans: v, tru: v })

describe('siteMetrics (simulated dashboard numbers)', () => {
  it('the starting site (all 10) is a believable dead site', () => {
    const m = siteMetrics(initialCore().stats, 0)
    expect(m.indexed).toBeLessThanOrEqual(5)
    expect(m.lcp).toBeGreaterThanOrEqual(4.5)
    expect(m.clicks).toBeLessThanOrEqual(5)
    expect(m.snippets).toBe(0)
    expect(m.aiCites).toBe(0)
    expect(m.mentions).toBe(0)
  })

  it('stats of 80+ are healthy', () => {
    const m = siteMetrics(flat(80))
    expect(m.indexed).toBeGreaterThanOrEqual(SITE_TOTAL_PAGES * 0.7)
    expect(m.lcp).toBeLessThanOrEqual(LCP_GOOD)
    expect(m.clicks).toBeGreaterThanOrEqual(200)
    expect(m.snippets).toBeGreaterThanOrEqual(8)
    expect(m.aiCites).toBeGreaterThanOrEqual(5)
    expect(m.mentions).toBeGreaterThanOrEqual(12)
  })

  it('is monotonic in every driver (and ignores stats that do not drive a metric)', () => {
    for (const meta of METRIC_META) {
      for (const k of STAT_KEYS) {
        let prev: number | null = null
        for (let v = 0; v <= 100; v += 1) {
          const stats = { ...flat(40), [k]: v } as Stats
          const val = siteMetrics(stats)[meta.key]
          if (prev !== null) {
            if (!meta.drivers.includes(k)) expect(val, `${meta.key} should not depend on ${k}`).toBe(prev)
            else if (meta.lowerIsBetter) expect(val, `${meta.key}/${k}@${v}`).toBeLessThanOrEqual(prev)
            else expect(val, `${meta.key}/${k}@${v}`).toBeGreaterThanOrEqual(prev)
          }
          prev = val
        }
      }
    }
  })

  it('every driver actually matters (10 -> 100 moves the metric)', () => {
    for (const meta of METRIC_META) {
      for (const k of meta.drivers) {
        const lo = siteMetrics({ ...flat(10) } as Stats)[meta.key]
        const hi = siteMetrics({ ...flat(10), [k]: 100 } as Stats)[meta.key]
        expect(hi, `${meta.key}/${k}`).not.toBe(lo)
      }
    }
  })

  it('grows with the week (and stays monotonic)', () => {
    for (let w = 1; w <= 6; w++) {
      expect(siteMetrics(flat(60), w).clicks).toBeGreaterThanOrEqual(siteMetrics(flat(60), w - 1).clicks)
      expect(siteMetrics(flat(60), w).indexed).toBeGreaterThanOrEqual(siteMetrics(flat(60), w - 1).indexed)
    }
  })

  it('stays within bounds and never produces NaN, even for out-of-range or broken input', () => {
    const weird: Stats[] = [flat(0), flat(100), flat(-50), flat(250), flat(Number.NaN), { con: 100, tec: 0, str: 100, ans: 0, tru: 50 }]
    for (const s of weird) {
      for (const w of [0, 3, 6, 99, Number.NaN]) {
        const m = siteMetrics(s, w)
        for (const [k, v] of Object.entries(m)) {
          expect(Number.isFinite(v), `${k}=${v}`).toBe(true)
          expect(v).toBeGreaterThanOrEqual(0)
        }
        expect(m.indexed).toBeLessThanOrEqual(SITE_TOTAL_PAGES)
        expect(m.lcp).toBeLessThanOrEqual(4.8)
        expect(m.lcp).toBeGreaterThanOrEqual(1)
        for (const meta of METRIC_META) {
          const r = metricRatio(meta.key as MetricKey, m)
          expect(r).toBeGreaterThanOrEqual(0)
          expect(r).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('the SERP mock improves with the stats (bare -> basic -> rich)', () => {
    const a = serpMock(flat(10))
    const b = serpMock(flat(45))
    const c = serpMock(flat(85))
    expect([a.tier, b.tier, c.tier]).toEqual(['bare', 'basic', 'rich'])
    expect(a.title).toBe('404 號社辦')
    expect(a.sitelinks).toHaveLength(0)
    expect(b.title.length).toBeGreaterThan(a.title.length)
    expect(c.sitelinks.length).toBeGreaterThanOrEqual(2)
    expect(c.aiChip).toBeTruthy()
    expect(b.aiChip).toBeNull()
  })

  it('the weekly stat snapshot round-trips through flags', () => {
    const s: Stats = { con: 12, tec: 30, str: 7, ans: 55, tru: 100 }
    expect(readStatSnapshot(statSnapshotFlags(s))).toEqual(s)
    expect(readStatSnapshot({})).toBeNull()
    expect(readStatSnapshot({ 'wk0.con': 1 })).toBeNull()
    const keys: StatKey[] = [...STAT_KEYS]
    expect(Object.keys(statSnapshotFlags(s)).length).toBe(keys.length)
  })
})
