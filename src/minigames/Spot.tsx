import { useRef, useState } from 'react'
import { audio } from '@/audio'
import { evaluateSpotClick } from '@/content/minigames/scoring'
import type { SpotGame } from '@/content/minigames/types'
import { DotMatrixSlip, RetroMonitorFrame, Stamp } from '@/ui/material'
import { StarRating } from './StarRating'
import { canOfferRetry, spotStars, type Attempt, type Stars } from './stars'

/**
 * Monospace stack for code blocks. Applied inline because the global `button { font-family: inherit }`
 * rule in index.css is unlayered and would otherwise beat Tailwind's `font-mono` utility on code rows.
 * Latin glyphs come from a monospace face; Traditional-Chinese text falls through to TC-capable fonts.
 */
const CODE_FONT_STACK =
  "ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Noto Sans Mono', 'DejaVu Sans Mono', 'Liberation Mono', " +
  "'Noto Sans Mono CJK TC', 'Source Han Mono TC', 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', monospace"
const CODE_STYLE = { fontFamily: CODE_FONT_STACK, fontVariantLigatures: 'none' } as const

export function Spot({
  game,
  onResolve,
  attempt = 1,
  onRetry,
}: {
  game: SpotGame
  onResolve: (won: boolean, stars?: number) => void
  attempt?: Attempt
  onRetry?: () => void
}) {
  const [foundLines, setFoundLines] = useState<number[]>([])
  const [wrongLines, setWrongLines] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [feedback, setFeedback] = useState<{ kind: 'hit' | 'miss' | 'info'; text: string } | null>(null)
  // the retry starts with the teacher's hint already open
  const [showHint, setShowHint] = useState(attempt === 2)
  const [usedHint, setUsedHint] = useState(attempt === 2)
  const [showResult, setShowResult] = useState(false)
  const resolvedRef = useRef(false)

  const maxMistakes = game.maxMistakes ?? 3
  const won = game.targets.every((t) => foundLines.includes(t))
  const lost = mistakes >= maxMistakes
  const gameEnded = won || lost
  // with a free retry still pending, the missed lines stay hidden so the second run is a real second try
  const canRetryNow = canOfferRetry(won, attempt) && !!onRetry
  const revealMissed = lost && !canRetryNow

  const handleLineClick = (index: number) => {
    if (gameEnded || wrongLines.includes(index)) return
    const res = evaluateSpotClick(game, foundLines, mistakes, index)
    setFoundLines(res.nextFound)
    setMistakes(res.nextMistakes)
    if (res.hit) {
      audio.sfx('choice')
      setFeedback({ kind: res.alreadyFound ? 'info' : 'hit', text: res.explanation })
    } else {
      audio.sfx('click')
      if (!wrongLines.includes(index)) setWrongLines((prev) => [...prev, index])
      setFeedback({ kind: 'miss', text: res.explanation })
    }
  }

  const finishOnce = (passed: boolean, stars: Stars) => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    audio.sfx(passed ? 'win' : 'fail')
    onResolve(passed, stars)
  }

  if (showResult) {
    const stars = spotStars(won, mistakes, attempt, usedHint)
    const retryAvailable = canOfferRetry(won, attempt) && !!onRetry
    return (
      <RetroMonitorFrame
        programTitle="AOBA-404 程式碼健檢 · 結果報告"
        bezelLabel="AOBA-404 CRT · PRINT OUT"
        screenTone="dark"
        headerRight={<span className="font-sans text-[15px] font-bold text-[#d7ebe4]">健檢找錯結算</span>}
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
              onClick={() => finishOnce(won, stars)}
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
                *** 404 網站研究社 · 健檢除錯報表 ***
              </p>
              <h2 className="mt-1 font-title text-[22px] font-bold leading-snug text-ink-body">{game.title}</h2>
            </div>
            <Stamp
              label={won ? '全部揪出' : '超過錯誤次數'}
              color={won ? 'forest' : 'vermilion'}
              shape={won ? 'oval' : 'rect'}
              size="md"
              rotate={-6}
              className="shrink-0"
            />
          </div>

          <div className="mt-3 border-y border-dashed border-[#b0a287] bg-[#fffdf8]/75 px-4 py-3 text-center">
            <p className="font-title text-[22px] font-bold text-ink-body">
              已找出 {foundLines.length} / {game.targets.length} 處問題（誤判 {mistakes} / {maxMistakes} 次）
            </p>
            {game.summary && <p className="mt-1.5 font-sans text-[15px] leading-relaxed text-ink-muted">{game.summary}</p>}
            <div className="mt-2.5 border-t border-dashed border-[#c6b99f] pt-2.5">
              <StarRating stars={stars} attempt={attempt} retryAvailable={retryAvailable} />
            </div>
          </div>

          <div className="mt-3 divide-y divide-dashed divide-[#bfb197]">
            {game.targets.map((targetIdx) => {
              const found = foundLines.includes(targetIdx)
              const line = game.lines[targetIdx]
              if (!found && retryAvailable) {
                return (
                  <div key={targetIdx} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                    <span className="font-bold text-ink-body">還有一處問題沒找到</span>
                    <span className="shrink-0 font-bold text-[#96540c]">重新挑戰時再找找看</span>
                  </div>
                )
              }
              return (
                <div key={targetIdx} className="py-2.5 text-[15px]">
                  <div className="flex items-start justify-between gap-3">
                    <code className="text-[15px] font-bold text-ink-body" style={CODE_STYLE}>
                      第 {targetIdx + 1} 行：{line?.code.trim()}
                    </code>
                    <span className={`shrink-0 font-bold ${found ? 'text-[#1e6645]' : 'text-[#96540c]'}`}>
                      {found ? '✓ 已找出' : '! 漏網重點'}
                    </span>
                  </div>
                  {line?.explain && <p className="mt-1 leading-relaxed text-ink-muted">{line.explain}</p>}
                </div>
              )
            })}
          </div>
        </DotMatrixSlip>
      </RetroMonitorFrame>
    )
  }

  const hintText = game.hint ?? '索老師提示：仔細比對題目描述的規則，點選出有違反規範或語法漏字的程式碼行（不會扣分）。'

  return (
    <RetroMonitorFrame
      programTitle={game.filename ? `AOBA-404 程式碼健檢 — ${game.filename}` : 'AOBA-404 程式碼健檢'}
      bezelLabel="AOBA-404 CRT · DEBUGGER"
      screenTone="dark"
      headerRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              audio.sfx('click')
              setShowHint((v) => {
                const next = !v
                if (next) setUsedHint(true)
                return next
              })
            }}
            data-testid="spot-hint-btn"
            className="rounded-[3px] border border-[#e5c16c] bg-[#fff1a8] px-3 py-0.5 font-title text-[15px] font-bold text-[#4a3208] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-[#7ee8fa]"
          >
            {showHint ? '收起提示' : attempt === 1 ? '索老師小提示（最高 ★★）' : '索老師小提示'}
          </button>
          <span className="rounded-[2px] border border-[#4c7e6f] bg-[#16362c] px-2.5 py-0.5 font-sans text-[15px] font-bold text-[#c9f5e4]">
            進度 {foundLines.length} / {game.targets.length}
          </span>
          <span
            className={`rounded-[2px] border px-2.5 py-0.5 font-sans text-[15px] font-bold ${
              mistakes >= maxMistakes - 1
                ? 'border-[#e07a88] bg-[#461c24] text-[#ffdce1]'
                : 'border-[#4a6b78] bg-[#192c34] text-[#e4f0f4]'
            }`}
          >
            誤判 {mistakes} / {maxMistakes}
          </span>
        </div>
      }
      stickyNote={
        showHint
          ? {
              testId: 'spot-hint-box',
              title: '索老師提示',
              content: hintText,
              onClose: () => setShowHint(false),
            }
          : null
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[15px] text-[#dbe8ec]">
            {won
              ? '所有問題都找出來了！點擊右側查看結算。'
              : lost
                ? revealMissed
                  ? '已達最大誤判次數，琥珀標記為漏掉的目標行。'
                  : '已達最大誤判次數，查看結算後可以免費重新挑戰一次。'
                : `找出全部 ${game.targets.length} 行錯誤（最多容錯 ${maxMistakes} 次）`}
          </span>
          {gameEnded && (
            <button
              type="button"
              className="mat-pass-btn px-7 py-2 font-title text-[17px] font-bold"
              data-testid="spot-finish"
              onClick={() => {
                audio.sfx('click')
                setShowResult(true)
              }}
            >
              查看結算
            </button>
          )}
        </div>
      }
    >
      <div className="shrink-0 border-b border-[#2e4852] bg-[#1a2c33] px-5 py-2">
        <div className="flex items-center gap-2.5">
          <span className="border border-[#7ce8c8]/75 px-2 py-0.5 font-title text-[15px] font-bold leading-tight text-[#aef5df]">
            程式碼／內容找錯
          </span>
          <h2 className="font-title text-[20px] font-bold leading-snug text-[#f7f4ea]">{game.title}</h2>
        </div>
        <p className="mt-0.5 font-sans text-[15px] leading-relaxed text-[#dbe8ec]">{game.intro}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2.5">
        <div className="overflow-hidden rounded-[4px] border border-[#3d5b66] bg-[#0e191e]">
          {game.filename && (
            <div
              className="flex items-center justify-between border-b border-[#2b424c] bg-[#142228] px-4 py-1 text-[15px] text-[#c8dce2]"
              style={CODE_STYLE}
            >
              <span>{game.filename}</span>
              <span>點擊有問題的程式碼行</span>
            </div>
          )}
          <div className="divide-y divide-[#20333b] py-0.5">
            {game.lines.map((line, i) => {
              const isFound = foundLines.includes(i)
              const isMissedTarget = revealMissed && game.targets.includes(i) && !isFound
              const isWrong = wrongLines.includes(i)

              let rowCls = 'text-[#f1f5f2] hover:bg-[#1a2f38]'
              let mark = '[ ]'
              if (isFound) {
                rowCls = 'bg-[#163a2f] text-[#eafcf4] ring-1 ring-inset ring-[#5ad2a2]/75'
                mark = '[✓]'
              } else if (isMissedTarget) {
                rowCls = 'bg-[#3b2c15] text-[#fef4d8] ring-1 ring-inset ring-[#f0b44c]/75'
                mark = '[!]'
              } else if (isWrong) {
                rowCls = 'bg-[#3a1c22] text-[#fde4e8] ring-1 ring-inset ring-[#e87a8a]/70'
                mark = '[×]'
              }

              return (
                <button
                  key={i}
                  type="button"
                  disabled={gameEnded || isWrong}
                  data-testid={`spot-line-${i}`}
                  onClick={() => handleLineClick(i)}
                  style={CODE_STYLE}
                  className={`flex w-full items-center gap-3 px-4 py-1.5 text-left text-[15px] transition focus-visible:outline-2 focus-visible:outline-[#7ee8fa] focus-visible:outline-offset-[-2px] ${rowCls}`}
                >
                  <span className="w-7 shrink-0 select-none text-right text-[15px] text-[#9bb4bd]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="shrink-0 select-none text-[15px] text-[#b4cad1]">{mark}</span>
                  <span className="flex-1 whitespace-pre-wrap break-all leading-snug">{line.code}</span>
                  {isFound && (
                    <span className="shrink-0 rounded-[2px] border border-[#5ad2a2]/70 bg-[#1e4d3e] px-2 py-0.5 font-sans text-[15px] font-bold text-[#d5faec]">
                      已標記問題
                    </span>
                  )}
                  {isMissedTarget && (
                    <span className="shrink-0 rounded-[2px] border border-[#f0b44c]/70 bg-[#543d18] px-2 py-0.5 font-sans text-[15px] font-bold text-[#ffebc2]">
                      正確目標
                    </span>
                  )}
                  {isWrong && !isFound && (
                    <span className="shrink-0 rounded-[2px] border border-[#e87a8a]/70 bg-[#52242c] px-2 py-0.5 font-sans text-[15px] font-bold text-[#ffd9df]">
                      無誤
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-3 rounded-[4px] border-2 px-4 py-3 font-sans text-[15px] leading-relaxed ${
              feedback.kind === 'hit'
                ? 'border-[#5ad2a2] bg-[#14332a] text-[#e7fbf2]'
                : feedback.kind === 'miss'
                  ? 'border-[#e87a8a] bg-[#381b21] text-[#fde5e9]'
                  : 'border-[#7ec4e8] bg-[#162d3a] text-[#e5f4fc]'
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>
    </RetroMonitorFrame>
  )
}
