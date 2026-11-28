import { describe, expect, it } from 'vitest'
import { choice, minigame, npc, opt, say, scene, when } from '@/engine'
import { flag } from '@/engine/cond'
import { countScene, estimateMinutes, estimateSeconds, textLength } from '@/systems/estimate'

describe('estimate', () => {
  it('textLength counts code points and {name} as 3', () => {
    expect(textLength('你好嗎')).toBe(3)
    expect(textLength('{name}，早')).toBe(5)
    expect(textLength('😀a')).toBe(2)
  })
  it('counts the longest branch', () => {
    const s = scene('x', [
      say('rin', 'normal', '12345'),
      npc('料理社社長', '123'),
      choice([opt('a', undefined, [say('rin', 'normal', '123456789')]), opt('b', undefined, [say('rin', 'normal', '1')])]),
      when(flag('f'), [say('narr', undefined, '12')], [say('narr', undefined, '1234567890'), say('narr', undefined, '1')]),
      minigame('demo-quiz'),
    ])
    expect(countScene(s)).toEqual({ chars: 5 + 3 + 9 + 11, lines: 1 + 1 + 1 + 2, choices: 1, minigames: 1 })
  })
  it('formula per plan §3.1', () => {
    // 450 chars = 1 min; 50 lines = 60 s; 3 choices = 12 s; 1 minigame = 60 s; 1 schedule = 40 s
    const sec = estimateSeconds({ chars: 450, lines: 50, choices: 3, minigames: 1 }, 1)
    expect(sec).toBeCloseTo(60 + 60 + 12 + 60 + 40)
    expect(estimateMinutes({ chars: 0, lines: 0, choices: 0, minigames: 0 })).toBe(0)
  })
})
