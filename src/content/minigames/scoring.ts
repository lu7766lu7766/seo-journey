import type { QuizGame, SerpGame, SpotGame } from './types'

export interface QuizScoreResult {
  correct: number
  total: number
  passed: boolean
}

export function scoreQuiz(game: QuizGame, answers: number[]): QuizScoreResult {
  const total = game.questions.length
  let correct = 0
  for (let i = 0; i < total; i++) {
    if (answers[i] === game.questions[i].correct) correct++
  }
  return {
    correct,
    total,
    passed: correct >= game.passCount,
  }
}

export interface SpotClickResult {
  hit: boolean
  alreadyFound: boolean
  nextFound: number[]
  nextMistakes: number
  explanation: string
  won: boolean
  lost: boolean
}

export function evaluateSpotClick(
  game: SpotGame,
  foundLines: number[],
  mistakes: number,
  lineIndex: number,
): SpotClickResult {
  const maxMistakes = game.maxMistakes ?? 3
  const alreadyWon = game.targets.every((t) => foundLines.includes(t))
  const alreadyLost = mistakes >= maxMistakes

  if (lineIndex < 0 || lineIndex >= game.lines.length || alreadyWon || alreadyLost) {
    return {
      hit: false,
      alreadyFound: false,
      nextFound: foundLines,
      nextMistakes: mistakes,
      explanation: '',
      won: alreadyWon,
      lost: alreadyLost,
    }
  }

  const line = game.lines[lineIndex]
  const isTarget = game.targets.includes(lineIndex)

  if (foundLines.includes(lineIndex)) {
    return {
      hit: true,
      alreadyFound: true,
      nextFound: foundLines,
      nextMistakes: mistakes,
      explanation: line.explain ?? '這一行問題已經標記過了。',
      won: alreadyWon,
      lost: false,
    }
  }

  if (isTarget) {
    const nextFound = [...foundLines, lineIndex]
    const won = game.targets.every((t) => nextFound.includes(t))
    return {
      hit: true,
      alreadyFound: false,
      nextFound,
      nextMistakes: mistakes,
      explanation: line.explain ?? '答對了！這一行確實有問題。',
      won,
      lost: false,
    }
  }

  const nextMistakes = mistakes + 1
  return {
    hit: false,
    alreadyFound: false,
    nextFound: foundLines,
    nextMistakes,
    explanation: line.explain ?? game.wrongExplain ?? '這一行沒有問題，再檢查其他行看看。',
    won: false,
    lost: nextMistakes >= maxMistakes,
  }
}

/** Measure visual display width units (ASCII = 1, CJK/wide = 2) for SERP snippet preview. */
function displayUnits(text: string): number {
  let units = 0
  for (const ch of text) {
    units += ch.charCodeAt(0) <= 0x7f ? 1 : 2
  }
  return units
}

export function truncateSerpPreview(text: string, maxUnits: number): { preview: string; truncated: boolean } {
  if (displayUnits(text) <= maxUnits) return { preview: text, truncated: false }
  let used = 0
  let out = ''
  const budget = Math.max(2, maxUnits - 3)
  for (const ch of text) {
    const w = ch.charCodeAt(0) <= 0x7f ? 1 : 2
    if (used + w > budget) break
    out += ch
    used += w
  }
  return { preview: `${out}…`, truncated: true }
}

export interface SerpScoreResult {
  score: number
  passed: boolean
  titlePreview: string
  descPreview: string
  titleTruncated: boolean
  descTruncated: boolean
  feedback: string[]
}

export function scoreSerp(game: SerpGame, titleIndex: number, descIndex: number): SerpScoreResult {
  const title = game.titles[titleIndex]
  const desc = game.descriptions[descIndex]
  const passScore = game.passScore ?? 75
  const titleMaxUnits = game.titleMaxUnits ?? 58
  const descMaxUnits = game.descMaxUnits ?? 140

  if (!title || !desc) {
    return {
      score: 0,
      passed: false,
      titlePreview: '',
      descPreview: '',
      titleTruncated: false,
      descTruncated: false,
      feedback: ['請先選擇一組標題與摘要描述片段。'],
    }
  }

  const { preview: titlePreview, truncated: titleTruncated } = truncateSerpPreview(title.text, titleMaxUnits)
  const { preview: descPreview, truncated: descTruncated } = truncateSerpPreview(desc.text, descMaxUnits)

  // Each fragment contributes up to 50 points: intent (0-25) + clarity (0-15) + frontLoaded (5) + noSpam (5)
  let rawScore =
    title.intentScore +
    title.clarityScore +
    (title.frontLoaded ? 5 : 0) +
    (title.noSpam ? 5 : 0) +
    desc.intentScore +
    desc.clarityScore +
    (desc.frontLoaded ? 5 : 0) +
    (desc.noSpam ? 5 : 0)

  // Penalize truncation when core information wasn't front-loaded
  if (titleTruncated && !title.frontLoaded) rawScore -= 5
  if (descTruncated && !desc.frontLoaded) rawScore -= 5

  // Keyword stuffing / misleading spam cannot pass regardless of partial matches
  const hasSpam = !title.noSpam || !desc.noSpam
  const score = Math.max(0, Math.min(100, hasSpam ? Math.min(rawScore, passScore - 20) : rawScore))

  const feedback: string[] = [
    `標題評估：${title.feedback}`,
    `摘要評估：${desc.feedback}`,
  ]

  if (hasSpam) {
    feedback.push('堆砌關鍵字或誇大不實的標題與摘要違反垃圾內容政策，容易讓讀者卻步。')
  }
  if (titleTruncated) {
    feedback.push(
      '標題在預覽末端可能被截斷；搜尋結果沒有固定的字數規定，且搜尋引擎也可能自行改寫，因此重點應放在前段。',
    )
  }
  if (descTruncated) {
    feedback.push(
      '描述後段在預覽中可能被省略；建議採「結論先說」把核心時間、地點或價值放在前段。',
    )
  }

  return {
    score,
    passed: score >= passScore,
    titlePreview,
    descPreview,
    titleTruncated,
    descTruncated,
    feedback,
  }
}
