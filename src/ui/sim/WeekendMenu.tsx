import { useState } from 'react'
import { Background } from '@/art/backgrounds'
import { CharacterSprite } from '@/art/characters'
import { useArtImage } from '@/art/hooks'
import { useArtManifest, useArtManifestStatus } from '@/art/manifest'
import { resolveBgSrc } from '@/art/resolve'
import { CHARACTERS } from '@/content/characters'
import { HEROINES } from '@/engine/types'
import { useGame } from '@/store/game'
import { getDateCount, pickDateScene } from '@/systems/ending'
import { INFIRMARY_WEEK_FLAG, WEEKEND } from '@/systems/schedule'
import { scoreParts } from '@/systems/score'

/** Same-hue fallback when the manifest has no `bg/home` (or it fails to load): a soft morning gradient + a line of text. */
function RestFallback() {
  return (
    <div
      className="absolute inset-0 flex items-start justify-center pt-12 text-center"
      style={{ background: 'linear-gradient(180deg, #ffe9c9 0%, #ffd9d2 55%, #cfe3f7 100%)' }}
    >
      <span className="font-title text-lg font-bold text-[#8a6a52]/80">週末的早晨，在家</span>
    </div>
  )
}

/**
 * The 「在家休息」 card's picture: the protagonist's room artwork (`bg/home`), cropped with object-cover towards the
 * window / desk side, under a soft warm morning-light gradient. Mirrors `Background`'s loading rule: nothing is drawn
 * until the manifest is known and the image has loaded (WEEKEND_ART preloads it), then it fades in.
 */
function RestScene() {
  const manifest = useArtManifest()
  const status = useArtManifestStatus()
  const src = resolveBgSrc(manifest, 'home')
  const { loaded, failed, imgProps } = useArtImage(src)
  if (status === 'loading') return null
  if (!src || failed) return <RestFallback />
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: '#f5e3cf',
        WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 78%, transparent 100%)',
        maskImage: 'linear-gradient(180deg, #000 0%, #000 78%, transparent 100%)',
      }}
    >
      <div className="art-fade absolute inset-0" style={{ opacity: loaded ? 1 : 0 }}>
        <img
          {...imgProps}
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition: '18% 50%' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(255, 236, 196, 0.42) 0%, rgba(255, 214, 190, 0.16) 55%, rgba(255, 255, 255, 0) 100%)',
          }}
        />
      </div>
    </div>
  )
}

