import { describe, expect, it } from 'vitest'
import { ACTIVITY_IDS } from '@/content/activityIds'
import {
  ACTIVITY_CHATTER, ACTIVITY_RESULT, FAIL_LINES, INFIRMARY_LINES, QUEST_BLURBS, WEEKLY_COMMENTS,
  type FlavorLine,
} from '@/content/flavor'
import { KNOWLEDGE, KNOWLEDGE_IDS } from '@/content/knowledge'
import { loadScene } from '@/content/scenes'
import { HEROINES } from '@/engine/types'
import { countScene, textLength } from '@/systems/estimate'

const MAX_LINE = 45

function checkLine(l: FlavorLine, where: string) {
  expect(l.text.trim().length, `${where} empty`).toBeGreaterThan(0)
  expect(textLength(l.text), `${where} too long: ${l.text}`).toBeLessThanOrEqual(MAX_LINE)
}

describe('flavor text', () => {
  it('weekly comments: 3 per heroine per tier', () => {
    for (const h of HEROINES) {
      for (const tier of ['low', 'mid', 'high'] as const) {
        const arr = WEEKLY_COMMENTS[h][tier]
        expect(arr.length, `${h}.${tier}`).toBe(3)
        arr.forEach((l, i) => {
          checkLine(l, `${h}.${tier}[${i}]`)
          expect(l.who).toBe(h)
        })
      }
    }
  })

  it('activity chatter and results: 3 each', () => {
    for (const a of ACTIVITY_IDS) {
      expect(ACTIVITY_CHATTER[a].length, `chatter ${a}`).toBe(3)
      ACTIVITY_CHATTER[a].forEach((l, i) => checkLine(l, `chatter ${a}[${i}]`))
      expect(ACTIVITY_RESULT[a].length, `result ${a}`).toBe(3)
      ACTIVITY_RESULT[a].forEach((t, i) => checkLine({ who: 'narr', text: t }, `result ${a}[${i}]`))
    }
  })

  it('fail / infirmary lines', () => {
    expect(FAIL_LINES.length).toBe(6)
    FAIL_LINES.forEach((l, i) => {
      checkLine(l, `fail[${i}]`)
      expect(l.who).toBe('me')
    })
    expect(INFIRMARY_LINES.length).toBeGreaterThanOrEqual(5)
    expect(INFIRMARY_LINES.length).toBeLessThanOrEqual(7)
    INFIRMARY_LINES.forEach((l, i) => checkLine(l, `infirmary[${i}]`))
  })

  it('quest blurbs for all 10 side quests', () => {
    const ids = ['sq-r1', 'sq-r2', 'sq-r3', 'sq-h1', 'sq-h2', 'sq-h3', 'sq-m1', 'sq-m2', 'sq-m3', 'sq-x1']
    expect(Object.keys(QUEST_BLURBS).sort()).toEqual([...ids].sort())
    for (const id of ids) {
      const q = QUEST_BLURBS[id]
      expect(q.title.trim()).not.toBe('')
      expect(q.client.trim()).not.toBe('')
      expect(textLength(q.blurb), id).toBeLessThanOrEqual(40)
      expect(q.blurb.trim()).not.toBe('')
    }
  })
})

describe('knowledge cards', () => {
  it('all 31 cards are filled within limits', () => {
    expect(KNOWLEDGE_IDS.length).toBe(31)
    for (const id of KNOWLEDGE_IDS) {
      const k = KNOWLEDGE[id]
      expect(k.summary.trim(), `${id} summary`).not.toBe('')
      expect(k.detail.trim(), `${id} detail`).not.toBe('')
      expect(k.misconception.trim(), `${id} misconception`).not.toBe('')
      expect([...k.summary].length, `${id} summary`).toBeLessThanOrEqual(30)
      expect([...k.detail].length, `${id} detail`).toBeLessThanOrEqual(150)
      expect([...k.misconception].length, `${id} misconception`).toBeLessThanOrEqual(60)
      expect(k.misconception.startsWith('常見誤解：'), `${id} misconception prefix`).toBe(true)
    }
  })
})

describe('date scenes', () => {
  const heroines = ['rin', 'hare', 'mirai'] as const
  const ids = [
    ...heroines.flatMap((h) => [1, 2, 3].map((n) => `date-${h}-${n}`)),
    ...heroines.map((h) => `date-${h}-casual`),
    'weekend-rest',
  ]

  it('all 12 scenes exist, pass lint and stay within budget', async () => {
    for (const id of ids) {
      const s = await loadScene(id)
      expect(s.id).toBe(id)
      const st = countScene(s)
      if (/-[123]$/.test(id)) {
        expect(st.chars, `${id} chars`).toBeLessThanOrEqual(450)
        expect(st.choices, `${id} choices`).toBe(1)
      } else if (id.endsWith('casual')) {
        expect(st.chars, `${id} chars`).toBeLessThanOrEqual(200)
        expect(st.choices).toBe(1)
      } else {
        expect(st.chars, `${id} chars`).toBeLessThanOrEqual(160)
      }
    }
  })

  it('third dates show and clear their CG', async () => {
    for (const h of heroines) {
      const s = await loadScene(`date-${h}-3`)
      const cgs = s.cmds.filter((c) => c.k === 'cg')
      expect(cgs).toEqual([
        { k: 'cg', id: `date-${h}-3` },
        { k: 'cg', id: 'none' },
      ])
    }
  })
})
