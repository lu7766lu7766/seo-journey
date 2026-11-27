import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MINIGAME_DATA } from '@/content/minigames/data'
import { scoreSerp } from '@/content/minigames/scoring'
import type { QuizGame, SerpGame, SpotGame } from '@/content/minigames/types'
import { Quiz } from '@/minigames/Quiz'
import { Serp } from '@/minigames/Serp'
import { Spot } from '@/minigames/Spot'
import {
  SERP_THREE_STAR_SCORE,
  canOfferRetry,
  quizStars,
  resolveStars,
  serpStars,
  shuffledOrder,
  spotStars,
  starsText,
} from '@/minigames/stars'

describe('star rules', () => {
  it('3 = first-attempt perfect, 2 = first-attempt pass, 1 = pass after retry, 0 = fail', () => {
    expect(resolveStars({ passed: true, attempt: 1, perfect: true })).toBe(3)
    expect(resolveStars({ passed: true, attempt: 1, perfect: false })).toBe(2)
    expect(resolveStars({ passed: true, attempt: 2, perfect: true })).toBe(1)
    expect(resolveStars({ passed: true, attempt: 2, perfect: false })).toBe(1)
    expect(resolveStars({ passed: false, attempt: 1, perfect: false })).toBe(0)
    expect(resolveStars({ passed: false, attempt: 2, perfect: false })).toBe(0)
  })

  it('quiz: all correct = 3, partial pass = 2, retry pass = 1', () => {
    expect(quizStars(3, 3, true, 1)).toBe(3)
    expect(quizStars(2, 3, true, 1)).toBe(2)
    expect(quizStars(3, 3, true, 2)).toBe(1)
    expect(quizStars(1, 3, false, 1)).toBe(0)
    expect(quizStars(0, 0, true, 1)).toBe(2) // an empty quiz is never "perfect"
  })

  it('spot: zero wrong clicks = 3, any wrong click = 2, retry pass = 1, lost = 0', () => {
    expect(spotStars(true, 0, 1)).toBe(3)
    expect(spotStars(true, 1, 1)).toBe(2)
    expect(spotStars(true, 2, 1)).toBe(2)
    expect(spotStars(true, 0, 2)).toBe(1)
    expect(spotStars(false, 3, 1)).toBe(0)
    expect(spotStars(false, 3, 2)).toBe(0)
  })

  it('serp: only the best title + description pair reaches the three-star score', () => {
    expect(SERP_THREE_STAR_SCORE).toBe(90)
    expect(serpStars(100, true, 1)).toBe(3)
    expect(serpStars(90, true, 1)).toBe(3)
    expect(serpStars(89, true, 1)).toBe(2)
    expect(serpStars(78, true, 1)).toBe(2)
    expect(serpStars(100, true, 2)).toBe(1)
    expect(serpStars(60, false, 1)).toBe(0)

    for (const id of ['w2-serp', 'sq-h2'] as const) {
      const game = MINIGAME_DATA[id] as SerpGame
      const results: { t: number; d: number; score: number; passed: boolean }[] = []
      for (let t = 0; t < game.titles.length; t++)
        for (let d = 0; d < game.descriptions.length; d++) {
          const r = scoreSerp(game, t, d)
          results.push({ t, d, score: r.score, passed: r.passed })
        }
      const perfect = results.filter((r) => r.score >= SERP_THREE_STAR_SCORE)
      expect(perfect.length, `${id}: exactly one pair earns 3 stars`).toBe(1)
      expect(perfect[0].passed).toBe(true)
      // at least one imperfect pair still passes (2 stars) and at least one fails (0 stars)
      expect(results.some((r) => r.passed && r.score < SERP_THREE_STAR_SCORE), `${id}: 2-star pairs exist`).toBe(true)
      expect(results.some((r) => !r.passed), `${id}: failing pairs exist`).toBe(true)
    }
  })

  it('renders star strings', () => {
    expect(starsText(0)).toBe('☆☆☆')
    expect(starsText(2)).toBe('★★☆')
    expect(starsText(3)).toBe('★★★')
    expect(starsText(9)).toBe('★★★')
  })
})

