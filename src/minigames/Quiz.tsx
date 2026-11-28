import { useMemo, useRef, useState } from 'react'
import { audio } from '@/audio'
import { scoreQuiz } from '@/content/minigames/scoring'
import type { QuizGame } from '@/content/minigames/types'
import { DotMatrixSlip, RetroMonitorFrame, Stamp } from '@/ui/material'
import { StarRating } from './StarRating'
import { canOfferRetry, quizStars, shuffledOrder, type Attempt, type Stars } from './stars'

const LETTERS = ['A', 'B', 'C', 'D']
const DEFAULT_HINT = '索老師提示：先想想題目在問什麼情境，再比較每個選項有沒有真的解決問題，別被聽起來很厲害的說法騙了。'

export function Quiz({
  game,
  onResolve,
  attempt = 1,
  onRetry,
}: {
  game: QuizGame
  onResolve: (won: boolean, stars?: number) => void
  attempt?: Attempt
  onRetry?: () => void
}) {
  const [step, setStep] = useState(0)
  /** display order of the authored options, fixed for this mount (answers stay in authored indices) */
  const orders = useMemo(() => game.questions.map((q) => shuffledOrder(q.options.length)), [game])
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

  const finishOnce = (passed: boolean, stars: Stars) => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    audio.sfx(passed ? 'win' : 'fail')
    onResolve(passed, stars)
  }

  if (finished || !question) {
    const result = scoreQuiz(game, answers)
    const stars = quizStars(result.correct, result.total, result.passed, attempt)
    const retryAvailable = canOfferRetry(result.passed, attempt) && !!onRetry

    return (
      <RetroMonitorFrame
        programTitle="404 社團測驗系統 · 成績列印"
        bezelLabel="AOBA-404 CRT · PRINT OUT"
        screenTone="dark"
        headerRight={<span className="font-sans text-[15px] font-bold text-[#d7ebe4]">知識測驗結算</span>}
        footer={
          <div className="flex items-center justify-end gap-3">
            {retryAvailable && (
              <button
                type="button"
                className="mat-pass-btn px-6 py-2 font-title text-[16px] font-bold"
                data-testid="minigame-retry"
                onClick={() => {
                  audio.sfx('choice')
                  onRetry?.()
                }}
              >
                再挑戰一次（索老師會給提示）
              </button>
            )}
            <button
              type="button"
              className={
                retryAvailable
                  ? 'mat-washi-btn px-6 py-2 font-title text-[16px] font-bold'
                  : 'mat-pass-btn px-8 py-2 font-title text-[17px] font-bold'
              }
              data-testid="minigame-done"
              onClick={() => finishOnce(result.passed, stars)}
            >
              {retryAvailable ? '放棄並繼續' : '完成並繼續'}
            </button>
          </div>
        }
      >
        <DotMatrixSlip>
          <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#968971] pb-3">
            <div>
              <p className="font-sans text-[15px] font-bold tracking-wider text-ink-muted">
                *** 404 網站研究社 · 知識測驗成績條 ***
              </p>
              <h2 className="mt-1 font-title text-[22px] font-bold leading-snug text-ink-body">{game.title}</h2>
            </div>
            <Stamp
              label={result.passed ? '挑戰通過' : '差一點點'}
              color={result.passed ? 'forest' : 'vermilion'}
              shape={result.passed ? 'oval' : 'rect'}
              size="md"
              rotate={-6}
              className="shrink-0"
            />
          </div>

          <div className="mt-3 border-y border-dashed border-[#b0a287] bg-[#fffdf8]/75 px-4 py-3 text-center">
            <p className="font-title text-[24px] font-bold text-ink-body">
              答對 {result.correct} / {result.total} 題
            </p>
            <p className="mt-1 font-sans text-[15px] text-ink-muted">
              過關門檻：至少答對 {game.passCount} 題。
              {result.passed
                ? ' 觀念相當清楚，繼續推進劇情吧！'
                : retryAvailable
                  ? ' 沒關係，先看看下方整理的重點，再挑戰一次吧！'
                  : ' 沒關係，重點已經整理在下方，之後也可在圖鑑練習重玩。'}
            </p>
            <div className="mt-2.5 border-t border-dashed border-[#c6b99f] pt-2.5">
              <StarRating stars={stars} attempt={attempt} retryAvailable={retryAvailable} />
            </div>
          </div>

          <div className="mt-3 divide-y divide-dashed divide-[#bfb197]">
            {game.questions.map((q, idx) => {
              const ok = answers[idx] === q.correct
              const hideAnswerForRetry = !ok && retryAvailable
              if (hideAnswerForRetry) {
                return (
                  <div key={idx} className="py-2.5 text-[15px]">
                    <div className="flex items-start justify-between gap-3 font-bold text-ink-body">
                      <span>
                        Q{idx + 1}. {q.prompt}
                      </span>
                      <span className="shrink-0 text-[#96540c]">… 未答對 · 重新挑戰時再想想</span>
                    </div>
                  </div>
                )
              }
              return (
                <div key={idx} className="py-2.5 text-[15px]">
                  <div className="flex items-start justify-between gap-3 font-bold text-ink-body">
                    <span>
                      Q{idx + 1}. {q.prompt}
                    </span>
                    <span className={`shrink-0 ${ok ? 'text-[#1e6645]' : 'text-[var(--color-stamp)]'}`}>
                      {ok ? '✓ 正確' : '✕ 錯誤'}
                    </span>
                  </div>
                  {!ok && (
                    <p className="mt-1 font-sans text-[15px] font-semibold text-[#8c361d]">
                      你的選擇：{q.options[answers[idx]] ?? '未作答'} ｜ 正確答案：{q.options[q.correct]}
                    </p>
                  )}
                  <p className="mt-1 leading-relaxed text-ink-muted">{q.explain}</p>
                </div>
              )
            })}
          </div>
        </DotMatrixSlip>
      </RetroMonitorFrame>
    )
  }

  const isCorrect = selected === question.correct
  const revealImmediately = isCorrect || attempt === 2
  const order = orders[step] ?? question.options.map((_, i) => i)
  const hint = game.hint ?? DEFAULT_HINT

  return (
    <RetroMonitorFrame
      programTitle="404 社團測驗系統"
      bezelLabel="AOBA-404 CRT · QUIZ"
      screenTone="light"
      headerRight={
        <span className="font-sans text-[15px] font-bold text-[#f7f3e8]">
          第 {step + 1} / {game.questions.length} 題
        </span>
      }
      stickyNote={
        attempt === 2
          ? {
              testId: 'quiz-hint',
              title: '索老師提示',
              content: hint,
            }
          : null
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[15px] font-semibold text-ink-muted">
            過關條件：答對至少 {game.passCount} 題
          </span>
          <button
            type="button"
            disabled={!hasPicked}
            data-testid="quiz-next"
            onClick={handleNext}
            className="mat-pass-btn px-7 py-2 font-title text-[17px] font-bold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {step + 1 < game.questions.length ? '下一題' : '查看結果'}
          </button>
        </div>
      }
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#cfc1a5] bg-[#efe7d3] px-5 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="border border-[#2f5d8c] px-2 py-0.5 font-title text-[15px] font-bold leading-tight text-[#2f5d8c]">
              選擇題測驗
            </span>
            <h2 className="font-title text-[21px] font-bold leading-snug text-ink-body">{game.title}</h2>
          </div>
          <p className="mt-0.5 font-sans text-[15px] text-ink-muted">{game.intro}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2.5">
        <div className="mb-2.5 rounded-[4px] border border-[#b5a484] bg-[#fffdf8] px-4 py-2.5 shadow-[0_2px_6px_rgba(38,18,6,0.08)]">
          <p className="font-title text-[18px] font-bold leading-relaxed text-ink-body">{question.prompt}</p>
        </div>

        <div className="space-y-2">
          {order.map((authoredIdx, i) => {
            const optText = question.options[authoredIdx]
            const isPicked = selected === authoredIdx
            const isAnswer = authoredIdx === question.correct
            let cls =
              'border-[#bcae92] bg-[#fffdf8] text-ink-body hover:border-[#2f5d8c] hover:bg-[#f2f6fa]'
            let keycapCls = 'border-[#9e8d70] bg-[#efe5cf] text-ink-body'
            if (hasPicked) {
              if (isAnswer && revealImmediately) {
                cls = 'border-[#2d7355] bg-[#e6f4ec] text-[#174632] font-semibold'
                keycapCls = 'border-[#2d7355] bg-[#2d7355] text-white'
              } else if (isPicked) {
                cls = isCorrect
                  ? 'border-[#2d7355] bg-[#e6f4ec] text-[#174632] font-semibold'
                  : 'border-[#c6382b] bg-[#fae9e7] text-[#7a1e16]'
                keycapCls = isCorrect
                  ? 'border-[#2d7355] bg-[#2d7355] text-white'
                  : 'border-[#c6382b] bg-[#c6382b] text-white'
              } else {
                cls = 'border-[#d4c8b1] bg-[#f4efe1] text-ink-muted'
                keycapCls = 'border-[#c2b59c] bg-[#e8dec9] text-ink-muted'
              }
            }
            return (
              <button
                key={i}
                type="button"
                disabled={hasPicked}
                data-testid={`quiz-opt-${i}`}
                onClick={() => pickOption(authoredIdx)}
                className={`flex w-full items-center gap-3 rounded-[4px] border-2 px-3.5 py-2 text-left text-[15.5px] transition focus-visible:outline-3 focus-visible:outline-[#2b6ea8] focus-visible:outline-offset-2 ${cls}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border font-sans text-[15px] font-bold ${keycapCls}`}
                >
                  {LETTERS[i] ?? i + 1}
                </span>
                <span className="flex-1 leading-snug">{optText}</span>
                {hasPicked && isAnswer && revealImmediately && (
                  <span className="shrink-0 font-title text-[15px] font-bold text-[#1e6645]">〔正確答案〕</span>
                )}
                {hasPicked && isPicked && !isAnswer && (
                  <span className="shrink-0 font-title text-[15px] font-bold text-[var(--color-stamp)]">〔你的選擇〕</span>
                )}
              </button>
            )
          })}
        </div>

        {hasPicked && (
          <div
            className={`mt-2.5 rounded-[4px] border-2 px-4 py-2.5 text-[15px] leading-relaxed ${
              isCorrect
                ? 'border-[#2d7355] bg-[#e8f5ee] text-[#174632]'
                : 'border-[#c6382b] bg-[#fbedeb] text-[#7a1e16]'
            }`}
          >
            <p className="font-title text-[16px] font-bold">{isCorrect ? '✓ 答對了！' : '✕ 答錯囉！'}</p>
            <p className="mt-0.5">
              {revealImmediately
                ? question.explain
                : '先記下這一題的疑問！完成全部題目後若未達門檻，可免費重考並參考索老師提示。'}
            </p>
          </div>
        )}
      </div>
    </RetroMonitorFrame>
  )
}
