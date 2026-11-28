import { lazy, Suspense } from 'react'
import { useUI } from '@/store/ui'
import { Backlog } from '@/ui/Backlog'
import { GameMenu } from '@/ui/GameMenu'
import { SaveLoad } from '@/ui/SaveLoad'
import { SettingsPanel } from '@/ui/SettingsPanel'
import { LoadingOverlay } from '@/ui/LoadingOverlay'
import { StatusPanel } from '@/ui/sim/StatusPanel'
import { StageFrame } from '@/ui/StageFrame'
import { TitleScreen } from '@/ui/TitleScreen'
import { VNStage } from '@/ui/VNStage'

const Gallery = lazy(() => import('@/ui/Gallery'))
const MusicGallery = lazy(() => import('@/ui/MusicGallery'))
const MaterialShowcase = import.meta.env.DEV ? lazy(() => import('@/ui/material/MaterialShowcase')) : null

export function App() {
  const screen = useUI((s) => s.screen)
  const overlay = useUI((s) => s.overlay)
  const setOverlay = useUI((s) => s.setOverlay)

  if (MaterialShowcase && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === 'materials') {
    return (
      <StageFrame>
        <Suspense fallback={null}>
          <MaterialShowcase />
        </Suspense>
      </StageFrame>
    )
  }

  return (
    <StageFrame>
      {screen === 'title' ? <TitleScreen /> : <VNStage />}
      {overlay === 'menu' && screen === 'game' && <GameMenu />}
      {overlay === 'backlog' && screen === 'game' && <Backlog />}
      {overlay === 'status' && screen === 'game' && <StatusPanel onClose={() => setOverlay(null)} />}
      {overlay === 'save' && screen === 'game' && <SaveLoad mode="save" />}
      {overlay === 'load' && <SaveLoad mode="load" />}
      {overlay === 'settings' && <SettingsPanel />}
      {overlay === 'gallery' && (
        <Suspense fallback={null}>
          <Gallery />
        </Suspense>
      )}
      {overlay === 'music' && screen === 'title' && (
        <Suspense fallback={null}>
          <MusicGallery />
        </Suspense>
      )}
      <LoadingOverlay />
    </StageFrame>
  )
}
