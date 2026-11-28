import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BG_IDS } from '@/content/backgrounds'
import { CG_IDS } from '@/content/cgs'
import { CHARACTERS, FACES, SPRITE_IDS, SPEAKER_IDS } from '@/content/characters'
import { KNOWLEDGE_IDS } from '@/content/knowledge'
import { MINIGAME_IDS } from '@/content/minigames'
import { loadScene, SCENE_IDS } from '@/content/scenes'
import type { Cmd, Cond, Scene } from '@/engine/types'
import { countScene, estimateMinutes, textLength } from '@/systems/estimate'

export const MAX_LINE = 45

function* walk(cmds: Cmd[], path: string): Generator<{ cmd: Cmd; path: string }> {
  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i]
    const p = `${path}${i}`
    yield { cmd, path: p }
    if (cmd.k === 'choice') for (let b = 0; b < cmd.options.length; b++) yield* walk(cmd.options[b].then ?? [], `${p}.${b}.`)
    if (cmd.k === 'if') {
      yield* walk(cmd.then, `${p}.0.`)
      yield* walk(cmd.else ?? [], `${p}.1.`)
    }
  }
}

function condRefs(c: Cond, out: string[] = []): string[] {
  if (c.t === 'seen') out.push(c.scene)
  if (c.t === 'and') c.all.forEach((x) => condRefs(x, out))
  if (c.t === 'or') c.any.forEach((x) => condRefs(x, out))
  if (c.t === 'not') condRefs(c.cond, out)
  return out
}

/** Returns a list of human-readable lint problems for one scene. */
export function lintScene(s: Scene): string[] {
  const errs: string[] = []
  const E = (path: string, msg: string) => errs.push(`${s.id}#${path}: ${msg}`)
  for (const { cmd, path } of walk(s.cmds, '')) {
    switch (cmd.k) {
      case 'say':
        if (!SPEAKER_IDS.includes(cmd.who)) E(path, `unknown speaker ${cmd.who}`)
        if (cmd.who === 'npc') {
          if (!cmd.name || !cmd.name.trim()) E(path, 'npc without name')
          if (cmd.face) E(path, 'npc cannot have face')
        }
        if (cmd.face && !FACES.includes(cmd.face)) E(path, `unknown face ${cmd.face}`)
        if (!cmd.text.trim()) E(path, 'empty text')
        else if (textLength(cmd.text) > MAX_LINE) E(path, `line too long (${textLength(cmd.text)} > ${MAX_LINE})`)
        break
      case 'show':
        if (!SPRITE_IDS.includes(cmd.who) || !CHARACTERS[cmd.who].hasSprite) E(path, `unknown character ${cmd.who}`)
        if (cmd.face && !FACES.includes(cmd.face)) E(path, `unknown face ${cmd.face}`)
        break
      case 'bg':
        if (!BG_IDS.includes(cmd.id)) E(path, `unknown bg ${cmd.id}`)
        break
      case 'card':
        if (!KNOWLEDGE_IDS.includes(cmd.id)) E(path, `unknown card ${cmd.id}`)
        break
      case 'minigame':
        if (!MINIGAME_IDS.includes(cmd.id)) E(path, `unknown minigame ${cmd.id}`)
        break
      case 'cg':
        if (cmd.id !== 'none' && !CG_IDS.includes(cmd.id)) E(path, `unknown cg ${cmd.id}`)
        break
      case 'choice':
        if (!cmd.options.length) E(path, 'choice without options')
        cmd.options.forEach((o, i) => {
          if (!o.text.trim()) E(`${path}.${i}`, 'empty option text')
          if (o.cond) for (const r of condRefs(o.cond)) if (!(SCENE_IDS as string[]).includes(r)) E(`${path}.${i}`, `cond references unknown scene ${r}`)
        })
        break
      case 'if':
        for (const r of condRefs(cmd.cond)) if (!(SCENE_IDS as string[]).includes(r)) E(path, `cond references unknown scene ${r}`)
        break
      case 'wait':
        if (!(cmd.ms >= 0)) E(path, 'bad wait')
        break
    }
  }
  return errs
}

