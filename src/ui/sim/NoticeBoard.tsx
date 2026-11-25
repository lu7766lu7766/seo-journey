import { Background } from '@/art/backgrounds'
import { CharacterAvatar } from '@/art/characters/Avatar'
import { QUEST_BLURBS } from '@/content/flavor'
import { SCENE_IDS } from '@/content/scenes'
import { useGame } from '@/store/game'
import { availableQuests, MAX_QUESTS_PER_WEEK } from '@/systems/quests'

export function NoticeBoard() {
  const { week, flags, questsDoneThisWeek, startSideQuest, skipBoardToWeekend } = useGame()
  const quests = availableQuests(week, flags).filter((q) => SCENE_IDS.includes(q.id))
  const remaining = Math.max(0, MAX_QUESTS_PER_WEEK - questsDoneThisWeek)

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-8" data-testid="notice-board">
      <Background id="corridor" time="dusk" />
      <div className="pointer-events-none absolute inset-0 bg-[#0c1228]/50 backdrop-blur-[2px]" />
      <div className="relative z-10 flex max-h-[640px] w-[920px] flex-col gap-5">
        <div className="vn-box flex items-center justify-between rounded-2xl px-6 py-4 text-white">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-title text-3xl font-bold text-white">放學後 · 委託公佈欄</h2>
              <span className="rounded-full bg-[#3fd0d4]/25 px-3 py-0.5 text-xs font-bold text-[#9fd3f0]">
                本週可接 {remaining} / {MAX_QUESTS_PER_WEEK} 件
              </span>
            </div>
            <p className="mt-1 text-sm text-[#d5e3ff]">不佔平日排程，完成支線可獲得屬性、好感度與知識卡</p>
          </div>
          <button className="btn-pastel px-6 py-2.5 text-lg" data-testid="skip-board" onClick={skipBoardToWeekend}>
            前往週末 →
          </button>
        </div>

        {remaining === 0 || quests.length === 0 ? (
          <div className="glass flex flex-1 flex-col items-center justify-center rounded-3xl p-12 text-center">
            <p className="font-title text-2xl text-ink/80">
              {remaining === 0 ? '本週委託額度已滿，休息一下準備迎接週末吧！' : '目前沒有新的委託案件。'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-1">
            {quests.map((q) => {
              const b = QUEST_BLURBS[q.id]
              return (
                <button
                  key={q.id}
                  data-testid={`quest-${q.id}`}
                  onClick={() => void startSideQuest(q.id)}
                  className="glass flex flex-col justify-between rounded-2xl p-5 text-left transition hover:ring-2 hover:ring-sky"
                >
                  <div className="flex items-start gap-3.5">
                    {q.heroine ? (
                      <CharacterAvatar id={q.heroine} size={48} />
                    ) : (
                      <CharacterAvatar id="kuro" size={48} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-title text-xl font-bold text-ink">{b?.title ?? q.id}</span>
                        <span className="shrink-0 rounded-full bg-sakura/55 px-2.5 py-0.5 text-xs font-bold text-ink">
                          {b?.client ?? ''}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink/85">{b?.blurb ?? ''}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-sky/20 px-3.5 py-2 text-xs font-bold text-[#1e40af]">
                    <span>報酬：{q.rewardHint}</span>
                    <span>接下委託 →</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
