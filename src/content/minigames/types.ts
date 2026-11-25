export interface QuizQuestion {
  prompt: string
  options: string[]
  correct: number
  explain: string
}

export interface QuizGame {
  kind: 'quiz'
  title: string
  intro: string
  questions: QuizQuestion[]
  passCount: number
}

export interface SpotLine {
  code: string
  explain?: string
}

export interface SpotGame {
  kind: 'spot'
  title: string
  intro: string
  hint?: string
  filename?: string
  lines: SpotLine[]
  targets: number[]
  maxMistakes?: number
  wrongExplain?: string
  summary?: string
}

export interface SerpFragment {
  text: string
  intentScore: number
  clarityScore: number
  noSpam: boolean
  frontLoaded: boolean
  feedback: string
}

export interface SerpGame {
  kind: 'serp'
  title: string
  intro: string
  urlPreview: string
  siteName: string
  titles: SerpFragment[]
  descriptions: SerpFragment[]
  passScore?: number
  titleMaxUnits?: number
  descMaxUnits?: number
}

export type MinigameDef = QuizGame | SpotGame | SerpGame
