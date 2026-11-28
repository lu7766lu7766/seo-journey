import { useMemo, useRef, useState } from 'react'
import { audio } from '@/audio'
import { scoreSerp, truncateSerpPreview } from '@/content/minigames/scoring'
import type { SerpGame } from '@/content/minigames/types'
import { DotMatrixSlip, RetroMonitorFrame, Stamp } from '@/ui/material'
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
      <RetroMonitorFrame
        programTitle="AobaSearch Browser 1.0 · SERP 評分列印"
        bezelLabel="AOBA-404 CRT · PRINT OUT"
        screenTone="dark"
        headerRight={<span className="font-sans text-[15px] font-bold text-[#d7ebe4]">SERP 片段評分結果</span>}
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
          <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#968971] pb-2">
            <div>
              <p className="font-sans text-[15px] font-bold tracking-wider text-ink-muted">
                *** 404 網站研究社 · 搜尋片段評測條 ***
              </p>
              <h2 className="mt-0.5 font-title text-[21px] font-bold leading-snug text-ink-body">{game.title}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(result.titleTruncated || result.descTruncated) && (
                <Stamp label="尾端截斷" color="navy" shape="rect" size="sm" rotate={3} />
              )}
              <Stamp
                label={result.passed ? '優化過關' : '需要調整'}
                color={result.passed ? 'forest' : 'vermilion'}
                shape={result.passed ? 'oval' : 'rect'}
                size="md"
                rotate={-6}
              />
            </div>
          </div>

          <div className="mt-2 rounded-[2px] border border-[#bcae92] bg-[#fffdf9] px-3.5 py-2">
            <p className="font-sans text-[15px] font-semibold text-[#256341]">
              {game.siteName} · {game.urlPreview}
            </p>
            <p className="mt-0.5 font-sans text-[17px] font-bold text-[#1a0dab]">{result.titlePreview}</p>
            <p className="mt-0.5 font-sans text-[15px] leading-snug text-[#4d5156]">{result.descPreview}</p>
          </div>

          <div className="mt-2 grid grid-cols-[1fr_290px] items-center gap-4 border-y border-dashed border-[#b0a287] bg-[#fffdf8]/80 px-4 py-2.5">
            <div>
              <p className="font-title text-[22px] font-bold text-ink-body">綜合評分：{result.score} / 100</p>
              <p className="mt-0.5 flex flex-wrap gap-2 font-sans text-[15px] font-semibold text-ink-muted">
                <span>標題 {result.titleScore}/50</span>
                <span>·</span>
                <span>描述 {result.descScore}/50</span>
                {result.truncationPenalty > 0 && (
                  <span className="text-[#9a4a06]">· 截斷未前置 -{result.truncationPenalty}</span>
                )}
                {result.spamCapped && <span className="text-[var(--color-stamp)]">· 觸犯垃圾政策上限封頂</span>}
              </p>
              <p className="mt-0.5 font-sans text-[15px] text-ink-muted">
                過關門檻：{passScore} 分；{SERP_THREE_STAR_SCORE} 分以上（最佳組合）才有三顆星
              </p>
            </div>
            <div className="border-l border-dashed border-[#c6b99f] pl-4">
              <StarRating stars={stars} attempt={attempt} retryAvailable={retryAvailable} />
            </div>
          </div>

          <div className="mt-1.5 divide-y divide-dashed divide-[#bfb197]">
            {result.feedback.map((line, idx) => (
              <p key={idx} className="py-1.5 font-sans text-[15px] leading-relaxed text-ink-body">
                • {line}
              </p>
            ))}
          </div>
        </DotMatrixSlip>
      </RetroMonitorFrame>
    )
  }

  return (
    <RetroMonitorFrame
      programTitle="AobaSearch Browser 1.0 · 搜尋結果片段設計"
      bezelLabel="AOBA-404 CRT · SERP PREVIEW"
      screenTone="light"
      headerRight={<span className="font-sans text-[15px] font-bold text-[#d7ebe4]">即時預覽模擬</span>}
      stickyNote={
        attempt === 2
          ? {
              testId: 'serp-hint',
              title: '索老師提示',
              content: game.hint ?? DEFAULT_HINT,
            }
          : null
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-[15px] font-semibold text-ink-muted">
            評估標準：搜尋意圖、清晰度、重點前置、無堆砌垃圾詞
          </span>
          <button
            type="button"
            disabled={titleIndex === null || descIndex === null}
            className="mat-pass-btn px-7 py-2 font-title text-[17px] font-bold disabled:cursor-not-allowed disabled:opacity-45"
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
      }
    >
      <div className="shrink-0 border-b border-[#cfc1a5] bg-[#efe7d3] px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="border border-[#c6382b] px-2 py-0.5 font-title text-[15px] font-bold leading-tight text-[#c6382b]">
            搜尋結果片段組合
          </span>
          <h2 className="font-title text-[20px] font-bold leading-snug text-ink-body">{game.title}</h2>
        </div>
        <p className="mt-1 font-sans text-[15px] text-ink-muted">{game.intro}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
        {/* 復古搜尋引擎瀏覽器預覽框 */}
        <div className="overflow-hidden rounded-[4px] border-2 border-[#7f919c] bg-[#fffdf9] shadow-[0_2px_6px_rgba(38,18,6,0.1)]">
          <div className="flex items-center justify-between gap-2 border-b border-[#b5c2c9] bg-[#dce5e9] px-3.5 py-1.5 font-sans text-[15px] font-bold text-[#2b3f4a]">
            <span className="truncate">
              aoba-search:// {game.siteName} › {game.urlPreview}
            </span>
            <span className="shrink-0 font-title text-[15px] text-[#50646e]">〔模擬頁預覽〕</span>
          </div>
          <div className="px-4 py-2.5">
            <p className={`font-sans text-[18px] font-bold leading-snug ${activeTitle ? 'text-[#1a0dab]' : 'text-[#736b5e]'}`}>
              {activeTitle ? liveTitle.preview : '（請從下方選擇一則標題，即時觀察搜尋結果樣式）'}
            </p>
            <p className={`mt-1 font-sans text-[15px] leading-relaxed ${activeDesc ? 'text-[#4d5156]' : 'text-[#736b5e]'}`}>
              {activeDesc ? liveDesc.preview : '（請從下方選擇一則摘要描述）'}
            </p>
            {(liveTitle.truncated || liveDesc.truncated) && (
              <p className="mt-1.5 font-sans text-[15px] font-semibold text-[#9a4a06]">
                提示：過長內容在預覽末端可能顯示為「…」，沒有固定字數標準，建議把核心重點放前段。
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <h3 className="mb-1.5 font-title text-[17px] font-bold text-ink-body">1. 選擇標題（Title）</h3>
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
                    className={`flex w-full items-start gap-2 rounded-[4px] border-2 px-3 py-2 text-left font-sans text-[15px] leading-[1.4] transition focus-visible:outline-3 focus-visible:outline-[#2b6ea8] focus-visible:outline-offset-2 ${
                      active
                        ? 'border-[#2f5d8c] bg-[#e9f1f9] font-bold text-[#142d4c] shadow-[0_2px_6px_rgba(38,18,6,0.12)]'
                        : 'border-[#c4b599] bg-[#fffdf8] text-ink-body hover:border-[#2f5d8c]/70 hover:bg-[#f6f9fc]'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 font-bold text-[#2f5d8c]">{active ? '✓' : '○'}</span>
                    <span className="min-w-0 flex-1">{t.text}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 font-title text-[17px] font-bold text-ink-body">2. 選擇描述（Meta Description）</h3>
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
                    className={`flex w-full items-start gap-2 rounded-[4px] border-2 px-3 py-2 text-left font-sans text-[15px] leading-[1.4] transition focus-visible:outline-3 focus-visible:outline-[#2b6ea8] focus-visible:outline-offset-2 ${
                      active
                        ? 'border-[#2f5d8c] bg-[#e9f1f9] font-bold text-[#142d4c] shadow-[0_2px_6px_rgba(38,18,6,0.12)]'
                        : 'border-[#c4b599] bg-[#fffdf8] text-ink-body hover:border-[#2f5d8c]/70 hover:bg-[#f6f9fc]'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 font-bold text-[#2f5d8c]">{active ? '✓' : '○'}</span>
                    <span className="min-w-0 flex-1">{d.text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </RetroMonitorFrame>
  )
}
