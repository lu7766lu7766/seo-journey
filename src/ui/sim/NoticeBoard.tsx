import { QUEST_BLURBS } from '@/content/flavor'
import { SCENE_IDS } from '@/content/scenes'
import { useGame } from '@/store/game'
import { availableQuests, MAX_QUESTS_PER_WEEK } from '@/systems/quests'

export function NoticeBoard() {
  const { week, flags, questsDoneThisWeek, startSideQuest, skipBoardToWeekend } = useGame()
  const quests = availableQuests(week, flags).filter((q) => SCENE_IDS.includes(q.id))
  const remaining = Math.max(0, MAX_QUESTS_PER_WEEK - questsDoneThisWeek)

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream via-mint/20 to-sky/25 p-8" data-testid="notice-board">
      <div className="glass flex max-h-[640px] w-[900px] flex-col gap-5 rounded-3xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-title text-3xl font-bold">放學後 · 委託公佈欄</h2>
            <p className="text-sm text-ink/75">不佔平日排程，完成支線可獲得屬性、好感度與知識卡（本週剩餘可接：{remaining} 件）</p>
          </div>
          <button className="btn-pastel px-6 py-2.5 text-lg" data-testid="skip-board" onClick={skipBoardToWeekend}>
            前往週末 →
          </button>
        </div>

        {remaining === 0 || quests.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-white/70 p-10 text-center">
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
                  className="glass flex flex-col justify-between rounded-2xl p-5 text-left transition hover:scale-[1.01]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-title text-xl font-bold">{b?.title ?? q.id}</span>
                      <span className="rounded-full bg-sakura/50 px-3 py-0.5 text-xs font-bold">{b?.client ?? ''}</span>
                    </div>
                    <p className="mt-2 text-base text-ink/85">{b?.blurb ?? ''}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-[#2b6cb0]">
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
