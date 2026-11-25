import { useRef, useState } from 'react'
import { audio } from '@/audio'
import { evaluateSpotClick } from '@/content/minigames/scoring'
import type { SpotGame } from '@/content/minigames/types'

/**
 * Monospace stack for code blocks. Applied inline because the global `button { font-family: inherit }`
 * rule in index.css is unlayered and would otherwise beat Tailwind's `font-mono` utility on code rows.
 * Latin glyphs come from a monospace face; Traditional-Chinese text falls through to TC-capable fonts.
 */
const CODE_FONT_STACK =
  "ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Noto Sans Mono', 'DejaVu Sans Mono', 'Liberation Mono', " +
  "'Noto Sans Mono CJK TC', 'Source Han Mono TC', 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', monospace"
const CODE_STYLE = { fontFamily: CODE_FONT_STACK, fontVariantLigatures: 'none' } as const

export function Spot({ game, onResolve }: { game: SpotGame; onResolve: (won: boolean) => void }) {
  const [foundLines, setFoundLines] = useState<number[]>([])
  const [wrongLines, setWrongLines] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [feedback, setFeedback] = useState<{ kind: 'hit' | 'miss' | 'info'; text: string } | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const resolvedRef = useRef(false)

  const maxMistakes = game.maxMistakes ?? 3
  const won = game.targets.every((t) => foundLines.includes(t))
  const lost = mistakes >= maxMistakes
  const gameEnded = won || lost

  const handleLineClick = (index: number) => {
    if (gameEnded) return
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

  const finishOnce = (passed: boolean) => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    audio.sfx(passed ? 'card' : 'click')
    onResolve(passed)
  }

  if (showResult) {
    return (
      <div className="glass flex max-h-[640px] w-[880px] flex-col rounded-3xl p-7 text-ink">
        <div className="mb-4 flex items-center justify-between border-b border-ink/10 pb-3">
          <div>
            <span className="inline-block rounded-full bg-mint/60 px-3 py-0.5 text-xs font-bold text-ink">
              健檢找錯結算
            </span>
            <h2 className="mt-1 font-title text-2xl font-bold">{game.title}</h2>
          </div>
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              won
                ? 'border border-emerald-500 bg-emerald-100 text-emerald-900'
                : 'border border-rose-400 bg-rose-100 text-rose-900'
            }`}
          >
            {won ? '全部揪出！' : '超過錯誤次數'}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-ink/15 bg-white/85 p-4 text-center">
            <p className="text-2xl font-bold">
              已找出 {foundLines.length} / {game.targets.length} 處問題（誤判 {mistakes} / {maxMistakes} 次）
            </p>
            {game.summary && <p className="mt-2 text-sm leading-relaxed text-ink/85">{game.summary}</p>}
          </div>

          <div className="space-y-2">
            {game.targets.map((targetIdx) => {
              const found = foundLines.includes(targetIdx)
              const line = game.lines[targetIdx]
              return (
                <div
                  key={targetIdx}
                  className={`rounded-xl border px-4 py-2.5 text-sm ${
                    found ? 'border-emerald-300 bg-emerald-50/85' : 'border-amber-300 bg-amber-50/85'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-bold text-ink" style={CODE_STYLE}>
                      第 {targetIdx + 1} 行：{line?.code.trim()}
                    </code>
                    <span className={`shrink-0 text-xs font-bold ${found ? 'text-emerald-700' : 'text-amber-800'}`}>
                      {found ? '已找出' : '漏網重點'}
                    </span>
                  </div>
                  {line?.explain && <p className="mt-1 text-ink/85">{line.explain}</p>}
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
            onClick={() => finishOnce(won)}
          >
            完成並繼續
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="glass flex max-h-[640px] w-[880px] flex-col rounded-3xl p-7 text-ink">
      <div className="mb-3 flex items-center justify-between border-b border-ink/10 pb-3">
        <div>
          <span className="inline-block rounded-full bg-mint/60 px-3 py-0.5 text-xs font-bold text-ink">
            程式碼／內容找錯
          </span>
          <h2 className="mt-1 font-title text-2xl font-bold">{game.title}</h2>
        </div>
        <div className="flex items-center gap-2.5 text-sm font-bold">
          <button
            type="button"
            onClick={() => {
              audio.sfx('click')
              setShowHint((v) => !v)
            }}
            data-testid="spot-hint-btn"
            className="rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950 transition hover:brightness-95"
          >
            💡 {showHint ? '收起提示' : '索老師小提示'}
          </button>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">
            進度 {foundLines.length} / {game.targets.length}
          </span>
          <span
            className={`rounded-full px-3 py-1 ${
              mistakes >= maxMistakes - 1 ? 'bg-rose-100 text-rose-900' : 'bg-white/80 text-ink'
            }`}
          >
            誤判 {mistakes} / {maxMistakes}
          </span>
        </div>
      </div>

      <p className="mb-2.5 text-sm leading-relaxed text-ink/85">{game.intro}</p>

      {showHint && (
        <div
          data-testid="spot-hint-box"
          className="mb-2.5 rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-2 text-xs leading-relaxed font-semibold text-amber-950"
        >
          {game.hint ?? '索老師提示：仔細比對題目描述的規則，點選出有違反規範或語法漏字的程式碼行（不會扣分）。'}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="overflow-hidden rounded-2xl border border-ink/20 bg-[#1e1b2e] shadow-inner">
          {game.filename && (
            <div
              className="flex items-center justify-between border-b border-white/10 bg-[#161324] px-4 py-1.5 text-xs text-slate-300"
              style={CODE_STYLE}
            >
              <span>{game.filename}</span>
              <span>點擊有問題的程式碼行</span>
            </div>
          )}
          <div className="divide-y divide-white/5 py-1">
            {game.lines.map((line, i) => {
              const isFound = foundLines.includes(i)
              const isMissedTarget = lost && game.targets.includes(i) && !isFound
              const isWrong = wrongLines.includes(i)

              let rowCls = 'text-slate-100 hover:bg-white/10'
              if (isFound) {
                rowCls = 'border-l-4 border-emerald-400 bg-emerald-900/55 text-emerald-100'
              } else if (isMissedTarget) {
                rowCls = 'border-l-4 border-amber-400 bg-amber-900/45 text-amber-100'
              } else if (isWrong) {
                rowCls = 'border-l-4 border-rose-400 bg-rose-900/40 text-rose-100'
              }

              return (
                <button
                  key={i}
                  type="button"
                  disabled={gameEnded}
                  data-testid={`spot-line-${i}`}
                  onClick={() => handleLineClick(i)}
                  style={CODE_STYLE}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition ${rowCls}`}
                >
                  <span className="w-6 shrink-0 select-none text-right text-xs text-slate-400">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-all">{line.code}</span>
                  {isFound && (
                    <span className="shrink-0 rounded bg-emerald-500/30 px-2 py-0.5 text-xs font-sans font-bold text-emerald-200">
                      已標記問題
                    </span>
                  )}
                  {isMissedTarget && (
                    <span className="shrink-0 rounded bg-amber-500/30 px-2 py-0.5 text-xs font-sans font-bold text-amber-200">
                      正確目標
                    </span>
                  )}
                  {isWrong && !isFound && (
                    <span className="shrink-0 rounded bg-rose-500/30 px-2 py-0.5 text-xs font-sans font-bold text-rose-200">
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
            className={`mt-3 rounded-2xl border p-3.5 text-sm leading-relaxed ${
              feedback.kind === 'hit'
                ? 'border-emerald-400 bg-emerald-50/95 text-emerald-950'
                : feedback.kind === 'miss'
                  ? 'border-rose-400 bg-rose-50/95 text-rose-950'
                  : 'border-sky-400 bg-sky-50/95 text-ink'
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
        <span className="text-xs text-ink/75">
          {won
            ? '所有問題都找出來了！點擊右側查看結算。'
            : lost
              ? '已達最大誤判次數，橘色標記為漏掉的目標行。'
              : `找出全部 ${game.targets.length} 行錯誤（最多容錯 ${maxMistakes} 次）`}
        </span>
        {gameEnded && (
          <button
            type="button"
            className="btn-pastel px-7 py-2 text-base"
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
    </div>
  )
}
