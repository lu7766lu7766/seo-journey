import { useUI } from '@/store/ui'
import { Backlog } from '@/ui/Backlog'
import { GameMenu } from '@/ui/GameMenu'
import { SaveLoad } from '@/ui/SaveLoad'
import { SettingsPanel } from '@/ui/SettingsPanel'
import { StageFrame } from '@/ui/StageFrame'
import { TitleScreen } from '@/ui/TitleScreen'
import { VNStage } from '@/ui/VNStage'

export function App() {
  const screen = useUI((s) => s.screen)
  const overlay = useUI((s) => s.overlay)
  return (
    <StageFrame>
      {screen === 'title' ? <TitleScreen /> : <VNStage />}
      {overlay === 'menu' && screen === 'game' && <GameMenu />}
      {overlay === 'backlog' && screen === 'game' && <Backlog />}
      {overlay === 'save' && screen === 'game' && <SaveLoad mode="save" />}
      {overlay === 'load' && <SaveLoad mode="load" />}
      {overlay === 'settings' && <SettingsPanel />}
    </StageFrame>
  )
}
