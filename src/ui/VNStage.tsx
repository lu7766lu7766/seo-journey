import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { Background } from '@/art/backgrounds'
import { MinigameHost } from '@/minigames'
import { useGame } from '@/store/game'
import { useUI } from '@/store/ui'
import { ChoiceMenu } from './ChoiceMenu'
import { CharacterLayer } from './CharacterLayer'
import { DialogueBox } from './DialogueBox'
import { requestAdvance, useVNInput } from './useVNInput'

function QuickBar() {
  const { auto, skipping } = useUI()
  const set = useUI((s) => s.set)
  const setOverlay = useUI((s) => s.setOverlay)
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }
  return (
    <div className="absolute right-6 top-4 z-30 flex gap-2 text-sm">
      <button className="btn-pastel" aria-pressed={auto} onClick={stop(() => set({ auto: !auto }))}>自動 (A){auto ? ' ●' : ''}</button>
      <button className="btn-pastel" aria-pressed={skipping} onMouseDown={stop(() => set({ skipping: true }))} onMouseUp={stop(() => set({ skipping: false }))} onMouseLeave={() => set({ skipping: false })}>快轉 (Ctrl)</button>
      <button className="btn-pastel" onClick={stop(() => setOverlay('backlog'))}>紀錄 (L)</button>
      <button className="btn-pastel" onClick={stop(() => set({ hidden: true }))}>隱藏 (H)</button>
      <button className="btn-pastel" onClick={stop(() => setOverlay('menu'))}>選單 (Esc)</button>
    </div>
  )
}

export function VNStage() {
  const stage = useGame((s) => s.stage)
  const pause = useGame((s) => s.pause)
  const toast = useGame((s) => s.toast)
  const hidden = useUI((s) => s.hidden)
  useVNInput()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => useGame.setState({ toast: null }), 2600)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="absolute inset-0" onClick={requestAdvance} data-testid="vnstage">
      <AnimatePresence initial={false}>
        <motion.div key={stage.bg.id + stage.bg.time} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <Background id={stage.bg.id} time={stage.bg.time} />
        </motion.div>
      </AnimatePresence>
      {stage.rain && <div className="rain-layer pointer-events-none absolute inset-0 z-[5]" />}
      <CharacterLayer chars={stage.chars} speaker={pause.kind === 'say' ? pause.who : undefined} />
      {stage.cg && (
        <div className="absolute inset-0 z-[15] flex items-center justify-center bg-gradient-to-br from-sakura to-sky font-title text-4xl text-white">[CG] {stage.cg}</div>
      )}
      {stage.flash > 0 && <motion.div key={stage.flash} className="pointer-events-none absolute inset-0 z-50 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />}

      {!hidden && (
        <>
          <QuickBar />
          {pause.kind === 'say' && <DialogueBox line={pause} />}
          {pause.kind === 'choice' && <ChoiceMenu pause={pause} />}
          {pause.kind === 'minigame' && <MinigameHost key={pause.lineId} id={pause.id} onResolve={(w) => useGame.getState().resolveMinigame(w)} />}
          {pause.kind === 'end' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/40" data-testid="scene-end">
              <div className="glass rounded-3xl p-10 text-center">
                <h2 className="mb-4 font-title text-3xl font-bold">場景結束</h2>
                <button
                  className="btn-pastel text-xl"
                  onClick={(e) => {
                    e.stopPropagation()
                    useGame.getState().quitToTitle()
                    useUI.getState().setScreen('title')
                  }}
                >
                  回到標題
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.n} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass absolute left-1/2 top-6 z-40 -translate-x-1/2 rounded-full px-6 py-2 font-title text-xl" data-testid="card-toast">
            獲得知識卡「{toast.title}」
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
