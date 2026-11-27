import { describe, expect, it } from 'vitest'
import { loadScene } from '@/content/scenes'
import type { ChoiceOpt, Cmd, Cond, HeroineId } from '@/engine/types'

/**
 * Story-flow guards for the main path: payoffs, foundations, heroine balance, pacing and the
 * interactive festival pitch. (Length/time ceilings live in scriptLint.test.ts, floors in mainDepth.test.ts.)
 */
const MAIN = ['prologue', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'festival']
const WEEKS = ['w1', 'w2', 'w3', 'w4', 'w5']
const ENDINGS_WITH_CALLBACK = ['end-true', 'end-rin', 'end-hare', 'end-mirai', 'end-normal']
const FOUNDATION_CARDS = ['redirects', 'canonical', 'duplicate-content', 'internal-links', 'image-optimization', 'alt-text', 'question-headings']

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

function condNodes(c: Cond, out: Cond[] = []): Cond[] {
  out.push(c)
  if (c.t === 'and') c.all.forEach((x) => condNodes(x, out))
  if (c.t === 'or') c.any.forEach((x) => condNodes(x, out))
  if (c.t === 'not') condNodes(c.cond, out)
  return out
}

/** every condition used by `if` commands and by choice options in a scene */
function sceneConds(cmds: Cmd[]): Cond[] {
  const out: Cond[] = []
  for (const c of walk(cmds)) {
    if (c.k === 'if') condNodes(c.cond, out)
    if (c.k === 'choice') for (const o of c.options) if (o.cond) condNodes(o.cond, out)
  }
  return out
}

/** longest run of consecutive `say` lines by one speaker (me / narr excluded). Stage directions and cards do not break a run. */
function longestRun(cmds: Cmd[]): number {
  const TRANSPARENT = new Set(['show', 'hide', 'sfx', 'bgm', 'wait', 'card'])
  let best = 0
  let who = ''
  let n = 0
  const reset = () => { who = ''; n = 0 }
  for (const c of cmds) {
    if (c.k === 'say') {
      if (c.who === 'me' || c.who === 'narr') { reset(); continue }
      if (c.who === who) n++
      else { who = c.who; n = 1 }
      best = Math.max(best, n)
    } else if (!TRANSPARENT.has(c.k)) {
      reset()
      if (c.k === 'choice') for (const o of c.options) best = Math.max(best, longestRun(o.then ?? []))
      if (c.k === 'if') best = Math.max(best, longestRun(c.then), longestRun(c.else ?? []))
    }
  }
  return best
}

const sayCount = (cmds: Cmd[], who: string) => [...walk(cmds)].filter((c) => c.k === 'say' && c.who === who).length

