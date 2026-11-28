import { useMemo, useRef, useState } from 'react'
import { audio } from '@/audio'
import { scoreSerp, truncateSerpPreview } from '@/content/minigames/scoring'
import type { SerpGame } from '@/content/minigames/types'
import { StarRating } from './StarRating'
import { SERP_THREE_STAR_SCORE, canOfferRetry, serpStars, shuffledOrder, type Attempt, type Stars } from './stars'

const DEFAULT_HINT = '索老師提示：想像搜尋結果只看得到前半段——哪一組一眼就讓人知道你是誰、能找到什麼？再留意有沒有誇大或堆砌的字眼。'

export function Serp({
  game,
  onResolve,
  attempt = 1,
  onRetry,
}: {
  game: SerpGame
  onResolve: (won: boolean, stars?: number) => void
  attempt?: Attempt
  onRetry?: () => void
}) {
  /** display order of the authored fragments, fixed for this mount; state keeps AUTHORED indices */
  const titleOrder = useMemo(() => shuffledOrder(game.titles.length), [game])
  const descOrder = useMemo(() => shuffledOrder(game.descriptions.length), [game])
  const [titleIndex, setTitleIndex] = useState<number | null>(null)
  const [descIndex, setDescIndex] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const resolvedRef = useRef(false)

  const titleMaxUnits = game.titleMaxUnits ?? 58
  const descMaxUnits = game.descMaxUnits ?? 140
  const passScore = game.passScore ?? 75

  const activeTitle = titleIndex !== null ? game.titles[titleIndex] : undefined
  const activeDesc = descIndex !== null ? game.descriptions[descIndex] : undefined
  const liveTitle = truncateSerpPreview(activeTitle?.text ?? '', titleMaxUnits)
  const liveDesc = truncateSerpPreview(activeDesc?.text ?? '', descMaxUnits)

  const finishOnce = (passed: boolean, stars: Stars) => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    audio.sfx(passed ? 'win' : 'fail')
    onResolve(passed, stars)
  }

  if (submitted && titleIndex !== null && descIndex !== null) {
    const result = scoreSerp(game, titleIndex, descIndex)
    const stars = serpStars(result.score, result.passed, attempt)
    const retryAvailable = canOfferRetry(result.passed, attempt) && !!onRetry
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
              <p className="mt-0.5 flex flex-wrap gap-2 text-xs font-semibold text-ink/80">
                <span>標題 {result.titleScore}/50</span>
                <span>·</span>
                <span>描述 {result.descScore}/50</span>
                {result.truncationPenalty > 0 && <span className="text-amber-800">· 截斷未前置 -{result.truncationPenalty}</span>}
                {result.spamCapped && <span className="text-[#d6334a]">· 觸犯垃圾政策上限封頂</span>}
              </p>
              <p className="mt-0.5 text-xs text-ink/75">
                過關門檻：{passScore} 分；{SERP_THREE_STAR_SCORE} 分以上（選出最佳組合）才有三顆星
              </p>
            </div>
            {(result.titleTruncated || result.descTruncated) && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                預覽尾端有截斷
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-ink/15 bg-white/85 px-5 py-3">
            <StarRating stars={stars} attempt={attempt} retryAvailable={retryAvailable} />
          </div>

          <div className="space-y-2">
            {result.feedback.map((line, idx) => (
              <div key={idx} className="rounded-xl border border-ink/15 bg-white/80 px-4 py-2.5 text-sm leading-relaxed">
                {line}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3 border-t border-ink/10 pt-4">
          {retryAvailable && (
            <button
              type="button"
              className="btn-pastel px-6 py-2.5 text-base"
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
            className={retryAvailable ? 'rounded-full border border-ink/25 bg-white/70 px-6 py-2.5 text-base font-semibold text-ink/80 transition hover:bg-white' : 'btn-pastel px-8 py-2.5 text-base'}
            data-testid="minigame-done"
            onClick={() => finishOnce(result.passed, stars)}
          >
            {retryAvailable ? '放棄並繼續' : '完成並繼續'}
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

      {attempt === 2 && (
        <div
          data-testid="serp-hint"
          className="mb-3 rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-2 text-xs font-semibold leading-relaxed text-amber-950"
        >
          💡 {game.hint ?? DEFAULT_HINT}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {/* Live SERP preview card */}
        <div className="rounded-2xl border border-ink/20 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{game.siteName}</span>
            <span>›</span>
            <span className="truncate">{game.urlPreview}</span>
          </div>
          <p className={`mt-1 text-lg font-medium ${activeTitle ? 'text-[#1a0dab]' : 'text-slate-400'}`}>
            {activeTitle ? liveTitle.preview : '（請從下方選擇一則標題，即時觀察搜尋結果樣式）'}
          </p>
          <p className={`mt-1 text-sm leading-relaxed ${activeDesc ? 'text-[#4d5156]' : 'text-slate-400'}`}>
            {activeDesc ? liveDesc.preview : '（請從下方選擇一則摘要描述）'}
          </p>
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
              {titleOrder.map((authored, i) => {
                const t = game.titles[authored]
                const active = titleIndex === authored
                return (
                  <button
                    key={i}
                    type="button"
                    data-testid={`serp-title-${i}`}
                    onClick={() => {
                      audio.sfx('click')
                      setTitleIndex(authored)
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
              {descOrder.map((authored, i) => {
                const d = game.descriptions[authored]
                const active = descIndex === authored
                return (
                  <button
                    key={i}
                    type="button"
                    data-testid={`serp-desc-${i}`}
                    onClick={() => {
                      audio.sfx('click')
                      setDescIndex(authored)
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
          disabled={titleIndex === null || descIndex === null}
          className="btn-pastel px-7 py-2 text-base disabled:cursor-not-allowed disabled:opacity-45"
          data-testid="serp-submit"
          onClick={() => {
            if (titleIndex === null || descIndex === null) return
            audio.sfx('choice')
            setSubmitted(true)
          }}
        >
          {titleIndex === null || descIndex === null ? '請先選擇標題與描述' : '提交評分'}
        </button>
      </div>
    </div>
  )
}
