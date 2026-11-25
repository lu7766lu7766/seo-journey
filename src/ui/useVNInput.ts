import { useEffect } from 'react'
import { audio } from '@/audio'
import { useGame } from '@/store/game'
import { useGlobal } from '@/store/global'
import { useSettings } from '@/store/settings'
import { useUI } from '@/store/ui'

/** Advance request shared by click / Space / Enter. */
export function requestAdvance() {
  const ui = useUI.getState()
  if (ui.overlay) return
  if (ui.hidden) return ui.set({ hidden: false })
  const g = useGame.getState()
  if (g.pause.kind !== 'say') return
  if (!ui.typed) ui.set({ finishSignal: ui.finishSignal + 1 })
  else {
    audio.sfx('click')
    g.advance()
  }
}

export function useVNInput() {
  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const ui = useUI.getState()
      if (ui.screen !== 'game') return
      if (e.key === 'Escape') {
        ui.setOverlay(ui.overlay === null ? 'menu' : ui.overlay === 'menu' || ui.overlay === 'backlog' ? null : 'menu')
        return
      }
      if (e.key === 'Control') return ui.set({ skipping: true })
      if (e.key.toLowerCase() === 'l') return ui.setOverlay(ui.overlay === 'backlog' ? null : ui.overlay ? ui.overlay : 'backlog')
      if (ui.overlay) return
      if (e.key.toLowerCase() === 'h') return ui.set({ hidden: !ui.hidden })
      if (e.key.toLowerCase() === 'a') return ui.set({ auto: !ui.auto })
      const p = useGame.getState().pause
      if (p.kind === 'choice' && /^[1-9]$/.test(e.key)) {
        const o = p.options[+e.key - 1]
        if (o) useGame.getState().choose(o.index)
        return
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!e.repeat) requestAdvance()
      }
    }
    const up = (e: KeyboardEvent) => e.key === 'Control' && useUI.getState().set({ skipping: false })
    const blur = () => useUI.getState().set({ skipping: false })
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // auto + skip + wait timers
  const pause = useGame((s) => s.pause)
  const auto = useUI((s) => s.auto)
  const typed = useUI((s) => s.typed)
  const skipping = useUI((s) => s.skipping)
  const overlay = useUI((s) => s.overlay)
  const autoDelay = useSettings((s) => s.autoDelayMs)

  useEffect(() => {
    if (pause.kind !== 'wait' || overlay) return
    const t = setTimeout(() => useGame.getState().advance(), pause.ms)
    return () => clearTimeout(t)
  }, [pause, overlay])

  useEffect(() => {
    if (!auto || !typed || pause.kind !== 'say' || overlay || skipping) return
    const t = setTimeout(() => useGame.getState().advance(), autoDelay + pause.text.length * 15)
    return () => clearTimeout(t)
  }, [auto, typed, pause, overlay, skipping, autoDelay])

  useEffect(() => {
    if (!skipping || overlay) return
    const iv = setInterval(() => {
      const g = useGame.getState()
      const p = g.pause
      if (p.kind !== 'say') return
      if (useSettings.getState().skipUnreadAllowed || useGlobal.getState().isRead(p.lineId)) g.advance()
    }, 60)
    return () => clearInterval(iv)
  }, [skipping, overlay])
}
