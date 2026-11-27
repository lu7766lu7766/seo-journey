import { describe, expect, it } from 'vitest'
import { MINIGAME_DATA } from '@/content/minigames/data'
import type { QuizGame } from '@/content/minigames/types'

/**
 * Anti-test-taking-tricks guard for the quizzes: the right answer must not be guessable from option length,
 * absolute wording, or its position. See the director review that motivated this file.
 */
const ABSOLUTE_WORDS = ['保證', '一定', '只要', '完全', '所有', '就會', '絕對', '百分之百', '永遠', '必定', '全部', '一律', '肯定', '不可能', '任何']
const hasAbsolute = (s: string) => ABSOLUTE_WORDS.some((w) => s.includes(w))
const len = (s: string) => [...s].length

const quizzes = Object.entries(MINIGAME_DATA).filter((e): e is [string, QuizGame] => e[1].kind === 'quiz')
const questions = quizzes.flatMap(([id, g]) => g.questions.map((q, i) => ({ id, i, q })))

export function quizStats(g: QuizGame) {
  const qs = g.questions
  const longest = qs.filter((q) => {
    const lens = q.options.map(len)
    const max = Math.max(...lens)
    return lens[q.correct] === max && lens.filter((l) => l === max).length === 1
  }).length
  const wrong = qs.flatMap((q) => q.options.filter((_, i) => i !== q.correct))
  const idx = [0, 0, 0, 0]
  for (const q of qs) idx[q.correct]++
  return {
    n: qs.length,
    longestPct: Math.round((longest / qs.length) * 100),
    absWrongPct: Math.round((wrong.filter(hasAbsolute).length / wrong.length) * 100),
    idx: idx.slice(0, 3).join('/'),
  }
}

describe('quiz quality (anti test-taking tricks)', () => {
  it('prints per-quiz stats when STATS=1', () => {
    if (!process.env.STATS) return
    for (const [id, g] of quizzes) {
      process.stdout.write(`${id} ${JSON.stringify(quizStats(g))}\n`)
      g.questions.forEach((q, i) => process.stdout.write(`  Q${i + 1} correct=${q.correct} lens=${q.options.map(len).join(',')}\n`))
    }
    const all = quizStats({ kind: 'quiz', title: '', intro: '', passCount: 1, questions: questions.map((x) => x.q) })
    process.stdout.write(`ALL ${JSON.stringify(all)}\n`)
  })

  it('has quizzes to check', () => {
    expect(quizzes.length).toBeGreaterThanOrEqual(7)
    expect(questions.length).toBeGreaterThanOrEqual(20)
  })

  it('(a) the correct option is strictly the longest in <= 45% of questions overall', () => {
    const longest = questions.filter(({ q }) => {
      const lens = q.options.map(len)
      const max = Math.max(...lens)
      return lens[q.correct] === max && lens.filter((l) => l === max).length === 1
    }).length
    expect(longest / questions.length).toBeLessThanOrEqual(0.45)
  })

  it('(b) options in every question are of similar length (longest/shortest <= 1.6)', () => {
    for (const { id, i, q } of questions) {
      const lens = q.options.map(len)
      expect(Math.max(...lens) / Math.min(...lens), `${id}#${i} ${lens.join(',')}`).toBeLessThanOrEqual(1.6)
    }
  })

  it('(c) at most 25% of wrong options contain absolute words', () => {
    const wrong = questions.flatMap(({ q }) => q.options.filter((_, i) => i !== q.correct))
    const share = wrong.filter(hasAbsolute).length / wrong.length
    expect(share).toBeLessThanOrEqual(0.25)
  })

  it('(c2) wrong options are not the only ones using absolute words (correct ones may use them too)', () => {
    const wrongHits = questions.flatMap(({ q }) => q.options.filter((o, i) => i !== q.correct && hasAbsolute(o))).length
    const correctHits = questions.filter(({ q }) => hasAbsolute(q.options[q.correct])).length
    // the absolute-word tell must not be reliable in either direction: never 3+ more wrong hits than correct hits
    expect(wrongHits - correctHits).toBeLessThanOrEqual(3)
  })

  it('(d) the authored correct index is spread out: no position holds more than 50%', () => {
    const counts = new Map<number, number>()
    for (const { q } of questions) counts.set(q.correct, (counts.get(q.correct) ?? 0) + 1)
    for (const [pos, n] of counts) expect(n / questions.length, `index ${pos}`).toBeLessThanOrEqual(0.5)
    expect(counts.size, 'all three positions are used').toBeGreaterThanOrEqual(3)
  })

  it('(e) every question explains itself (>= 15 chars) and has a non-trivial prompt', () => {
    for (const { id, i, q } of questions) {
      expect(len(q.explain.trim()), `${id}#${i} explain`).toBeGreaterThanOrEqual(15)
      expect(len(q.prompt.trim()), `${id}#${i} prompt`).toBeGreaterThanOrEqual(10)
    }
  })

  it('(f) every question has 3 options (or 4 consistently) and a distinct text per option', () => {
    for (const { id, i, q } of questions) {
      expect([3, 4], `${id}#${i} option count`).toContain(q.options.length)
      expect(new Set(q.options).size, `${id}#${i} duplicate options`).toBe(q.options.length)
    }
    for (const [id, g] of quizzes) {
      expect(new Set(g.questions.map((q) => q.options.length)).size, `${id} mixes option counts`).toBe(1)
    }
  })

  it('every quiz has a retry hint that is a nudge, not the answer', () => {
    for (const [id, g] of quizzes) {
      expect(g.hint, `${id} hint`).toBeTruthy()
      expect(len(g.hint ?? ''), `${id} hint length`).toBeGreaterThanOrEqual(15)
    }
  })

  it('does not teach an official word count for direct answers', () => {
    const blob = JSON.stringify(MINIGAME_DATA)
    expect(blob).not.toMatch(/40\s*[～~\-–]\s*60|四十到六十/)
  })
})
