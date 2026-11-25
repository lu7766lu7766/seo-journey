import { useRef, useState } from 'react'
import { audio } from '@/audio'
import { scoreQuiz } from '@/content/minigames/scoring'
import type { QuizGame } from '@/content/minigames/types'

const LETTERS = ['A', 'B', 'C', 'D']

export function Quiz({ game, onResolve }: { game: QuizGame; onResolve: (won: boolean) => void }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [finished, setFinished] = useState(false)
  const resolvedRef = useRef(false)

  const question = game.questions[step]
  const selected = answers[step]
  const hasPicked = selected !== undefined

  const pickOption = (optIndex: number) => {
    if (hasPicked || !question) return
    audio.sfx('choice')
    const next = [...answers]
    next[step] = optIndex
    setAnswers(next)
  }

  const handleNext = () => {
    if (!hasPicked) return
    audio.sfx('click')
    if (step + 1 < game.questions.length) {
      setStep(step + 1)
    } else {
      setFinished(true)
    }
  }

  const finishOnce = (passed: boolean) => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    audio.sfx(passed ? 'card' : 'click')
    onResolve(passed)
  }

  if (finished || !question) {
    const result = scoreQuiz(game, answers)
    return (
      <div className="glass flex max-h-[640px] w-[880px] flex-col rounded-3xl p-7 text-ink">
        <div className="mb-4 flex items-center justify-between border-b border-ink/10 pb-3">
          <div>
            <span className="inline-block rounded-full bg-sakura/50 px-3 py-0.5 text-xs font-bold tracking-wide text-ink">
              知識測驗結算
            </span>
            <h2 className="mt-1 font-title text-2xl font-bold">{game.title}</h2>
          </div>
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              result.passed
                ? 'border border-emerald-500 bg-emerald-100 text-emerald-900'
                : 'border border-rose-400 bg-rose-100 text-rose-900'
            }`}
          >
            {result.passed ? '挑戰通過' : '差一點點'}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-ink/15 bg-white/85 p-4 text-center">
            <p className="text-3xl font-bold">
              答對 {result.correct} / {result.total} 題
            </p>
            <p className="mt-1 text-sm text-ink/75">
              過關門檻：至少答對 {game.passCount} 題。
              {result.passed ? ' 觀念相當清楚，繼續推進劇情吧！' : ' 沒關係，重點已經整理在下方，之後也可在圖鑑練習重玩。'}
            </p>
          </div>

          <div className="space-y-2">
            {game.questions.map((q, idx) => {
              const ok = answers[idx] === q.correct
              return (
                <div
                  key={idx}
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    ok ? 'border-emerald-300 bg-emerald-50/80' : 'border-rose-300 bg-rose-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 font-bold">
                    <span>
                      Q{idx + 1}. {q.prompt}
                    </span>
                    <span className={ok ? 'shrink-0 text-emerald-700' : 'shrink-0 text-rose-700'}>
                      {ok ? '正確' : '錯誤'}
                    </span>
                  </div>
                  <p className="mt-1 text-ink/85">{q.explain}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-ink/10 pt-4">
          <button
            type="button"
            className="btn-pastel px-8 py-2.5 text-base"
            data-testid="minigame-done"
            onClick={() => finishOnce(result.passed)}
          >
            完成並繼續
          </button>
        </div>
      </div>
    )
  }

  const isCorrect = selected === question.correct

  return (
    <div className="glass flex max-h-[640px] w-[880px] flex-col rounded-3xl p-7 text-ink">
      <div className="mb-3 flex items-center justify-between border-b border-ink/10 pb-3">
        <div>
          <span className="inline-block rounded-full bg-sky/50 px-3 py-0.5 text-xs font-bold text-ink">
            選擇題測驗
          </span>
          <h2 className="mt-1 font-title text-2xl font-bold">{game.title}</h2>
        </div>
        <div className="text-right text-sm font-semibold text-ink/80">
          第 {step + 1} / {game.questions.length} 題
        </div>
      </div>

      <p className="mb-3 text-sm text-ink/80">{game.intro}</p>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mb-4 rounded-2xl border border-ink/15 bg-white/85 p-4">
          <p className="text-lg font-bold leading-relaxed">{question.prompt}</p>
        </div>

        <div className="space-y-2.5">
          {question.options.map((optText, i) => {
            const isPicked = selected === i
            const isAnswer = i === question.correct
            let cls =
              'border-ink/15 bg-white/90 text-ink hover:border-sakura hover:bg-white'
            if (hasPicked) {
              if (isAnswer) {
                cls = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold'
              } else if (isPicked) {
                cls = 'border-rose-500 bg-rose-50 text-rose-950'
              } else {
                cls = 'border-ink/10 bg-white/55 text-ink/60'
              }
            }
            return (
              <button
                key={i}
                type="button"
                disabled={hasPicked}
                data-testid={`quiz-opt-${i}`}
                onClick={() => pickOption(i)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base transition ${cls}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/10 text-sm font-bold">
                  {LETTERS[i] ?? i + 1}
                </span>
                <span className="flex-1 leading-snug">{optText}</span>
                {hasPicked && isAnswer && (
                  <span className="shrink-0 text-xs font-bold text-emerald-700">正確答案</span>
                )}
                {hasPicked && isPicked && !isAnswer && (
                  <span className="shrink-0 text-xs font-bold text-rose-700">你的選擇</span>
                )}
              </button>
            )
          })}
        </div>

        {hasPicked && (
          <div
            className={`mt-4 rounded-2xl border p-4 text-sm leading-relaxed ${
              isCorrect
                ? 'border-emerald-400 bg-emerald-50/95 text-emerald-950'
                : 'border-rose-400 bg-rose-50/95 text-rose-950'
            }`}
          >
            <p className="font-bold">{isCorrect ? '答對了！' : '答錯囉！'}</p>
            <p className="mt-1">{question.explain}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
        <span className="text-xs text-ink/70">過關條件：答對至少 {game.passCount} 題</span>
        <button
          type="button"
          disabled={!hasPicked}
          data-testid="quiz-next"
          onClick={handleNext}
          className="btn-pastel px-7 py-2 text-base disabled:cursor-not-allowed disabled:opacity-45"
        >
          {step + 1 < game.questions.length ? '下一題' : '查看結果'}
        </button>
      </div>
    </div>
  )
}
