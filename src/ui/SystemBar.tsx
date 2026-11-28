import { useUI } from '@/store/ui'

/**
 * The one system bar of the game: pinned to the stage's top-right corner (stage coordinates, so it scales with the
 * 16:9 stage) and rendered by `VNStage` for every in-game screen. Screens never place their own 狀態／選單／圖鑑 buttons.
 *
 * Order is fixed, 「選單」 is always the rightmost:
 *   script only:  自動 (A) · 快轉 (Ctrl) · 紀錄 (L) · 隱藏 (H)   |   always:  狀態 · 圖鑑 · 選單 (Esc)
 * Mini-games show only 「選單」 so the player always has a mouse way out to save / settings / title without the bar
 * competing with the quiz / spot / SERP panels. 「隱藏 (H)」 hides the whole bar (script screens only).
 *
 * Content panels of non-script screens keep the top 56px free for the bar (`pt-14`).
 */

export type SystemBarMode = 'script' | 'sim' | 'minigame'

export function SystemBar({ mode }: { mode: SystemBarMode }) {
  const auto = useUI((s) => s.auto)
  const skipping = useUI((s) => s.skipping)
  const hidden = useUI((s) => s.hidden)
  const set = useUI((s) => s.set)
  const setOverlay = useUI((s) => s.setOverlay)
  const openGallery = useUI((s) => s.openGallery)

  if (mode !== 'sim' && hidden) return null
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }
  const showScript = mode === 'script'
  const showCommon = mode !== 'minigame'

  return (
    <div
      className="absolute right-6 top-4 z-[35] flex gap-2 text-sm"
      data-testid="system-bar"
      role="toolbar"
      aria-label="系統選單"
      onClick={(e) => e.stopPropagation()}
    >
      {showScript && (
        <>
          <button type="button" className="hud-pill" data-testid="sys-auto" aria-pressed={auto} onClick={stop(() => set({ auto: !auto }))}>
            自動 (A){auto ? ' ●' : ''}
          </button>
          <button type="button" className="hud-pill" data-testid="sys-skip" aria-pressed={skipping} onClick={stop(() => set({ skipping: !skipping }))}>
            快轉 (Ctrl){skipping ? ' ●' : ''}
          </button>
          <button type="button" className="hud-pill" data-testid="sys-backlog" onClick={stop(() => setOverlay('backlog'))}>紀錄 (L)</button>
          <button type="button" className="hud-pill" data-testid="sys-hide" onClick={stop(() => set({ hidden: true }))}>隱藏 (H)</button>
        </>
      )}
      {showCommon && (
        <>
          <button type="button" className="hud-pill" data-testid="sys-status" onClick={stop(() => setOverlay('status'))}>狀態</button>
          <button type="button" className="hud-pill" data-testid="sys-gallery" onClick={stop(() => openGallery('cards'))}>圖鑑</button>
        </>
      )}
      <button type="button" className="hud-pill" data-testid="sys-menu" onClick={stop(() => setOverlay('menu'))}>選單 (Esc)</button>
    </div>
  )
}
