import { useEffect, useState, type ReactNode } from 'react'

export const STAGE_W = 1280
export const STAGE_H = 720
export const MIN_DESKTOP_WIDTH = 1024

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight })
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const on = () => setVp(read())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

/** 16:9 stage scaled to fit the window with black letterbox. Narrow windows show a desktop-only notice. */
export function StageFrame({ children }: { children: ReactNode }) {
  const { w, h } = useViewport()
  const [bypass, setBypass] = useState(false)
  if (w < MIN_DESKTOP_WIDTH && !bypass) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-cream p-8 text-center text-ink" data-testid="desktop-gate">
        <p className="font-title text-3xl font-bold">請使用電腦遊玩</p>
        <p className="max-w-md text-sm text-ink/75">本遊戲舞台為 16:9 電腦版面；若您正使用電腦但因螢幕系統縮放被阻擋，可點擊下方按鈕繼續。</p>
        <button
          type="button"
          onClick={() => setBypass(true)}
          className="btn-pastel mt-2 px-5 py-2 text-sm"
        >
          仍以目前視窗繼續遊玩
        </button>
      </div>
    )
  }
  const scale = Math.min(w / STAGE_W, h / STAGE_H)
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div
        data-testid="stage"
        style={{
          position: 'absolute', left: '50%', top: '50%', width: STAGE_W, height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center', overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}
