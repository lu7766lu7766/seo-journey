/**
 * Pure helpers shared by the three minigame engines: star rating, retry rules and option shuffling.
 *
 * Star rules (all engines):
 *   3 = passed on the FIRST attempt with no mistakes
 *       quiz: every question correct | spot: zero wrong clicks | serp: score >= SERP_THREE_STAR_SCORE
 *   2 = passed on the first attempt, but not perfectly
 *   1 = passed only after the one free retry (whatever the quality of the retry)
 *   0 = failed (after the retry, or when the player skips the retry)
 *
 * Retry: a FAILED first attempt may be retried exactly once, with the game's `hint` shown from the start.
 * A second failure resolves as lost. The scene still receives a single onResolve call per minigame.
 */

export type Attempt = 1 | 2
export type Stars = 0 | 1 | 2 | 3

/**
 * The SERP score is the sum of two fragments worth up to 50 points each (intent 25 + clarity 15 + front-loaded 5
 * + no-spam 5). The best title + best description reach 100; swapping either one for the second-best clean
 * fragment costs >= 21 points (<= 79, and the truncation penalty can take a few more). So 90 means "picked the
 * best pair", while the datasets' passScore (72) lets one second-best fragment pass for 2 stars; a vague or
 * spammy fragment stays below it.
 */
export const SERP_THREE_STAR_SCORE = 90

export function resolveStars(input: { passed: boolean; attempt: Attempt; perfect: boolean }): Stars {
  if (!input.passed) return 0
  if (input.attempt === 2) return 1
  return input.perfect ? 3 : 2
}

export const isQuizPerfect = (correct: number, total: number): boolean => total > 0 && correct === total
export const isSpotPerfect = (wrongClicks: number): boolean => wrongClicks === 0
export const isSerpPerfect = (score: number): boolean => score >= SERP_THREE_STAR_SCORE

/** the free retry is offered after a failed first attempt only */
export const canOfferRetry = (passed: boolean, attempt: Attempt): boolean => !passed && attempt === 1

export const quizStars = (correct: number, total: number, passed: boolean, attempt: Attempt): Stars =>
  resolveStars({ passed, attempt, perfect: isQuizPerfect(correct, total) })
export const spotStars = (won: boolean, wrongClicks: number, attempt: Attempt, usedHint = false): Stars =>
  resolveStars({ passed: won, attempt, perfect: isSpotPerfect(wrongClicks) && !usedHint })
export const serpStars = (score: number, passed: boolean, attempt: Attempt): Stars =>
  resolveStars({ passed, attempt, perfect: isSerpPerfect(score) })

export const starsText = (n: number): string => {
  const k = Math.max(0, Math.min(3, Math.floor(n)))
  return '★'.repeat(k) + '☆'.repeat(3 - k)
}

/** one-line caption for the result card */
export function starsCaption(stars: Stars, attempt: Attempt, retryAvailable: boolean): string {
  if (stars === 3) return '完美過關！第一次就沒有任何失誤'
  if (stars === 2) return '第一次就過關！再細心一點就能拿滿星'
  if (stars === 1) return '看了提示後順利過關，下次挑戰第一次就通過'
  if (retryAvailable) return '還有一次免費重考的機會，索老師會給你提示'
  return attempt === 2 ? '這次沒有過關，可以到圖鑑的練習模式再挑戰' : '沒有拿到星星，可以到圖鑑的練習模式再挑戰'
}

/** Fisher-Yates permutation of 0..n-1; `rng` is injectable for tests */
export function shuffledOrder(n: number, rng: () => number = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}
