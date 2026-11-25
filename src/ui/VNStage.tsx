import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useEffect } from 'react'
import { Background } from '@/art/backgrounds'
import { CgArt } from '@/art/cg'
import type { CgId } from '@/content/cgs'
import { useGame } from '@/store/game'

const MinigameHost = lazy(() => import('@/minigames').then((m) => ({ default: m.MinigameHost })))
import { useUI } from '@/store/ui'
import { ChoiceMenu } from './ChoiceMenu'
import { CharacterLayer } from './CharacterLayer'
import { DialogueBox } from './DialogueBox'
import { EndingScreen } from './sim/EndingScreen'
import { NoticeBoard } from './sim/NoticeBoard'
import { ScheduleScreen } from './sim/ScheduleScreen'
import { WeekendMenu } from './sim/WeekendMenu'
import { WeeklyReport } from './sim/WeeklyReport'
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
      <button className="hud-pill" onClick={stop(() => setOverlay('status'))}>狀態</button>
      <button className="hud-pill" aria-pressed={auto} onClick={stop(() => set({ auto: !auto }))}>自動 (A){auto ? ' ●' : ''}</button>
      <button className="hud-pill" aria-pressed={skipping} onMouseDown={stop(() => set({ skipping: true }))} onMouseUp={stop(() => set({ skipping: false }))} onMouseLeave={() => set({ skipping: false })}>快轉 (Ctrl)</button>
      <button className="hud-pill" onClick={stop(() => setOverlay('backlog'))}>紀錄 (L)</button>
      <button className="hud-pill" onClick={stop(() => set({ hidden: true }))}>隱藏 (H)</button>
      <button className="hud-pill" onClick={stop(() => setOverlay('menu'))}>選單 (Esc)</button>
    </div>
  )
}

export function VNStage() {
  const stage = useGame((s) => s.stage)
  const pause = useGame((s) => s.pause)
  const phase = useGame((s) => s.phase)
  const scene = useGame((s) => s.scene)
  const toast = useGame((s) => s.toast)
  const hidden = useUI((s) => s.hidden)
  useVNInput()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => useGame.setState({ toast: null }), 4200)
    return () => clearTimeout(t)
  }, [toast])

  // Auto-advance weekly flow when a VN scene reaches its end
  useEffect(() => {
    if (!scene || pause.kind !== 'end') return
    void useGame.getState().completeCurrentScene()
  }, [scene, pause.kind])

  // Simulation screens when between VN scenes
  if (!scene || pause.kind === 'end') {
    if (phase === 'schedule') return <ScheduleScreen />
    if (phase === 'board') return <NoticeBoard />
    if (phase === 'weekend') return <WeekendMenu />
    if (phase === 'report') return <WeeklyReport />
    if (phase === 'ending') return <EndingScreen />
  }

  return (
    <div className="absolute inset-0" onClick={requestAdvance} data-testid="vnstage">
      <AnimatePresence initial={false}>
        <motion.div key={stage.bg.id + stage.bg.time} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <Background id={stage.bg.id} time={stage.bg.time} />
        </motion.div>
      </AnimatePresence>
      {stage.rain && <div className="rain-layer pointer-events-none absolute inset-0 z-[5]" />}
      <CharacterLayer chars={stage.chars} speaker={pause.kind === 'say' ? pause.who : undefined} />
      <AnimatePresence>
        {stage.cg && (
          <motion.div key={stage.cg} className="absolute inset-0 z-[15]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }}>
            <CgArt id={stage.cg as CgId} />
          </motion.div>
        )}
      </AnimatePresence>
      {stage.flash > 0 && <motion.div key={stage.flash} className="pointer-events-none absolute inset-0 z-50 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />}

      {!hidden && (
        <>
          <QuickBar />
          {pause.kind === 'say' && <DialogueBox line={pause} />}
          {pause.kind === 'choice' && <ChoiceMenu pause={pause} />}
          {pause.kind === 'minigame' && (
            <Suspense fallback={null}>
              <MinigameHost key={pause.lineId} id={pause.id} onResolve={(w) => useGame.getState().resolveMinigame(w)} />
            </Suspense>
          )}
        </>
      )}
      <AnimatePresence>
        {toast && (
          <motion.button
            key={toast.n}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              useGame.setState({ toast: null })
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="vn-box absolute left-6 top-4 z-50 max-w-[540px] rounded-2xl px-5 py-2.5 text-left"
            data-testid="card-toast"
          >
            <div className="font-title text-base font-bold text-[#ffe599]">✦ 獲得知識卡「{toast.title}」</div>
            {toast.summary && <p className="mt-0.5 text-xs leading-snug text-[#d5e3ff]">{toast.summary}</p>}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
