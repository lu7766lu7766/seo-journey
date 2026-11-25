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
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
      <div className="absolute bottom-8 left-1/2 flex w-[880px] -translate-x-1/2 flex-col items-center gap-4 rounded-3xl bg-white/92 p-7 text-center shadow-2xl">
        <span className="rounded-full bg-sakura/60 px-4 py-1 text-sm font-bold text-[#251e38]">搜尋祭最終結果</span>
        <h2 className="font-title text-4xl font-bold text-[#251e38]">{meta.title}</h2>
        <p className="text-lg text-ink/80">{meta.subtitle}</p>
        <div className="flex gap-6 font-title text-lg font-bold">
          {HEROINES.map((h) => (
            <span key={h} style={{ color: CHARACTERS[h].color }}>
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