export function WeekendMenu() {
  const s = useGame()
  const [busy, setBusy] = useState(false)
  // collapsing in the infirmary this week costs the weekend: only resting at home is possible
  const locked = s.flags[INFIRMARY_WEEK_FLAG] === true

  const pickDate = async (h: (typeof HEROINES)[number]) => {
    if (busy) return
    setBusy(true)
    try {
      await s.startWeekendDate(h)
    } finally {
      setBusy(false)
    }
  }

  const pickRest = async () => {
    if (busy) return
    setBusy(true)
    try {
      await s.startWeekendRest()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden px-8 pb-6 pt-14" data-testid="weekend-menu">
      <Background id="street" time="day" />
      <div className="pointer-events-none absolute inset-0 bg-[#0d1430]/45 backdrop-blur-[2px]" />
      <div className="vn-box relative z-10 rounded-2xl px-6 py-4 text-white">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-title text-3xl font-bold text-white">第 {s.week} 週 · 週末自由行動</h2>
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${s.stamina < 20 ? 'bg-rose-500/35 text-[#ffd6e2]' : 'bg-emerald-500/25 text-[#b5ead7]'}`}>
              體力 {s.stamina}/100
            </span>
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${s.stress >= 60 ? 'bg-amber-400/30 text-[#ffe599]' : 'bg-white/15 text-[#d5e3ff]'}`}>
              壓力 {s.stress}/100
            </span>
          </div>
          {locked ? (
            <p className="text-base font-bold text-[#ffd6e2]" data-testid="infirmary-lock">
              這週倒下過，週末只能好好休息（約會暫時鎖定）
            </p>
          ) : (
            <p className="text-base text-[#d5e3ff]">邀請一位夥伴出門（不耗體力、壓力 {WEEKEND.dateStress}），或留在家裡好好休息</p>
          )}
        </div>
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-4 gap-4 pt-4">
        {HEROINES.map((h) => {
          const c = CHARACTERS[h]
          const count = getDateCount(h, s)
          const parts = scoreParts(h, s.stats, s.bond)
          const sc = Math.round(parts.total)
          const site = Math.round(parts.site)
          const bond = Math.round(parts.bond)
          const pick = pickDateScene(h, s)
          const lockedStage3 = count === 2 && pick.stage === 'casual'
          return (
            <button
              key={h}
              disabled={busy || locked}
              data-testid={`date-${h}`}
              onClick={() => void pickDate(h)}
              className={`glass group relative flex flex-col items-center justify-end overflow-hidden rounded-3xl p-5 text-center transition hover:ring-2 hover:ring-sakura disabled:opacity-60 ${locked ? 'grayscale' : ''}`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-2 flex h-[300px] justify-center opacity-95 transition group-hover:scale-105">
                <CharacterSprite id={h} face="smile" />
              </div>
              <div className="relative z-10 w-full rounded-2xl bg-white/92 p-4 shadow-md">
                <p className="font-title text-2xl font-bold" style={{ color: c.color }}>
                  {c.name}
                </p>
                <p className="mt-1 text-sm font-bold text-ink/80" data-testid={`weekend-score-parts-${h}`}>
                  ♥ {sc}（網站 {site}{bond >= 0 ? `＋互動 ${bond}` : `－互動 ${Math.abs(bond)}`}）
                </p>
                <p className="mt-0.5 text-xs font-bold text-ink/70">
                  已約會 {count} 次
                </p>
                <p className="mt-1 text-xs text-ink/65">
                  {locked
                    ? '🔒 這週倒下過，沒辦法赴約'
                    : lockedStage3
                      ? '第 3 階段約會需好感度 ≥ 55（本次為普通相處）'
                      : pick.stage === 'casual'
                        ? '進行普通相處'
                        : count < 2
                          ? `將觸發第 ${pick.stage} 階段約會（第 3 階需 ♥ 55）`
                          : `將觸發第 ${pick.stage} 階段約會`}
                </p>
              </div>
            </button>
          )
        })}

        <button
          type="button"
          disabled={busy}
          data-testid="weekend-rest"
          onClick={() => void pickRest()}
          className={`glass group relative flex flex-col items-center justify-end overflow-hidden rounded-3xl p-5 text-center transition hover:ring-2 hover:ring-sakura disabled:opacity-60 ${locked ? 'ring-2 ring-[#9fd3f0]' : ''}`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[68%] overflow-hidden rounded-t-3xl">
            <div className="h-full w-full transition duration-300 group-hover:scale-105">
              <RestScene />
            </div>
          </div>
          <div className="relative z-10 w-full rounded-2xl bg-white/92 p-4 shadow-md">
            <p className="font-title text-2xl font-bold text-[#3b5a8a]">在家休息</p>
            <p className="mt-1 text-sm font-bold text-ink/80" data-testid="weekend-rest-effect">
              體力 +{WEEKEND.rest.stamina}、壓力 {WEEKEND.rest.stress < 0 ? '−' : '+'}{Math.abs(WEEKEND.rest.stress)}
            </p>
            <p className="mt-0.5 text-xs font-bold text-ink/70">不出門，好好充電</p>
            <p className="mt-1 text-xs text-ink/65">{locked ? '這週只能選這個' : '留在家裡補充體力、舒緩壓力'}</p>
          </div>
        </button>
      </div>
    </div>
  )
}
