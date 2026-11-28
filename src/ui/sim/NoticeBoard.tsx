import { Background } from '@/art/backgrounds'
import { useArtImage } from '@/art/hooks'
import { useArtManifest, useArtManifestStatus } from '@/art/manifest'
import { resolveSpriteSrc } from '@/art/resolve'
import { CHARACTERS, type CharId } from '@/content/characters'
import { QUEST_BLURBS } from '@/content/flavor'
import { SCENE_IDS } from '@/content/scenes'
import { useGame } from '@/store/game'
import { availableQuests, MAX_QUESTS_PER_WEEK } from '@/systems/quests'
import {
  Corkboard,
  FourPointStar,
  Paper,
  Pin,
  RoomBadge,
  SakuraPetal,
  SearchRule,
  Stamp,
  StickyNote,
  Tape,
  WoodPlaque,
  type PaperTone,
  type PinColor,
  type TapeColor,
} from '@/ui/material'

/** 紙面上的文字強調色（避免亮橘/淡紫在米白紙上對比不足）。 */
const PAPER_INK_ACCENT: Record<CharId, string> = {
  rin: '#1f3a6e',
  hare: '#b45309',
  mirai: '#5b4b99',
  sensei: '#7c5338',
  kuro: '#2d2d38',
}

interface SlipDecoration {
  rotate: number
  tone: PaperTone
  attach: 'pin' | 'tape'
  pinColor: PinColor
  tapeColor: TapeColor
  tapeRotate: number
  photoRotate: number
}

const SLIP_PRESETS: readonly SlipDecoration[] = [
  { rotate: -1.3, tone: 'cream', attach: 'pin', pinColor: 'red', tapeColor: 'sakura', tapeRotate: -4, photoRotate: -2.5 },
  { rotate: 1.1, tone: 'warm', attach: 'tape', pinColor: 'blue', tapeColor: 'sky', tapeRotate: 3, photoRotate: 2 },
  { rotate: 0.7, tone: 'warm', attach: 'tape', pinColor: 'mint', tapeColor: 'mint', tapeRotate: -5, photoRotate: -1.5 },
  { rotate: -0.9, tone: 'cream', attach: 'pin', pinColor: 'yellow', tapeColor: 'cream', tapeRotate: 4, photoRotate: 2.2 },
]

function questSeriesLabel(id: string): string | null {
  const m = id.match(/^sq-[rhm](\d)$/)
  return m ? `第 ${m[1]}/3 話` : null
}

/** 貼在委託單上的小型拍立得大頭照，跟隨 manifest 與預載快取，不閃現 SVG。 */
function PolaroidAvatar({ id, compact, rotate }: { id: CharId; compact: boolean; rotate: number }) {
  const manifest = useArtManifest()
  const status = useArtManifestStatus()
  const resolved = resolveSpriteSrc(manifest, id, 'normal')
  const { loaded, failed, imgProps } = useArtImage(resolved?.src ?? null)
  const c = CHARACTERS[id]
  const sizeCls = compact ? 'h-[52px] w-[46px]' : 'h-[62px] w-[54px]'

  return (
    <div
      className="relative shrink-0 rounded-[2px] border border-[#d6c7ae] bg-[#fffdf8] p-[3px] pb-[6px] shadow-[0_2px_6px_rgba(38,18,6,0.2)]"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#232b4f] to-[#121730] ${sizeCls}`}
      >
        {status !== 'loading' && resolved?.src && !failed ? (
          <img
            {...imgProps}
            src={resolved.src}
            alt={c.name ?? ''}
            draggable={false}
            className="art-fade h-full w-full select-none object-cover object-[50%_14%] scale-[1.34]"
            style={{ opacity: loaded ? 1 : 0 }}
          />
        ) : status !== 'loading' ? (
          <div
            className="flex h-full w-full items-center justify-center font-title text-[18px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${c.color}, ${c.accent})` }}
          >
            {(c.name ?? id).slice(0, 1)}
          </div>
        ) : null}
      </div>
      <span
        aria-hidden="true"
        className="mt-[3px] block h-[2.5px] w-full rounded-full"
        style={{ backgroundColor: c.color }}
      />
    </div>
  )
}