describe('retry flow', () => {
  /** mirrors how MinigameHost drives an engine: a failed first attempt may retry once, onResolve fires once */
  function play(outcomes: { passed: boolean; perfect?: boolean }[]) {
    let attempt: 1 | 2 = 1
    const resolved: { won: boolean; stars: number }[] = []
    for (const o of outcomes) {
      if (canOfferRetry(o.passed, attempt)) {
        attempt = 2 // player pressed 再挑戰一次
        continue
      }
      resolved.push({ won: o.passed, stars: resolveStars({ passed: o.passed, attempt, perfect: !!o.perfect }) })
      break
    }
    return { attempt, resolved }
  }

  it('offers the retry only after a failed first attempt', () => {
    expect(canOfferRetry(false, 1)).toBe(true)
    expect(canOfferRetry(true, 1)).toBe(false)
    expect(canOfferRetry(false, 2)).toBe(false)
    expect(canOfferRetry(true, 2)).toBe(false)
  })

  it('fail -> retry -> pass resolves once as won with 1 star', () => {
    const r = play([{ passed: false }, { passed: true, perfect: true }])
    expect(r.attempt).toBe(2)
    expect(r.resolved).toEqual([{ won: true, stars: 1 }])
  })

  it('fail -> retry -> fail resolves once as lost with 0 stars', () => {
    const r = play([{ passed: false }, { passed: false }])
    expect(r.resolved).toEqual([{ won: false, stars: 0 }])
  })

  it('first-attempt pass never goes to the retry', () => {
    const r = play([{ passed: true, perfect: true }])
    expect(r.attempt).toBe(1)
    expect(r.resolved).toEqual([{ won: true, stars: 3 }])
  })
})

describe('shuffledOrder', () => {
  it('is a permutation and deterministic for a seeded rng', () => {
    for (let n = 1; n <= 5; n++) {
      const o = shuffledOrder(n)
      expect([...o].sort()).toEqual(Array.from({ length: n }, (_, i) => i))
    }
    let seed = 7
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const a = shuffledOrder(4, rng)
    seed = 7
    const b = shuffledOrder(4, rng)
    expect(a).toEqual(b)
  })

  it('reaches every position for every item over many shuffles (no fixed positions)', () => {
    const seen = Array.from({ length: 3 }, () => new Set<number>())
    for (let k = 0; k < 300; k++) shuffledOrder(3).forEach((item, pos) => seen[item].add(pos))
    for (const s of seen) expect(s.size).toBe(3)
  })
})

describe('engine rendering (static)', () => {
  afterEach(() => vi.restoreAllMocks())
  const quiz = MINIGAME_DATA['sq-r1'] as QuizGame
  const noop = () => {}

  const optionTexts = (html: string) => [...html.matchAll(/data-testid="quiz-opt-\d"[\s\S]*?<span class="flex-1 leading-snug">([^<]*)<\/span>/g)].map((m) => m[1])

  it('quiz shows the retry hint only on the second attempt', () => {
    const first = renderToStaticMarkup(createElement(Quiz, { game: quiz, onResolve: noop }))
    const second = renderToStaticMarkup(createElement(Quiz, { game: quiz, onResolve: noop, attempt: 2, onRetry: noop }))
    expect(first).not.toContain('quiz-hint')
    expect(second).toContain('quiz-hint')
    expect(second).toContain(quiz.hint)
  })

  it('quiz displays options in the shuffled order (and keeps authored order data intact)', () => {
    const authored = quiz.questions[0].options
    vi.spyOn(Math, 'random').mockReturnValue(0.999) // Fisher-Yates with rng~1 keeps identity order
    const identity = optionTexts(renderToStaticMarkup(createElement(Quiz, { game: quiz, onResolve: noop })))
    expect(identity).toEqual(authored)
    vi.spyOn(Math, 'random').mockReturnValue(0) // rng 0 rotates the order
    const rotated = optionTexts(renderToStaticMarkup(createElement(Quiz, { game: quiz, onResolve: noop })))
    expect(rotated.length).toBe(authored.length)
    expect([...rotated].sort()).toEqual([...authored].sort())
    expect(rotated).not.toEqual(authored)
    expect(quiz.questions[0].options).toEqual(authored) // data untouched
  })

  it('spot opens the hint box from the start on the second attempt only', () => {
    const spot = MINIGAME_DATA['w1-robots'] as SpotGame
    const first = renderToStaticMarkup(createElement(Spot, { game: spot, onResolve: noop }))
    const second = renderToStaticMarkup(createElement(Spot, { game: spot, onResolve: noop, attempt: 2, onRetry: noop }))
    expect(first).not.toContain('spot-hint-box')
    expect(second).toContain('spot-hint-box')
    expect(second).toContain('索老師提示')
  })

  it('serp shows the retry hint only on the second attempt', () => {
    const serp = MINIGAME_DATA['w2-serp'] as SerpGame
    const first = renderToStaticMarkup(createElement(Serp, { game: serp, onResolve: noop }))
    const second = renderToStaticMarkup(createElement(Serp, { game: serp, onResolve: noop, attempt: 2, onRetry: noop }))
    expect(first).not.toContain('serp-hint')
    expect(second).toContain('serp-hint')
  })
})
