import { describe, expect, it } from 'vitest'
import { MINIGAME_IDS, MINIGAMES } from '@/content/minigames'
import { MINIGAME_DATA } from '@/content/minigames/data'
import { evaluateSpotClick, scoreQuiz, scoreSerp } from '@/content/minigames/scoring'
import type { QuizGame, SerpGame, SpotGame } from '@/content/minigames/types'

describe('minigame datasets', () => {
  it('covers every MinigameId and matches MINIGAMES[id].kind (placeholder -> quiz)', () => {
    expect(Object.keys(MINIGAME_DATA).sort()).toEqual([...MINIGAME_IDS].sort())
    for (const id of MINIGAME_IDS) {
      const expectedKind = MINIGAMES[id].kind === 'placeholder' ? 'quiz' : MINIGAMES[id].kind
      expect(MINIGAME_DATA[id].kind, id).toBe(expectedKind)
    }
  })

  it('has valid quiz indices and passCount for all quiz games', () => {
    for (const id of MINIGAME_IDS) {
      const def = MINIGAME_DATA[id]
      if (def.kind !== 'quiz') continue
      expect(def.questions.length, `${id} questions`).toBeGreaterThan(0)
      expect(def.passCount, `${id} passCount min`).toBeGreaterThanOrEqual(1)
      expect(def.passCount, `${id} passCount max`).toBeLessThanOrEqual(def.questions.length)
      for (const [qi, q] of def.questions.entries()) {
        expect(q.options.length, `${id}#${qi} options`).toBeGreaterThanOrEqual(2)
        expect(q.correct, `${id}#${qi} correct min`).toBeGreaterThanOrEqual(0)
        expect(q.correct, `${id}#${qi} correct max`).toBeLessThan(q.options.length)
        expect(q.explain.trim().length, `${id}#${qi} explain`).toBeGreaterThan(0)
      }
    }
  })

  it('has valid target line indices for all spot games', () => {
    for (const id of MINIGAME_IDS) {
      const def = MINIGAME_DATA[id]
      if (def.kind !== 'spot') continue
      expect(def.lines.length, `${id} lines`).toBeGreaterThan(0)
      expect(def.targets.length, `${id} targets`).toBeGreaterThan(0)
      const uniqueTargets = new Set(def.targets)
      expect(uniqueTargets.size, `${id} duplicate targets`).toBe(def.targets.length)
      for (const idx of def.targets) {
        expect(idx, `${id} target min`).toBeGreaterThanOrEqual(0)
        expect(idx, `${id} target max`).toBeLessThan(def.lines.length)
      }
    }
  })

  it('has valid title and description fragments for all serp games', () => {
    for (const id of MINIGAME_IDS) {
      const def = MINIGAME_DATA[id]
      if (def.kind !== 'serp') continue
      expect(def.titles.length, `${id} titles`).toBeGreaterThanOrEqual(2)
      expect(def.descriptions.length, `${id} descriptions`).toBeGreaterThanOrEqual(2)
      for (const frag of [...def.titles, ...def.descriptions]) {
        expect(frag.text.trim().length, `${id} text`).toBeGreaterThan(0)
        expect(frag.feedback.trim().length, `${id} feedback`).toBeGreaterThan(0)
      }
    }
  })
})

describe('scoreQuiz', () => {
  it('scores answers against passCount accurately', () => {
    const game = MINIGAME_DATA['w4-cwv'] as QuizGame
    const allCorrect = game.questions.map((q) => q.correct)
    expect(scoreQuiz(game, allCorrect)).toEqual({
      correct: game.questions.length,
      total: game.questions.length,
      passed: true,
    })

    const allWrong = game.questions.map((q) => (q.correct + 1) % q.options.length)
    expect(scoreQuiz(game, allWrong)).toEqual({
      correct: 0,
      total: game.questions.length,
      passed: false,
    })
  })
})

