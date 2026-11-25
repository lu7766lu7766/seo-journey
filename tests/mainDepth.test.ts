import { describe, expect, it } from 'vitest'
import { loadScene } from '@/content/scenes'
import type { Cmd, Cond } from '@/engine/types'
import { countCmds, countScene, estimateMinutes } from '@/systems/estimate'

/**
 * Story-depth guard: the main story must not regress to a thin skeleton.
 *
 * The ceiling (main path <= 30 min / <= 10,000 chars, tests/scriptLint.test.ts) and these floors
 * bound the same quantity from both sides. Fixed costs on the main path (4 minigames, 6 scheduling
 * rounds, 6 dates) already take ~12.8 minutes, so the floors sit just under the current writing.
 */
const FLOORS: Record<string, number> = {
  prologue: 750,
  w1: 500,
  w2: 480,
  w3: 480,
  w4: 500,
  w5: 500,
  w6: 750,
  festival: 500,
  'end-blackhat': 500,
  'end-true': 500,
  'end-rin': 500,
  'end-hare': 500,
  'end-mirai': 500,
  'end-normal': 500,
  'end-bad': 500,
}

const MAIN = ['prologue', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'festival']
const DATES = ['date-rin-1', 'date-rin-2', 'date-rin-3', 'date-hare-1', 'date-hare-2', 'date-hare-3']

function* walk(cmds: Cmd[]): Generator<Cmd> {
  for (const c of cmds) {
    yield c
    if (c.k === 'choice') for (const o of c.options) yield* walk(o.then ?? [])
    if (c.k === 'if') {
      yield* walk(c.then)
      yield* walk(c.else ?? [])
    }
  }
}

function maxCardRun(cmds: Cmd[]): number {
  let best = 0
  let run = 0
  for (const c of cmds) {
    run = c.k === 'card' ? run + 1 : c.k === 'sfx' || c.k === 'wait' ? run : 0
    best = Math.max(best, run)
    if (c.k === 'choice') for (const o of c.options) best = Math.max(best, maxCardRun(o.then ?? []))
    if (c.k === 'if') best = Math.max(best, maxCardRun(c.then), maxCardRun(c.else ?? []))
  }
  return best
}

const condKeys = (c: Cond, out: string[] = []): string[] => {
  if (c.t === 'flag') out.push(c.key)
  if (c.t === 'and') c.all.forEach((x) => condKeys(x, out))
  if (c.t === 'or') c.any.forEach((x) => condKeys(x, out))
  if (c.t === 'not') condKeys(c.cond, out)
  return out
}

describe('main story depth', () => {
  it('every main scene and ending stays above its length floor', async () => {
    for (const [id, floor] of Object.entries(FLOORS)) {
      const { chars } = countScene(await loadScene(id))
      expect(chars, `${id} chars`).toBeGreaterThanOrEqual(floor)
    }
  })

  it('main-path estimate stays within 30 minutes', async () => {
    const ids = [...MAIN, ...DATES, 'end-true']
    const total = { chars: 0, lines: 0, choices: 0, minigames: 0 }
    for (const id of ids) {
      const s = countScene(await loadScene(id))
      total.chars += s.chars
      total.lines += s.lines
      total.choices += s.choices
      total.minigames += s.minigames
    }
    expect(total.chars).toBeLessThanOrEqual(10000)
    expect(estimateMinutes(total, 6)).toBeLessThanOrEqual(30)
  })

  it('knowledge cards are spread out (never 3 in a row)', async () => {
    for (const id of MAIN) expect(maxCardRun((await loadScene(id)).cmds), id).toBeLessThanOrEqual(2)
  })

  it('week 6 keeps its contract: route flags, bond +5, 150-200 char rain scenes', async () => {
    const w6 = await loadScene('w6')
    const routes = [...walk(w6.cmds)].filter((c) => c.k === 'choice' && c.options.some((o) => o.effects?.flags?.w6Choice))
    expect(routes).toHaveLength(1)
    const route = routes[0]
    if (route.k !== 'choice') throw new Error('unreachable')
    const who = ['rin', 'hare', 'mirai'] as const
    route.options.forEach((o, i) => {
      expect(o.effects?.flags?.w6Choice).toBe(i + 1)
      expect(o.effects?.bond?.[who[i]]).toBe(5)
      const { chars } = countCmds(o.then ?? [])
      expect(chars, `route ${i + 1}`).toBeGreaterThanOrEqual(150)
      expect(chars, `route ${i + 1}`).toBeLessThanOrEqual(200)
    })
    const keys = [...walk(w6.cmds)].flatMap((c) => (c.k === 'if' ? condKeys(c.cond) : []))
    expect(keys).toContain('blackhat')
    expect(keys).toContain('kuroPending')
  })

  it('festival gives every judge three score tiers via scoreIs', async () => {
    const fes = await loadScene('festival')
    const seen = new Set<string>()
    const walkConds = (cmds: Cmd[]) => {
      for (const c of cmds) {
        if (c.k !== 'if') continue
        const grab = (cond: Cond) => {
          if (cond.t === 'score') seen.add(`${cond.who}:${cond.op}:${cond.value}`)
          if (cond.t === 'and') cond.all.forEach(grab)
        }
        grab(c.cond)
        walkConds(c.then)
        walkConds(c.else ?? [])
      }
    }
    walkConds(fes.cmds)
    for (const who of ['rin', 'hare', 'mirai']) {
      expect(seen.has(`${who}:gte:65`), `${who} >=65`).toBe(true)
      expect(seen.has(`${who}:gte:40`), `${who} >=40`).toBe(true)
    }
  })
})
