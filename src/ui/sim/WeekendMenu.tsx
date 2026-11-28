import { useState } from 'react'
import { Background } from '@/art/backgrounds'
import { CharacterSprite } from '@/art/characters'
import { useArtImage } from '@/art/hooks'
import { useArtManifest, useArtManifestStatus } from '@/art/manifest'
import { resolveBgSrc } from '@/art/resolve'
import { CHARACTERS } from '@/content/characters'
import { HEROINES, type HeroineId } from '@/engine/types'
import { useGame } from '@/store/game'
import { getDateCount, pickDateScene } from '@/systems/ending'
import { INFIRMARY_WEEK_FLAG, WEEKEND } from '@/systems/schedule'
import { scoreParts } from '@/systems/score'
import {
  Corkboard,
  PAPER_INK_ACCENT,
  Paper,
  Pin,
  RoomBadge,
  SakuraPetal,
  Stamp,
  StickyNote,
  Tape,
  WoodPlaque,
  type PinColor,
} from '@/ui/material'

interface PolaroidPreset {
  rotate: number
  pinColor: PinColor
  photoTint: string
  lineColor: string
}

const HEROINE_CARD_PRESET: Record<HeroineId, PolaroidPreset> = {
  rin: {
    rotate: -1.1,
    pinColor: 'blue',
    photoTint: 'from-[#dfe8f8] via-[#edf3fc] to-[#d4e1f4]',
    lineColor: '#1f3a6e',
  },
  hare: {
    rotate: 0.9,
    pinColor: 'yellow',
    photoTint: 'from-[#fff2dd] via-[#fff7eb] to-[#fae3c2]',
    lineColor: '#f28c28',
  },
  mirai: {
    rotate: -0.7,
    pinColor: 'sakura',
    photoTint: 'from-[#ebe6fa] via-[#f4f1fd] to-[#e0d8f5]',
    lineColor: '#9a8cd0',
  },
}

/** Same-hue fallback when the manifest has no `bg/home` (or it fails to load): a soft morning gradient + a line of text. */
function RestFallback() {
  return (
    <div
      className="absolute inset-0 flex items-start justify-center pt-12 text-center"
      style={{ background: 'linear-gradient(180deg, #ffe9c9 0%, #ffd9d2 55%, #cfe3f7 100%)' }}
    >
      <span className="font-title text-[18px] font-bold text-[#7c5338]">週末的早晨，在家</span>
    </div>
  )
}

/**
 * 「在家休息」拍立得照片：主角房間晨光插圖（`bg/home`），依 manifest 與預載規則淡入。
 */
function RestScene() {
  const manifest = useArtManifest()
  const status = useArtManifestStatus()
  const src = resolveBgSrc(manifest, 'home')
  const { loaded, failed, imgProps } = useArtImage(src)
  if (status === 'loading') return null
  if (!src || failed) return <RestFallback />
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f5e3cf]">
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
              'linear-gradient(180deg, rgba(255, 236, 196, 0.28) 0%, rgba(255, 214, 190, 0.08) 60%, rgba(255, 255, 255, 0) 100%)',
          }}
        />
      </div>
    </div>
  )
}

