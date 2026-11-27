import { useState } from 'react'
import { CgArt } from '@/art/cg'
import { CHARACTERS } from '@/content/characters'
import { KNOWLEDGE_IDS } from '@/content/knowledge'
import { MINIGAME_IDS } from '@/content/minigames'
import { HEROINES, STAT_KEYS, type StatKey } from '@/engine/types'
import { useGame } from '@/store/game'
import { useGlobal } from '@/store/global'
import { useUI } from '@/store/ui'
import { determineEnding, ENDING_BY_ID } from '@/systems/ending'
import { isQuestDone, SIDE_QUESTS } from '@/systems/quests'
import { scores } from '@/systems/score'
import { CopyChecklistButton } from './CopyChecklistButton'

const STAT_LABEL: Record<StatKey, string> = {
  con: '內容',
  tec: '技術',
  str: '結構',
  ans: '可答',
  tru: '信任',
}

const DOMAIN_TAG = {
  rin: 'SEO',
  hare: 'AEO',
  mirai: 'GEO',
} as const

export function EndingScreen() {
  const s = useGame()
  const [showReport, setShowReport] = useState(true)
  const eid = (s.endingsReached[s.endingsReached.length - 1] as keyof typeof ENDING_BY_ID | undefined) ?? determineEnding(s)
  const meta = ENDING_BY_ID[eid] ?? ENDING_BY_ID['end-normal']
  const sc = scores(s.stats, s.bond)
  const cardsCount = s.unlockedCards.length
  const totalCards = KNOWLEDGE_IDS.length
  const questsCount = SIDE_QUESTS.filter((q) => isQuestDone(q.id, s.flags)).length
  const mgPlayed = typeof s.flags['mg.played'] === 'number' ? s.flags['mg.played'] : 0
  const mgWon = typeof s.flags['mg.won'] === 'number' ? s.flags['mg.won'] : 0
  // best star rating per minigame (cross-save), out of 3 stars for every real minigame
  const stars = useGlobal((g) => g.stars)
  const starIds = MINIGAME_IDS.filter((id) => id !== 'demo-quiz')
  const starsTotal = starIds.reduce((a, id) => a + (stars[id] ?? 0), 0)
  const starsMax = starIds.length * 3

  return (
    <div className="relative h-full w-full overflow-hidden" data-testid="ending-screen">
      <CgArt id={meta.cgId} />
      {showReport && <div className="absolute inset-0 bg-gradient-to-t from-[#080b18]/92 via-[#080b18]/22 to-transparent" />}
      <button
        className="btn-pastel absolute left-5 top-5 z-10 px-4 py-1.5 text-sm"
        data-testid="ending-toggle-report"
        aria-pressed={!showReport}
        onClick={() => setShowReport((v) => !v)}
      >
        {showReport ? '只看 CG' : '顯示成果報告'}
      </button>
      <div className={`vn-box absolute bottom-6 left-1/2 flex w-[960px] -translate-x-1/2 flex-col items-center gap-3 rounded-3xl px-7 py-5 text-center text-white transition-opacity duration-300 ${showReport ? '' : 'pointer-events-none opacity-0'}`}>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[#9fd3f0]/50 bg-[#1a2548] px-4 py-0.5 text-xs font-bold tracking-wider text-[#9fd3f0]">
            搜尋祭最終結果 · 學習成果報告
          </span>
          <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-bold text-[#ffe599]">
            社員：{s.playerName}
          </span>
        </div>

        <h2 className="font-title text-3xl font-bold text-white drop-shadow-[0_2px_12px_rgba(159,211,240,0.4)]">{meta.title}</h2>
        <p className="text-base text-[#ffd6e2]">{meta.subtitle}</p>

        {/* Classroom Screenshot Summary Strip */}
        <div className="grid w-full grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-[#0e1530]/80 px-4 py-3 text-left">
          <div className="space-y-1.5 border-r border-white/10 pr-3">
            <div className="flex flex-wrap gap-4 font-title text-sm font-bold">
              {HEROINES.map((h) => (
                <span key={h} style={{ color: CHARACTERS[h].accent }}>
                  {CHARACTERS[h].name} ({DOMAIN_TAG[h]}) ♥ {Math.round(sc[h])}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {STAT_KEYS.map((k) => (
                <span key={k} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[#dbe9ff]">
                  {STAT_LABEL[k]} {Math.round(s.stats[k])}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-around text-center text-xs font-bold">
            <div>
              <div className="text-[#9fd3f0]">📚 知識卡收集</div>
              <div className="mt-0.5 font-title text-lg text-[#ffe599]">
                {cardsCount} / {totalCards}
              </div>
            </div>
            <div>
              <div className="text-[#9fd3f0]">🧩 實戰小遊戲過關</div>
              <div className="mt-0.5 font-title text-lg text-[#b5ead7]">
                {mgWon} / {mgPlayed}
              </div>
            </div>
            <div data-testid="ending-stars">
              <div className="text-[#9fd3f0]">⭐ 小遊戲星等</div>
              <div className="mt-0.5 font-title text-lg text-[#ffe599]">
                {starsTotal} / {starsMax}
              </div>
            </div>
            <div>
              <div className="text-[#9fd3f0]">✅ 支線任務</div>
              <div className="mt-0.5 font-title text-lg text-[#ffd6e2]">
                {questsCount} / {SIDE_QUESTS.length}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-4">
          <CopyChecklistButton unlocked={s.unlockedCards} playerName={s.playerName} className="btn-pastel px-6 py-2 text-base" />
          <button
            className="btn-pastel px-8 py-2 text-lg"
            data-testid="ending-to-title"
            onClick={() => {
              s.quitToTitle()
              useUI.getState().setScreen('title')
            }}
          >
            回到標題畫面
          </button>
        </div>
      </div>
    </div>
  )
}
