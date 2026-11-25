import { useGame } from '@/store/game'
import { useUI } from '@/store/ui'
import { Panel } from './Panel'

export function GameMenu() {
  const ui = useUI.getState()
  const items: [string, () => void][] = [
    ['繼續遊戲', () => ui.setOverlay(null)],
    ['存檔', () => ui.setOverlay('save')],
    ['讀檔', () => ui.setOverlay('load')],
    ['圖鑑・相簿', () => ui.openGallery('cards')],
    ['設定', () => ui.setOverlay('settings')],
    ['回到標題', () => {
      useGame.getState().quitToTitle()
      useUI.getState().setScreen('title')
    }],
  ]
  return (
    <Panel title="選單" onClose={() => ui.setOverlay(null)}>
      <div className="flex flex-col gap-3">
        {items.map(([label, fn]) => (
          <button key={label} className="btn-pastel py-3 text-xl" onClick={fn}>{label}</button>
        ))}
      </div>
    </Panel>
  )
}