describe('main story flow', () => {
  it('the rain-night choice (w6Choice) pays off in the five endings that have a heroine to remember', async () => {
    for (const id of ENDINGS_WITH_CALLBACK) {
      const conds = sceneConds((await loadScene(id)).cmds)
      const values = conds.filter((c) => c.t === 'flag' && c.key === 'w6Choice').map((c) => (c.t === 'flag' ? c.value : undefined))
      expect(values.length, `${id} reads w6Choice`).toBeGreaterThan(0)
      // the callback must distinguish who was chosen (1 = rin, 2 = hare, 3 = mirai)
      expect(new Set(values).size, `${id} distinguishes at least two routes`).toBeGreaterThanOrEqual(2)
    }
  })

  it('the heroine endings give the strongest callback to their own rainy night', async () => {
    const own: Record<string, number> = { 'end-rin': 1, 'end-hare': 2, 'end-mirai': 3 }
    for (const [id, route] of Object.entries(own)) {
      const cmds = (await loadScene(id)).cmds
      const lines = (n: number) => {
        let best = 0
        for (const c of walk(cmds)) {
          if (c.k === 'if' && c.cond.t === 'flag' && c.cond.key === 'w6Choice' && c.cond.value === n) best = Math.max(best, c.then.filter((x) => x.k === 'say').length)
        }
        return best
      }
      expect(lines(route), `${id} own-route callback`).toBeGreaterThanOrEqual(2)
      for (const other of [1, 2, 3].filter((n) => n !== route)) expect(lines(route), `${id} vs route ${other}`).toBeGreaterThanOrEqual(lines(other))
    }
  })

  it('the 7 foundation cards are unlocked on the main path', async () => {
    const cards = new Set<string>()
    for (const id of MAIN) for (const c of walk((await loadScene(id)).cmds)) if (c.k === 'card') cards.add(c.id)
    for (const k of FOUNDATION_CARDS) expect(cards.has(k), `main path misses card ${k}`).toBe(true)
  })

  it('Hare has real screen time and no heroine dominates the main lines', async () => {
    const lines: Record<HeroineId, number> = { rin: 0, hare: 0, mirai: 0 }
    let hareWeeks = 0
    for (const id of MAIN) {
      const cmds = (await loadScene(id)).cmds
      for (const h of ['rin', 'hare', 'mirai'] as const) lines[h] += sayCount(cmds, h)
      if (WEEKS.includes(id)) hareWeeks += sayCount(cmds, 'hare')
    }
    expect(hareWeeks, 'hare lines in w1-w5').toBeGreaterThanOrEqual(25)
    for (const id of WEEKS) expect(sayCount((await loadScene(id)).cmds, 'hare'), `hare in ${id}`).toBeGreaterThanOrEqual(3)
    const mean = (lines.rin + lines.hare + lines.mirai) / 3
    for (const h of ['rin', 'hare', 'mirai'] as const) {
      expect(lines[h], `${h} total main lines ${JSON.stringify(lines)}`).toBeGreaterThanOrEqual(mean * 0.8)
      expect(lines[h], `${h} total main lines ${JSON.stringify(lines)}`).toBeLessThanOrEqual(mean * 1.2)
    }
  })

  it('no main scene lectures: at most 4 consecutive lines by one explaining speaker', async () => {
    for (const id of MAIN) expect(longestRun((await loadScene(id)).cmds), id).toBeLessThanOrEqual(4)
  })

  it('weeks 1-5 each contain a genuine trade-off: every option is a fair pick (no penalty, no blackhat)', async () => {
    for (const id of WEEKS) {
      const choices = [...walk((await loadScene(id)).cmds)].filter((c): c is Extract<Cmd, { k: 'choice' }> => c.k === 'choice')
      const fair = choices.filter(
        (c) =>
          c.options.length >= 2 &&
          c.options.every((o) => {
            const e = o.effects
            const bonds = Object.values(e?.bond ?? {})
            return bonds.every((b) => (b ?? 0) >= 0) && !(e?.inc?.blackhat) && !e?.flags?.kuroPending
          }) &&
          // distinct nudges: no two options have identical effects
          new Set(c.options.map((o) => JSON.stringify(o.effects ?? {}))).size === c.options.length,
      )
      expect(fair.length, `${id} has a trade-off choice`).toBeGreaterThanOrEqual(1)
    }
  })

  it('weeks 1, 2, 3, 5 and 6 react to how close the player is to the heroine', async () => {
    for (const id of ['w1', 'w2', 'w3', 'w5', 'w6']) {
      const bonds = sceneConds((await loadScene(id)).cmds).filter((c) => c.t === 'bond')
      expect(bonds.length, `${id} uses bondIs`).toBeGreaterThanOrEqual(2)
    }
  })

  it('the festival pitch: exactly 3 choices, each with an unconditional fallback and a +2 matching point', async () => {
    const fes = await loadScene('festival')
    const choices = [...walk(fes.cmds)].filter((c): c is Extract<Cmd, { k: 'choice' }> => c.k === 'choice')
    expect(choices).toHaveLength(3)
    const judges: HeroineId[] = ['rin', 'hare', 'mirai']
    choices.forEach((c, i) => {
      expect(c.options.length, `round ${i + 1}`).toBe(3)
      expect(c.options.some((o) => !o.cond), `round ${i + 1} fallback`).toBe(true)
      expect(c.options.some((o) => o.cond?.t === 'card'), `round ${i + 1} uses hasCard`).toBe(true)
      const matches = c.options.filter((o: ChoiceOpt) => (o.effects?.bond?.[judges[i]] ?? 0) > 0)
      expect(matches, `round ${i + 1} has one matching point`).toHaveLength(1)
      expect(matches[0].effects?.bond?.[judges[i]], `round ${i + 1} bonus`).toBe(2)
      expect(matches[0].cond, 'the matching point needs the topic to be learned').toBeDefined()
      for (const o of c.options) {
        const total = Object.values(o.effects?.bond ?? {}).reduce((a, b) => a + (b ?? 0), 0)
        expect(total, `round ${i + 1} option bond`).toBeLessThanOrEqual(2)
        expect(o.then?.some((x) => x.k === 'say'), `round ${i + 1} reaction`).toBe(true)
      }
    })
  })
})