export function NoticeBoard() {
  const { week, flags, questsDoneThisWeek, startSideQuest, skipBoardToWeekend } = useGame()
  const quests = availableQuests(week, flags).filter((q) => SCENE_IDS.includes(q.id))
  const remaining = Math.max(0, MAX_QUESTS_PER_WEEK - questsDoneThisWeek)
  const isEmpty = remaining === 0 || quests.length === 0
  const isDense = quests.length >= 3
  const isSingle = quests.length === 1

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden px-10 pb-4 pt-14"
      data-testid="notice-board"
    >
      <Background id="corridor" time="dusk" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#171122]/36 via-[#231718]/18 to-[#120d10]/38 backdrop-blur-[1.5px]"
      />

      <Corkboard
        className="relative z-10 h-[622px] w-[1136px]"
        innerClassName="px-8 py-5"
        header={
          <div className="flex items-start justify-between gap-4">
            <WoodPlaque className="flex items-center">
              <div className="flex items-center gap-3">
                <RoomBadge label="404" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-title text-[26px] font-bold leading-tight tracking-wide text-[#fff8eb]">
                      放學後・委託公佈欄
                    </h2>
                    <FourPointStar size={14} color="#ffe39b" />
                  </div>
                  <p className="mt-0.5 text-[14px] text-[#f3dcc0]">
                    不佔平日排程 · 完成支線可獲得能力值、好感度與知識卡
                  </p>
                </div>
              </div>
            </WoodPlaque>

            <StickyNote
              color={remaining > 0 ? 'yellow' : 'pink'}
              rotate={2.1}
              attach="pin"
              pinColor={remaining > 0 ? 'red' : 'mint'}
              className="mt-1 shrink-0 px-5 pb-3 pt-4 text-center"
            >
              <div className="font-sans text-[13px] font-bold text-ink-muted">第 {week} 週委託額度</div>
              <div className="mt-0.5 font-title text-[19px] font-bold text-ink-body">
                本週可接 {remaining} / {MAX_QUESTS_PER_WEEK} 件
              </div>
            </StickyNote>
          </div>
        }
        footer={
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="relative inline-flex items-center gap-2 rounded-[2px] border border-[#b59467] bg-[#f6ebd4] py-1.5 pl-7 pr-4 shadow-[0_2px_6px_rgba(34,16,4,0.24)]">
              <Pin color="brass" size={18} className="absolute left-1.5 top-1/2 -translate-y-1/2" />
              <span className="text-[13.5px] font-bold text-ink-body">
                青葉學園 404 網站研究社 · 放學後佈告欄
              </span>
            </div>

            <button
              type="button"
              className="mat-pass-btn px-7 py-2.5 font-title text-[20px] font-bold"
              data-testid="skip-board"
              onClick={skipBoardToWeekend}
            >
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full border border-[#f2dfc0]/80 bg-[#d8b173] shadow-inner"
              />
              <span>前往週末</span>
              <span aria-hidden="true" className="text-[#ffe39b]">→</span>
            </button>
          </div>
        }
      >
        {isEmpty ? (
          <div className="flex items-center justify-center py-4">
            <Paper
              tone="warm"
              rule="memo"
              rotate={-1.1}
              dogEar
              className="relative flex w-[680px] flex-col items-center px-12 pb-10 pt-11 text-center"
            >
              <Tape color="sakura" pattern="stripe" rotate={-14} width={78} height={20} className="absolute -top-2.5 left-8" />
              <Tape color="sky" pattern="solid" rotate={13} width={78} height={20} className="absolute -top-2.5 right-8" />
              <Pin color="brass" size={22} className="absolute -top-3 left-1/2 -translate-x-1/2" />

              <Stamp
                label={remaining === 0 ? '本週額度已滿' : '暫無新委託'}
                color={remaining === 0 ? 'navy' : 'forest'}
                shape="oval"
                rotate={-6}
                size="md"
                className="mb-4"
              />

              <p className="font-title text-[24px] font-bold leading-relaxed text-ink-body">
                {remaining === 0 ? '本週委託已滿，好好休息準備週末吧！' : '目前沒有新的委託案件，先準備迎接週末吧！'}
              </p>

              <SearchRule className="my-4 w-72" />

              <div className="flex items-center gap-2 font-title text-[16px] text-ink-muted">
                <SakuraPetal size={17} rotate={-16} />
                <span>點擊右下角「前往週末」安排假日行程或補充體力</span>
                <SakuraPetal size={17} rotate={24} />
              </div>
            </Paper>
          </div>
        ) : (
          <div
            className={
              isSingle
                ? 'mx-auto w-full max-w-[580px]'
                : isDense
                  ? 'mx-auto grid w-full grid-cols-2 gap-x-6 gap-y-5'
                  : 'mx-auto grid w-full max-w-[1008px] grid-cols-2 gap-7'
            }
          >
            {quests.map((q, idx) => {
              const b = QUEST_BLURBS[q.id]
              const isLastWeek = q.maxWeek === week
              const series = questSeriesLabel(q.id)
              const charId: CharId = q.heroine ?? 'kuro'
              const preset = SLIP_PRESETS[idx % SLIP_PRESETS.length]
              const tone: PaperTone = q.id === 'sq-x1' ? 'kraft' : preset.tone
              const rule = q.id === 'sq-x1' ? 'none' : 'lined'

              return (
                <Paper
                  key={q.id}
                  as="button"
                  interactive
                  curled
                  dogEar={!isDense}
                  tone={tone}
                  rule={rule}
                  rotate={preset.rotate}
                  data-testid={`quest-${q.id}`}
                  onClick={() => void startSideQuest(q.id)}
                  className={`group flex w-full flex-col justify-between text-left ${
                    isDense ? 'min-h-[172px] px-5 pb-3.5 pt-5' : 'min-h-[224px] px-6 pb-5 pt-7'
                  }`}
                >
                  {preset.attach === 'pin' ? (
                    <Pin
                      color={preset.pinColor}
                      size={isDense ? 22 : 24}
                      className="absolute -top-3 left-1/2 z-20 -translate-x-1/2"
                    />
                  ) : (
                    <Tape
                      color={preset.tapeColor}
                      pattern="stripe"
                      rotate={preset.tapeRotate}
                      width={isDense ? 76 : 88}
                      height={isDense ? 19 : 21}
                      className="absolute -top-2.5 left-1/2 z-20 -translate-x-1/2"
                    />
                  )}

                  <div className="flex items-start gap-3.5">
                    <PolaroidAvatar id={charId} compact={isDense} rotate={preset.photoRotate} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-bold text-ink-muted">
                            {series && <span style={{ color: PAPER_INK_ACCENT[charId] }}>〔{series}〕</span>}
                            <span>{b?.client ?? ''}</span>
                            {!isLastWeek && <span>· 第 {q.maxWeek} 週前可接</span>}
                          </div>
                          <h3
                            className={`mt-0.5 font-title font-bold leading-snug text-ink-body ${
                              isDense ? 'text-[20px]' : 'text-[23px]'
                            }`}
                          >
                            {b?.title ?? q.id}
                          </h3>
                        </div>

                        {isLastWeek && (
                          <Stamp
                            label="本週截止"
                            color="vermilion"
                            shape="rect"
                            rotate={-8}
                            size="sm"
                            className="mt-0.5 shrink-0"
                          />
                        )}
                      </div>

                      <SearchRule className={isDense ? 'my-1.5' : 'my-2'} />

                      <p
                        className={`font-title text-ink-body ${
                          isDense ? 'line-clamp-2 text-[15.5px] leading-[1.45]' : 'text-[17px] leading-[1.6]'
                        }`}
                      >
                        {b?.blurb ?? ''}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between gap-3 border-t border-dashed border-[#bda889] ${
                      isDense ? 'mt-2.5 pt-2' : 'mt-4 pt-3'
                    }`}
                  >
                    <span className="font-sans text-[14px] font-bold text-[#2b4d78]">
                      報酬：{q.rewardHint}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 font-title text-[16px] font-bold text-[var(--color-stamp)] transition-transform group-hover:translate-x-1">
                      接下委託 →
                    </span>
                  </div>
                </Paper>
              )
            })}
          </div>
        )}
      </Corkboard>
    </div>
  )
}