export function WeekendMenu() {
  const s = useGame()
  const [busy, setBusy] = useState(false)
  // 本週倒進保健室時週末僅能在家休息
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
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 pb-3 pt-14"
      data-testid="weekend-menu"
    >
      <Background id="street" time="day" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#171122]/36 via-[#231718]/18 to-[#120d10]/38 backdrop-blur-[1.5px]"
      />

      <Corkboard
        className="relative z-10 h-[636px] w-[1216px]"
        innerClassName="px-6 py-4"
        header={
          <div className="flex items-start justify-between gap-4">
            <WoodPlaque className="flex items-center">
              <div className="flex items-center gap-3">
                <RoomBadge label={`W${s.week}`} />
                <div>
                  <h2 className="font-title text-[25px] font-bold leading-tight text-[#fff8eb]">
                    第 {s.week} 週 · 週末自由行動
                  </h2>
                  {locked ? (
                    <p className="mt-0.5 text-[14px] font-bold text-[#ffd2dc]" data-testid="infirmary-lock">
                      這週倒下過，週末只能好好休息（約會暫時鎖定）
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[14px] text-[#f3dcc0]">
                      邀請一位夥伴出門（不耗體力、壓力 {WEEKEND.dateStress}），或留在家裡好好休息
                    </p>
                  )}
                </div>
              </div>
            </WoodPlaque>

            <StickyNote
              color={s.stamina < 20 || s.stress >= 60 ? 'pink' : 'yellow'}
              rotate={1.8}
              attach="pin"
              pinColor={s.stamina < 20 ? 'red' : 'blue'}
              className="mt-0.5 shrink-0 px-4 pb-2.5 pt-3.5"
            >
              <div className="flex items-center gap-4 font-sans text-[14px] font-bold">
                <span className={s.stamina < 20 ? 'text-[var(--color-stamp)]' : 'text-[#205e42]'}>
                  體力 {s.stamina}/100
                </span>
                <span className="text-ink-muted">｜</span>
                <span className={s.stress >= 60 ? 'text-[var(--color-stamp)]' : 'text-ink-body'}>
                  壓力 {s.stress}/100
                </span>
              </div>
            </StickyNote>
          </div>
        }
      >
        <div className="grid w-full grid-cols-4 items-center gap-4 pt-2">
          {HEROINES.map((h) => {
            const c = CHARACTERS[h]
            const preset = HEROINE_CARD_PRESET[h]
            const count = getDateCount(h, s)
            const parts = scoreParts(h, s.stats, s.bond)
            const sc = Math.round(parts.total)
            const site = Math.round(parts.site)
            const bond = Math.round(parts.bond)
            const pick = pickDateScene(h, s)
            const lockedStage3 = count === 2 && pick.stage === 'casual'

            return (
              <Paper
                key={h}
                as="button"
                interactive={!locked && !busy}
                curled
                tone="white"
                rotate={preset.rotate}
                disabled={busy || locked}
                data-testid={`date-${h}`}
                onClick={() => void pickDate(h)}
                className="group mat-polaroid flex h-[466px] w-full flex-col text-left disabled:cursor-not-allowed"
              >
                <Pin color={preset.pinColor} size={22} className="absolute -top-3 left-1/2 z-20 -translate-x-1/2" />

                {/* 上半部：拍立得立繪視窗 */}
                <div
                  className={`relative h-[238px] w-full overflow-hidden rounded-[2px] border border-[#d6c7ae] bg-gradient-to-b ${preset.photoTint}`}
                >
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-1 flex h-[308px] justify-center transition duration-300 ${
                      locked ? 'grayscale opacity-75' : 'opacity-95 group-hover:scale-[1.04]'
                    }`}
                  >
                    <CharacterSprite id={h} face="smile" />
                  </div>

                  {locked && (
                    <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-[#2c253b]/15 pb-5">
                      <span
                        className="inline-block rounded-[4px] bg-[#fbf6eb]/92 shadow-[0_3px_10px_rgba(38,18,6,0.28)]"
                        style={{ transform: 'rotate(-10deg)' }}
                      >
                        <Stamp label="本週休養中" color="vermilion" shape="rect" size="md" rotate={0} />
                      </span>
                    </div>
                  )}
                </div>

                {/* 下半部：相紙手寫邀約資料 */}
                <div className="flex min-h-0 flex-1 flex-col justify-between px-1.5 pt-2.5">
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-title text-[22px] font-bold leading-tight" style={{ color: PAPER_INK_ACCENT[h] }}>
                        {c.name}
                      </p>
                      <span className="font-sans text-[13px] font-bold text-ink-muted">已約會 {count} 次</span>
                    </div>

                    <span
                      aria-hidden="true"
                      className="mt-1.5 block h-[2px] w-full rounded-full opacity-75"
                      style={{ backgroundColor: preset.lineColor }}
                    />

                    <p
                      className="mt-2 font-sans text-[13.5px] font-bold text-ink-body"
                      data-testid={`weekend-score-parts-${h}`}
                    >
                      ♥ {sc}（網站 {site}
                      {bond >= 0 ? `＋互動 ${bond}` : `－互動 ${Math.abs(bond)}`}）
                    </p>

                    <p className="mt-1.5 font-title text-[15px] leading-[1.42] text-ink-body">
                      {locked
                        ? '這週倒下過，先好好休養，下次再一起出門吧。'
                        : lockedStage3
                          ? '第 3 階段約會需好感度 ≥ 55（本次為普通相處）'
                          : pick.stage === 'casual'
                            ? '邀請一起散步聊天，進行輕鬆的普通相處'
                            : count < 2
                              ? `將觸發第 ${pick.stage} 階段約會（第 3 階需 ♥ 55）`
                              : `將觸發第 ${pick.stage} 階段約會`}
                    </p>
                  </div>

                  <div className="flex items-center justify-end border-t border-dashed border-[#d6c7ae] pt-1.5">
                    <span
                      className={`font-title text-[15px] font-bold transition-transform ${
                        locked
                          ? 'text-ink-muted'
                          : 'text-[var(--color-stamp)] group-hover:translate-x-1'
                      }`}
                    >
                      {locked ? '本週休養中' : '邀請出門 →'}
                    </span>
                  </div>
                </div>
              </Paper>
            )
          })}

          {/* 第四張：「在家休息」拍立得照片卡 */}
          <Paper
            as="button"
            interactive={!busy}
            curled
            tone="white"
            rotate={1.1}
            disabled={busy}
            data-testid="weekend-rest"
            onClick={() => void pickRest()}
            className={`group mat-polaroid flex h-[466px] w-full flex-col text-left ${
              locked ? 'ring-2 ring-[var(--color-stamp-green)]' : ''
            }`}
          >
            <Tape color="mint" pattern="dots" rotate={-3} width={76} height={19} className="absolute -top-2.5 left-1/2 z-20 -translate-x-1/2" />

            <div className="relative h-[238px] w-full overflow-hidden rounded-[2px] border border-[#d6c7ae] bg-[#f5e3cf]">
              <div className="h-full w-full transition duration-300 group-hover:scale-[1.04]">
                <RestScene />
              </div>

              {locked && (
                <div className="pointer-events-none absolute right-2.5 top-2.5">
                  <span
                    className="inline-block rounded-[3px] bg-[#fbf6eb]/92 shadow-[0_2px_8px_rgba(38,18,6,0.25)]"
                    style={{ transform: 'rotate(-8deg)' }}
                  >
                    <Stamp label="建議休養" color="forest" shape="rect" size="sm" rotate={0} />
                  </span>
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-between px-1.5 pt-2.5">
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-title text-[22px] font-bold leading-tight text-[#255943]">在家休息</p>
                  <span className="font-sans text-[13px] font-bold text-[#2d7355]">充電休養</span>
                </div>

                <span aria-hidden="true" className="mt-1.5 block h-[2px] w-full rounded-full bg-[#489e79]/75" />

                <p className="mt-2 font-sans text-[13.5px] font-bold text-[#216347]" data-testid="weekend-rest-effect">
                  體力 +{WEEKEND.rest.stamina}、壓力 {WEEKEND.rest.stress < 0 ? '−' : '+'}
                  {Math.abs(WEEKEND.rest.stress)}
                </p>

                <p className="mt-1.5 font-title text-[15px] leading-[1.42] text-ink-body">
                  {locked
                    ? '這週身體透支了，留在家裡好好睡一覺吧！'
                    : '不出門，待在房間裡補充體力、舒緩壓力。'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-dashed border-[#d6c7ae] pt-1.5">
                <SakuraPetal size={16} rotate={18} />
                <span className="font-title text-[15px] font-bold text-[#2d7355] transition-transform group-hover:translate-x-1">
                  在家休息 →
                </span>
              </div>
            </div>
          </Paper>
        </div>
      </Corkboard>
    </div>
  )
}
