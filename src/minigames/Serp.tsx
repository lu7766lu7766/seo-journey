import { useRef, useState } from 'react'
import { audio } from '@/audio'
import { scoreSerp, truncateSerpPreview } from '@/content/minigames/scoring'
import type { SerpGame } from '@/content/minigames/types'

export function Serp({ game, onResolve }: { game: SerpGame; onResolve: (won: boolean) => void }) {
  const [titleIndex, setTitleIndex] = useState(0)
  const [descIndex, setDescIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const resolvedRef = useRef(false)

  const titleMaxUnits = game.titleMaxUnits ?? 58
  const descMaxUnits = game.descMaxUnits ?? 140
  const passScore = game.passScore ?? 75

  const activeTitle = game.titles[titleIndex]
  const activeDesc = game.descriptions[descIndex]
  const liveTitle = truncateSerpPreview(activeTitle?.text ?? '', titleMaxUnits)
  const liveDesc = truncateSerpPreview(activeDesc?.text ?? '', descMaxUnits)

  const finishOnce = (passed: boolean) => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    audio.sfx(passed ? 'card' : 'click')
    onResolve(passed)
  }

  if (submitted) {
    const result = scoreSerp(game, titleIndex, descIndex)
    return (
      <div className="glass flex max-h-[640px] w-[880px] flex-col rounded-3xl p-7 text-ink">
        <div className="mb-4 flex items-center justify-between border-b border-ink/10 pb-3">
          <div>
            <span className="inline-block rounded-full bg-sakura/50 px-3 py-0.5 text-xs font-bold text-ink">
              SERP 片段評分結果
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
            {result.passed ? '優化過關' : '需要調整'}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-ink/20 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-600">
              {game.siteName} · {game.urlPreview}
            </p>
            <p className="mt-1 text-lg font-medium text-[#1a0dab]">{result.titlePreview}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#4d5156]">{result.descPreview}</p>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-ink/15 bg-white/85 px-5 py-3">
            <div>
              <p className="text-xl font-bold">綜合評分：{result.score} / 100</p>
              <p className="text-xs text-ink/75">過關門檻：{passScore} 分（依搜尋意圖、清晰度、無堆砌與重點前置評估）</p>
            </div>
            {(result.titleTruncated || result.descTruncated) && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                預覽尾端有截斷
              </span>
            )}
          </div>

          <div className="space-y-2">
            {result.feedback.map((line, idx) => (
              <div key={idx} className="rounded-xl border border-ink/15 bg-white/80 px-4 py-2.5 text-sm leading-relaxed">
                {line}
              </div>
            ))}
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

  return (
    <div className="glass flex max-h-[640px] w-[880px] flex-col rounded-3xl p-7 text-ink">
      <div className="mb-3 flex items-center justify-between border-b border-ink/10 pb-3">
        <div>
          <span className="inline-block rounded-full bg-sakura/50 px-3 py-0.5 text-xs font-bold text-ink">
            搜尋結果片段組合
          </span>
          <h2 className="mt-1 font-title text-2xl font-bold">{game.title}</h2>
        </div>
        <span className="text-xs font-semibold text-ink/75">即時預覽模擬（搜尋引擎仍可能依查詢改寫）</span>
      </div>

      <p className="mb-3 text-sm text-ink/85">{game.intro}</p>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {/* Live SERP preview card */}
        <div className="rounded-2xl border border-ink/20 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{game.siteName}</span>
            <span>›</span>
            <span className="truncate">{game.urlPreview}</span>
          </div>
          <p className="mt-1 text-lg font-medium text-[#1a0dab]">{liveTitle.preview}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#4d5156]">{liveDesc.preview}</p>
          {(liveTitle.truncated || liveDesc.truncated) && (
            <p className="mt-2 text-xs font-medium text-amber-800">
              提示：過長內容在預覽末端可能顯示為「…」，沒有固定字數標準，建議把核心重點放前段。
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <h3 className="mb-1.5 text-sm font-bold text-ink">1. 選擇標題（Title）</h3>
            <div className="space-y-2">
              {game.titles.map((t, i) => {
                const active = titleIndex === i
                return (
                  <button
                    key={i}
                    type="button"
                    data-testid={`serp-title-${i}`}
                    onClick={() => {
                      audio.sfx('click')
                      setTitleIndex(i)
                    }}
                    className={`w-full rounded-xl border-2 px-3 py-2 text-left text-xs leading-relaxed transition ${
                      active
                        ? 'border-sky-500 bg-sky-50 font-semibold text-ink shadow-sm'
                        : 'border-ink/15 bg-white/85 text-ink/85 hover:border-sakura hover:bg-white'
                    }`}
                  >
                    {t.text}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 text-sm font-bold text-ink">2. 選擇描述（Meta Description）</h3>
            <div className="space-y-2">
              {game.descriptions.map((d, i) => {
                const active = descIndex === i
                return (
                  <button
                    key={i}
                    type="button"
                    data-testid={`serp-desc-${i}`}
                    onClick={() => {
                      audio.sfx('click')
                      setDescIndex(i)
                    }}
                    className={`w-full rounded-xl border-2 px-3 py-2 text-left text-xs leading-relaxed transition ${
                      active
                        ? 'border-sky-500 bg-sky-50 font-semibold text-ink shadow-sm'
                        : 'border-ink/15 bg-white/85 text-ink/85 hover:border-sakura hover:bg-white'
                    }`}
                  >
                    {d.text}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
        <span className="text-xs text-ink/75">評估標準：搜尋意圖、清晰度、重點前置、無堆砌垃圾詞</span>
        <button
          type="button"
          className="btn-pastel px-7 py-2 text-base"
          data-testid="serp-submit"
          onClick={() => {
            audio.sfx('choice')
            setSubmitted(true)
          }}
        >
          提交評分
        </button>
      </div>
    </div>
  )
}
