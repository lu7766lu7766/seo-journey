import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useEffect } from 'react'
import { Background } from '@/art/backgrounds'
import { useAfterPreload } from '@/art/hooks'
import { useArtManifest } from '@/art/manifest'
import { specUrls } from '@/art/sceneAssets'
import { BOARD_ART, REPORT_ART, SCHEDULE_ART, WEEKEND_ART } from '@/art/specs'
import { CgArt } from '@/art/cg'
import type { CgId } from '@/content/cgs'
import type { KnowledgeId } from '@/content/knowledge'
import { useGame } from '@/store/game'

const MinigameHost = lazy(() => import('@/minigames').then((m) => ({ default: m.MinigameHost })))
import { useUI } from '@/store/ui'
import { ChoiceMenu } from './ChoiceMenu'
import { CharacterLayer } from './CharacterLayer'
import { DialogueBox } from './DialogueBox'
import { ArtGate } from './ArtGate'
import { EndingScreen } from './sim/EndingScreen'
import { NoticeBoard } from './sim/NoticeBoard'
import { ScheduleScreen } from './sim/ScheduleScreen'
import { WeekendMenu } from './sim/WeekendMenu'
import { WeeklyReport } from './sim/WeeklyReport'
import { SystemBar, type SystemBarMode } from './SystemBar'
import { requestAdvance, useVNInput } from './useVNInput'

export function VNStage() {
  const stage = useGame((s) => s.stage)
  const pause = useGame((s) => s.pause)
  const phase = useGame((s) => s.phase)
  const scene = useGame((s) => s.scene)
  const toast = useGame((s) => s.toast)
  const hidden = useUI((s) => s.hidden)
  useVNInput()
  const manifest = useArtManifest()
  // a new background only replaces the old one once its image is in (no dark flash if it is slow)
  const bg = useAfterPreload(
    stage.bg,
    (b) => b.id + b.time,
    (b) => specUrls(manifest, { bg: [b.id] }),
  )

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => useGame.getState().dismissToast(), 4500)
    return () => clearTimeout(t)
  }, [toast])

  // Auto-advance weekly flow when a VN scene reaches its end
  useEffect(() => {
    if (!scene || pause.kind !== 'end') return
    void useGame.getState().completeCurrentScene()
  }, [scene, pause.kind])

  // 「隱藏 (H)」 only means something on script screens; never carry it into a sim screen
  const betweenScenes = !scene || pause.kind === 'end'
  useEffect(() => {
    if (betweenScenes && hidden) useUI.getState().set({ hidden: false })
  }, [betweenScenes, hidden])

  // Simulation screens when between VN scenes. Every in-game screen shares the one SystemBar (top-right).
  if (betweenScenes) {
    const sim =
      phase === 'schedule' ? <ArtGate key="schedule" spec={SCHEDULE_ART}><ScheduleScreen /></ArtGate>
      : phase === 'board' ? <ArtGate key="board" spec={BOARD_ART}><NoticeBoard /></ArtGate>
      : phase === 'weekend' ? <ArtGate key="weekend" spec={WEEKEND_ART}><WeekendMenu /></ArtGate>
      : phase === 'report' ? <ArtGate key="report" spec={REPORT_ART}><WeeklyReport /></ArtGate>
      : phase === 'ending' ? <EndingScreen />
      : null
    if (sim) {
      return (
        <>
          {sim}
          <SystemBar mode="sim" />
        </>
      )
    }
  }

  const barMode: SystemBarMode = pause.kind === 'minigame' ? 'minigame' : 'script'

  return (
    <div className="absolute inset-0" onClick={requestAdvance} data-testid="vnstage">
      <AnimatePresence initial={false}>
        <motion.div key={bg.id + bg.time} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <Background id={bg.id} time={bg.time} />
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

      <SystemBar mode={barMode} />
      {!hidden && (
        <>
          {pause.kind === 'say' && <DialogueBox line={pause} />}
          {pause.kind === 'choice' && <ChoiceMenu pause={pause} />}
          {pause.kind === 'minigame' && (
            <Suspense fallback={null}>
              <MinigameHost key={pause.lineId} id={pause.id} onResolve={(w, stars) => useGame.getState().resolveMinigame(w, stars)} />
            </Suspense>
          )}
        </>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.n}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="vn-box absolute left-6 top-4 z-50 flex max-w-[540px] items-start gap-2 rounded-2xl px-4 py-2.5 text-left"
            data-testid="card-toast"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const id = toast.id as KnowledgeId
                useGame.getState().dismissToast()
                useUI.getState().openCard(id)
              }}
              className="min-w-0 flex-1 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="font-title text-base font-bold text-[#ffe599]">✦ 獲得知識卡「{toast.title}」</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-[#9fd3f0]">點擊查看詳情</span>
              </div>
              {toast.summary && <p className="mt-0.5 text-xs leading-snug text-[#d5e3ff]">{toast.summary}</p>}
            </button>
            <button
              type="button"
              aria-label="關閉知識卡通知"
              onClick={(e) => {
                e.stopPropagation()
                useGame.getState().dismissToast()
              }}
              className="shrink-0 rounded-full px-1.5 py-0.5 text-xs text-[#9fd3f0] hover:bg-white/15 hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
