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
  if (w < MIN_DESKTOP_WIDTH) {
    return (
      <div className="flex h-full items-center justify-center bg-cream p-8 text-center font-title text-3xl text-ink" data-testid="desktop-gate">
        請使用電腦遊玩
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