describe('evaluateSpotClick', () => {
  const game = MINIGAME_DATA['w1-robots'] as SpotGame
  const targetA = game.targets[0]
  const targetB = game.targets[1]
  const safeLine = game.lines.findIndex((_, i) => !game.targets.includes(i))

  it('handles hits, duplicate clicks, wins, and 3-mistake losses', () => {
    const first = evaluateSpotClick(game, [], 0, targetA)
    expect(first.hit).toBe(true)
    expect(first.alreadyFound).toBe(false)
    expect(first.nextFound).toEqual([targetA])
    expect(first.nextMistakes).toBe(0)
    expect(first.won).toBe(false)
    expect(first.lost).toBe(false)

    // Clicking an already found line does not duplicate or add mistakes
    const dup = evaluateSpotClick(game, first.nextFound, first.nextMistakes, targetA)
    expect(dup.hit).toBe(true)
    expect(dup.alreadyFound).toBe(true)
    expect(dup.nextFound).toEqual([targetA])
    expect(dup.nextMistakes).toBe(0)

    // Clicking the remaining target wins
    const win = evaluateSpotClick(game, dup.nextFound, dup.nextMistakes, targetB)
    expect(win.hit).toBe(true)
    expect(win.won).toBe(true)
    expect(win.lost).toBe(false)

    // Three wrong clicks lose
    const m1 = evaluateSpotClick(game, [], 0, safeLine)
    expect(m1.hit).toBe(false)
    expect(m1.nextMistakes).toBe(1)
    expect(m1.lost).toBe(false)

    const m2 = evaluateSpotClick(game, m1.nextFound, m1.nextMistakes, safeLine)
    expect(m2.nextMistakes).toBe(2)
    expect(m2.lost).toBe(false)

    const m3 = evaluateSpotClick(game, m2.nextFound, m2.nextMistakes, safeLine)
    expect(m3.nextMistakes).toBe(3)
    expect(m3.lost).toBe(true)
    expect(m3.won).toBe(false)
  })
})

describe('scoreSerp', () => {
  it('passes best combination and fails vague or spammy choices across all serp games', () => {
    for (const id of ['w2-serp', 'sq-h2'] as const) {
      const game = MINIGAME_DATA[id] as SerpGame
      const bestTitleIdx = game.titles.findIndex((t) => t.noSpam && t.frontLoaded && t.intentScore >= 20)
      const bestDescIdx = game.descriptions.findIndex((d) => d.noSpam && d.frontLoaded && d.intentScore >= 20)
      expect(bestTitleIdx, `${id} best title`).toBeGreaterThanOrEqual(0)
      expect(bestDescIdx, `${id} best desc`).toBeGreaterThanOrEqual(0)

      const best = scoreSerp(game, bestTitleIdx, bestDescIdx)
      expect(best.passed, `${id} best should pass`).toBe(true)
      expect(best.score).toBeGreaterThanOrEqual(75)
      expect(best.titleScore).toBe(50)
      expect(best.descScore).toBe(50)
      expect(best.spamCapped).toBe(false)
      expect(best.feedback.length).toBeGreaterThanOrEqual(2)

      const spamTitleIdx = game.titles.findIndex((t) => !t.noSpam)
      const vagueDescIdx = game.descriptions.findIndex((d) => d.intentScore <= 10)
      expect(spamTitleIdx, `${id} spam title`).toBeGreaterThanOrEqual(0)
      expect(vagueDescIdx, `${id} vague desc`).toBeGreaterThanOrEqual(0)

      const bad = scoreSerp(game, spamTitleIdx, vagueDescIdx)
      expect(bad.passed, `${id} spam+vague should fail`).toBe(false)
      expect(bad.score).toBeLessThan(75)
    }
  })

  it('never claims a fixed character count rule in feedback', () => {
    const game = MINIGAME_DATA['w2-serp'] as SerpGame
    for (let ti = 0; ti < game.titles.length; ti++) {
      for (let di = 0; di < game.descriptions.length; di++) {
        const res = scoreSerp(game, ti, di)
        const joined = res.feedback.join('\n')
        expect(joined).not.toMatch(/規定字數上限|必須剛好/)
      }
    }
  })
})
