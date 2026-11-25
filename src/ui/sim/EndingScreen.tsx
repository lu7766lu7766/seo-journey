import { CgArt } from '@/art/cg'
import { CHARACTERS } from '@/content/characters'
import { HEROINES } from '@/engine/types'
import { useGame } from '@/store/game'
import { useUI } from '@/store/ui'
import { determineEnding, ENDING_BY_ID } from '@/systems/ending'
import { scores } from '@/systems/score'

export function EndingScreen() {
  const s = useGame()
  const eid = (s.endingsReached[s.endingsReached.length - 1] as keyof typeof ENDING_BY_ID | undefined) ?? determineEnding(s)
  const meta = ENDING_BY_ID[eid] ?? ENDING_BY_ID['end-normal']
  const sc = scores(s.stats, s.bond)

  return (
    <div className="relative h-full w-full overflow-hidden" data-testid="ending-screen">
      <CgArt id={meta.cgId} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080b18]/90 via-[#080b18]/20 to-transparent" />
      <div className="vn-box absolute bottom-7 left-1/2 flex w-[880px] -translate-x-1/2 flex-col items-center gap-3.5 rounded-3xl p-7 text-center text-white">
        <span className="rounded-full border border-[#9fd3f0]/50 bg-[#1a2548] px-4 py-1 text-sm font-bold tracking-wider text-[#9fd3f0]">
          搜尋祭最終結果
        </span>
        <h2 className="font-title text-4xl font-bold text-white drop-shadow-[0_2px_12px_rgba(159,211,240,0.4)]">{meta.title}</h2>
        <p className="text-lg text-[#ffd6e2]">{meta.subtitle}</p>
        <div className="flex gap-7 font-title text-lg font-bold">
          {HEROINES.map((h) => (
            <span key={h} style={{ color: CHARACTERS[h].accent }}>
              {CHARACTERS[h].name} ♥ {Math.round(sc[h])}
            </span>
          ))}
        </div>
        <button
          className="btn-pastel mt-1 px-8 py-2.5 text-xl"
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
  )
}