describe('script lint', () => {
  it('registry covers every scene file and keys equal scene ids', async () => {
    const root = join(__dirname, '../src/content/scenes')
    const files: string[] = []
    for (const dir of ['main', 'dates', 'side', 'endings']) {
      for (const f of readdirSync(join(root, dir))) if (f.endsWith('.ts')) files.push(`${dir}/${f}`)
    }
    const registered = await Promise.all(SCENE_IDS.map(async (id) => ({ id, scene: await loadScene(id) })))
    for (const { id, scene } of registered) expect(scene.id, `registry key ${id}`).toBe(id)
    expect(registered.length).toBe(files.length)
  })

  it('all scenes pass lint', async () => {
    const problems: string[] = []
    for (const id of SCENE_IDS) problems.push(...lintScene(await loadScene(id)))
    expect(problems).toEqual([])
  })

  it('lintScene catches problems', () => {
    const bad = {
      id: 'bad',
      cmds: [
        { k: 'say', who: 'rin', text: ' ' },
        { k: 'say', who: 'rin', text: '字'.repeat(46) },
        { k: 'say', who: 'rin', text: '字'.repeat(45) },
        { k: 'say', who: 'npc', name: '  ', text: '嗨' },
        { k: 'say', who: 'npc', name: '料理社社長', text: '字'.repeat(46) },
        { k: 'say', who: 'npc', name: '料理社社長', text: '別急。麵團要醒，人也要。' },
        { k: 'bg', id: 'nowhere' },
        { k: 'card', id: 'nope' },
        { k: 'choice', options: [{ text: '' }] },
      ],
    } as unknown as Scene
    const errs = lintScene(bad)
    expect(errs).toHaveLength(7)
    expect(errs.join('\n')).toMatch(/empty text[\s\S]*too long[\s\S]*npc without name[\s\S]*too long[\s\S]*unknown bg[\s\S]*unknown card[\s\S]*empty option/)
  })

  it('word budgets and duration estimates match plan §3.1', async () => {
    const mainIds = ['prologue', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'festival']
    const endingIds = ['end-blackhat', 'end-true', 'end-rin', 'end-hare', 'end-mirai', 'end-normal', 'end-bad']
    const sideIds = ['sq-r1', 'sq-r2', 'sq-r3', 'sq-h1', 'sq-h2', 'sq-h3', 'sq-m1', 'sq-m2', 'sq-m3', 'sq-x1']
    const dateIds = ['date-rin-1', 'date-rin-2', 'date-rin-3', 'date-hare-1', 'date-hare-2', 'date-hare-3', 'date-mirai-1', 'date-mirai-2', 'date-mirai-3']

    const sumStats = async (ids: string[]) => {
      const stats = await Promise.all(ids.map(async (id) => ({ id, st: countScene(await loadScene(id)) })))
      return stats
    }

    const mainStats = await sumStats(mainIds)
    const endStats = await sumStats(endingIds)
    const sideStats = await sumStats(sideIds)
    const dateStats = await sumStats(dateIds.slice(0, 6))

    expect(mainStats.find((x) => x.id === 'prologue')!.st.chars).toBeLessThanOrEqual(1300)
    for (const w of mainStats.filter((x) => /^w\d$/.test(x.id))) expect(w.st.chars, w.id).toBeLessThanOrEqual(900)
    expect(mainStats.find((x) => x.id === 'festival')!.st.chars).toBeLessThanOrEqual(1100)
    for (const e of endStats) expect(e.st.chars, e.id).toBeLessThanOrEqual(700)
    for (const sq of sideStats) {
      // Floor reflects real dialogue chars after moving NPC name prefixes out of text into npc() nameplates
      expect(sq.st.chars, `${sq.id} min`).toBeGreaterThanOrEqual(800)
      expect(sq.st.chars, `${sq.id} max`).toBeLessThanOrEqual(1800)
    }

    const add = (list: { st: ReturnType<typeof countScene> }[]) =>
      list.reduce(
        (acc, x) => ({
          chars: acc.chars + x.st.chars,
          lines: acc.lines + x.st.lines,
          choices: acc.choices + x.st.choices,
          minigames: acc.minigames + x.st.minigames,
        }),
        { chars: 0, lines: 0, choices: 0, minigames: 0 },
      )

    const mainTotal = add([...mainStats, ...dateStats, endStats[1]])
    expect(mainTotal.chars, 'main path chars').toBeLessThanOrEqual(10000)
    expect(estimateMinutes(mainTotal, 6), 'main path minutes').toBeLessThanOrEqual(35)

    const fullTotal = add([...mainStats, ...(await sumStats(dateIds)), endStats[1], ...sideStats])
    const fullMin = estimateMinutes(fullTotal, 6)
    expect(fullMin, 'full collection min').toBeGreaterThanOrEqual(60)
    expect(fullMin, 'full collection max').toBeLessThanOrEqual(90)
  })

  it('all 38 knowledge cards, 16 gameplay minigames, and 7 ending CGs are reachable', async () => {
    const cards = new Set<string>()
    const mgs = new Set<string>()
    for (const id of SCENE_IDS) {
      if (id === 'demo') continue
      const s = await loadScene(id)
      for (const { cmd } of walk(s.cmds, '')) {
        if (cmd.k === 'card') cards.add(cmd.id)
        if (cmd.k === 'minigame') mgs.add(cmd.id)
      }
    }
    for (const k of KNOWLEDGE_IDS) expect(cards.has(k), `missing card ${k}`).toBe(true)
    for (const m of MINIGAME_IDS) if (m !== 'demo-quiz') expect(mgs.has(m), `missing minigame ${m}`).toBe(true)

    for (const eid of ['end-blackhat', 'end-true', 'end-rin', 'end-hare', 'end-mirai', 'end-normal', 'end-bad']) {
      const s = await loadScene(eid)
      const cgs = s.cmds.filter((c) => c.k === 'cg')
      expect(cgs).toEqual([{ k: 'cg', id: eid }, { k: 'cg', id: 'none' }])
    }
  })
})
