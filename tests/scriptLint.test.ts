import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BG_IDS } from '@/content/backgrounds'
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
        { k: 'bg', id: 'nowhere' },
        { k: 'card', id: 'nope' },
        { k: 'choice', options: [{ text: '' }] },
      ],
    } as unknown as Scene
    const errs = lintScene(bad)
    expect(errs).toHaveLength(5)
    expect(errs.join('\n')).toMatch(/empty text[\s\S]*too long[\s\S]*unknown bg[\s\S]*unknown card[\s\S]*empty option/)
  })

  it('demo scene is short', async () => {
    const s = await loadScene('demo')
    expect(estimateMinutes(countScene(s))).toBeLessThan(5)
  })
})
