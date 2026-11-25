import { describe, expect, it } from 'vitest'
import { bg, choice, effect, minigame, opt, say, scene, show, wait, when, card } from '@/engine'
import { flag, bondIs } from '@/engine/cond'
import { SceneRunner } from '@/engine/runner'
import { makeHost } from './helpers'

describe('SceneRunner', () => {
  it('steps through say lines with stable ids and {name} substitution', () => {
    const { host, emitted } = makeHost('小明')
    const r = new SceneRunner(scene('t', [bg('gate'), say('narr', undefined, '你好，{name}'), say('rin', 'smile', '嗨')]), host)
    const p1 = r.start()
    expect(p1).toMatchObject({ kind: 'say', lineId: 't#1', text: '你好，小明' })
    expect(emitted.map((c) => c.k)).toEqual(['bg', 'say'])
    const p2 = r.advance()
    expect(p2).toMatchObject({ kind: 'say', lineId: 't#2', who: 'rin' })
    expect(r.advance()).toEqual({ kind: 'end' })
  })

  it('applies effects and clamps', () => {
    const { host, st } = makeHost()
    const r = new SceneRunner(scene('t', [effect({ stats: { con: 200 }, bond: { rin: 99 }, stamina: -500, flags: { a: true }, inc: { n: 2 } }), effect({ inc: { n: 3 } })]), host)
    expect(r.start()).toEqual({ kind: 'end' })
    expect(st.stats.con).toBe(100)
    expect(st.bond.rin).toBe(40)
    expect(st.stamina).toBe(0)
    expect(st.flags).toMatchObject({ a: true, n: 5 })
  })

  it('branches on choice, runs nested then blocks, then continues after the choice', () => {
    const { host, st, picks } = makeHost()
    const s = scene('c', [
      choice([
        opt('A', { bond: { rin: 2 } }, [say('rin', 'normal', 'a1'), choice([opt('A1', { flags: { deep: true } }), opt('A2')]), say('rin', 'normal', 'a2')]),
        opt('B', undefined, [say('hare', 'normal', 'b1')]),
        opt('C'),
      ]),
      say('narr', undefined, 'after'),
    ])
    const r = new SceneRunner(s, host)
    const p = r.start()
    expect(p.kind).toBe('choice')
    expect(r.choose(0)).toMatchObject({ kind: 'say', text: 'a1', lineId: 'c#0.0.0' })
    expect(st.bond.rin).toBe(2)
    const inner = r.advance()
    expect(inner).toMatchObject({ kind: 'choice', lineId: 'c#0.0.1' })
    expect(r.choose(0)).toMatchObject({ kind: 'say', text: 'a2', lineId: 'c#0.0.2' })
    expect(st.flags.deep).toBe(true)
    expect(r.advance()).toMatchObject({ kind: 'say', text: 'after', lineId: 'c#1' })
    expect(picks).toEqual(['A', 'A1'])

    // option without `then` falls straight through
    const h2 = makeHost()
    const r2 = new SceneRunner(s, h2.host)
    r2.start()
    expect(r2.choose(2)).toMatchObject({ text: 'after' })
    // ignores invalid index
    const r3 = new SceneRunner(s, makeHost().host)
    r3.start()
    expect(r3.choose(9).kind).toBe('choice')
  })

  it('evaluates if/else, hides options whose cond fails', () => {
    const { host } = makeHost()
    const s = scene('i', [
      effect({ flags: { x: true } }),
      when(flag('x'), [say('narr', undefined, 'yes')], [say('narr', undefined, 'no')]),
      when(flag('missing'), [say('narr', undefined, 'never')]),
      choice([opt('hidden', undefined, undefined, bondIs('rin', 'gte', 10)), opt('shown')]),
    ])
    const r = new SceneRunner(s, host)
    expect(r.start()).toMatchObject({ text: 'yes', lineId: 'i#1.0.0' })
    const p = r.advance()
    expect(p).toMatchObject({ kind: 'choice', options: [{ index: 1, text: 'shown' }] })
  })

  it('pauses at minigame and wait, applies win/lose effects', () => {
    const win = makeHost()
    const s = scene('m', [minigame('demo-quiz', { stats: { tec: 5 } }, { stress: 7 }), wait(500), card('sitemap')])
    const r = new SceneRunner(s, win.host)
    expect(r.start()).toMatchObject({ kind: 'minigame', id: 'demo-quiz' })
    expect(r.resolveMinigame(true)).toMatchObject({ kind: 'wait', ms: 500 })
    expect(win.st.stats.tec).toBe(15)
    expect(r.advance()).toEqual({ kind: 'end' })
    expect(win.emitted.at(-1)).toMatchObject({ k: 'card', id: 'sitemap' })
    const lose = makeHost()
    const r2 = new SceneRunner(s, lose.host)
    r2.start()
    r2.resolveMinigame(false)
    expect(lose.st.stress).toBe(17)
  })

  it('snapshot can resume at the same pause (nested)', () => {
    const s = scene('r', [choice([opt('A', undefined, [say('narr', undefined, 'x'), say('narr', undefined, 'y')])]), say('narr', undefined, 'z')])
    const a = makeHost()
    const r = new SceneRunner(s, a.host)
    r.start()
    r.choose(0)
    r.advance()
    const snap = JSON.parse(JSON.stringify(r.snapshot()))
    const r2 = new SceneRunner(s, makeHost().host, snap)
    expect(r2.start()).toMatchObject({ text: 'y', lineId: 'r#0.0.1' })
    expect(r2.advance()).toMatchObject({ text: 'z' })
  })

  it('show/hide/empty scene', () => {
    const { host } = makeHost()
    expect(new SceneRunner(scene('e', []), host).start()).toEqual({ kind: 'end' })
    expect(new SceneRunner(scene('e', [show('rin')]), host).start()).toEqual({ kind: 'end' })
  })
})
