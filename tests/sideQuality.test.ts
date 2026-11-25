import { describe, expect, it } from 'vitest'
import { loadScene } from '@/content/scenes'
import type { Cmd } from '@/engine/types'
import { textLength } from '@/systems/estimate'

const SIDE_IDS = ['sq-r1', 'sq-r2', 'sq-r3', 'sq-h1', 'sq-h2', 'sq-h3', 'sq-m1', 'sq-m2', 'sq-m3', 'sq-x1']
const LONG_ME = 25
const MAX_LONG_ME_RUN = 3

/** Every linear block of the scene (top level plus each choice / if branch). */
function blocks(cmds: Cmd[], out: Cmd[][] = []): Cmd[][] {
  out.push(cmds)
  for (const c of cmds) {
    if (c.k === 'choice') for (const o of c.options) blocks(o.then ?? [], out)
    if (c.k === 'if') {
      blocks(c.then, out)
      blocks(c.else ?? [], out)
    }
  }
  return out
}

function flat(cmds: Cmd[]): Cmd[] {
  return blocks(cmds).flat()
}

describe('side quest quality', () => {
  it('no long run of lecturing lines from the protagonist', async () => {
    for (const id of SIDE_IDS) {
      const scene = await loadScene(id)
      for (const block of blocks(scene.cmds)) {
        let run = 0
        for (const c of block) {
          if (c.k !== 'say') continue
          if (c.who === 'me' && textLength(c.text) >= LONG_ME) run++
          else if (c.who === 'me') run = 0
          else run = 0
          expect(run, `${id}: more than ${MAX_LONG_ME_RUN} consecutive long 'me' lines near "${c.text}"`).toBeLessThanOrEqual(MAX_LONG_ME_RUN)
        }
      }
    }
  })

  it('every side quest has its own minigame and at least one knowledge card', async () => {
    for (const id of SIDE_IDS) {
      const cmds = flat((await loadScene(id)).cmds)
      const games = cmds.filter((c) => c.k === 'minigame')
      expect(games, `${id} minigame`).toHaveLength(1)
      expect(games[0].k === 'minigame' && games[0].id, `${id} minigame id`).toBe(id)
      expect(cmds.filter((c) => c.k === 'card').length, `${id} cards`).toBeGreaterThanOrEqual(1)
    }
  })

  it('no two lines inside a scene are identical', async () => {
    for (const id of SIDE_IDS) {
      const seen = new Set<string>()
      for (const c of flat((await loadScene(id)).cmds)) {
        if (c.k !== 'say') continue
        expect(seen.has(c.text), `${id}: duplicated line "${c.text}"`).toBe(false)
        seen.add(c.text)
      }
    }
  })
})
