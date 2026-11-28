import { useEffect, useRef } from 'react'
import { audio } from '@/audio'
import { useGame } from '@/store/game'
import { useGlobal } from '@/store/global'
import { useSettings } from '@/store/settings'
import { useUI } from '@/store/ui'
import { autoAdvanceDelay, isVoiceBusy } from './autoAdvance'
import { useVoicePlayback, useVoiceState } from './useVoice'

const isCtrlKey = (e: KeyboardEvent) =>
  e.key === 'Control' || e.code === 'ControlLeft' || e.code === 'ControlRight'

const isTextInputFocused = () => {
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.getAttribute('contenteditable') === 'true'
}

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
  const ctrlHeldRef = useRef(false)
  useVoicePlayback()

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const ui = useUI.getState()
      if (ui.screen !== 'game') return
      if (e.key === 'Escape') {
        ui.setOverlay(ui.overlay === null ? 'menu' : ui.overlay === 'menu' || ui.overlay === 'backlog' ? null : 'menu')
        return
      }
      if (isCtrlKey(e)) {
        if (!ui.overlay && !isTextInputFocused()) {
          ctrlHeldRef.current = true
          ui.set({ skipping: true })
        }
        return
      }
      if (isTextInputFocused()) return
      if (e.key.toLowerCase() === 'l') return ui.setOverlay(ui.overlay === 'backlog' ? null : ui.overlay ? ui.overlay : 'backlog')
      if (ui.overlay) return
      // 小遊戲進行中不允許隱藏介面：隱藏會卸載 MinigameHost，作答進度會遺失
      if (e.key.toLowerCase() === 'h') {
        if (useGame.getState().pause.kind === 'minigame') return
        return ui.set({ hidden: !ui.hidden })
      }
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
    const stopSkip = () => {
      ctrlHeldRef.current = false
      if (useUI.getState().skipping) useUI.getState().set({ skipping: false })
    }
    const up = (e: KeyboardEvent) => {
      if (isCtrlKey(e) || !e.ctrlKey) {
        if (ctrlHeldRef.current) stopSkip()
      }
    }
    const onVis = () => {
      if (document.hidden) stopSkip()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', stopSkip)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', stopSkip)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // auto + skip + wait timers
  const pause = useGame((s) => s.pause)
  const auto = useUI((s) => s.auto)
  const typed = useUI((s) => s.typed)
  const skipping = useUI((s) => s.skipping)
  const overlay = useUI((s) => s.overlay)
  const autoDelay = useSettings((s) => s.autoDelayMs)
  const voice = useVoiceState()
  const voiceBusy = pause.kind === 'say' && isVoiceBusy(voice, pause.lineId)

  useEffect(() => {
    if (pause.kind !== 'wait' || overlay) return
    const t = setTimeout(() => useGame.getState().advance(), pause.ms)
    return () => clearTimeout(t)
  }, [pause, overlay])

  useEffect(() => {
    // 有語音的行：等語音播完（voiceBusy 變成 false）才開始計原本的自動間隔
    const delay = autoAdvanceDelay({
      auto, typed, isSay: pause.kind === 'say', overlay: !!overlay, skipping, voiceBusy, autoDelayMs: autoDelay,
      textLength: pause.kind === 'say' ? pause.text.length : 0,
    })
    if (delay === null) return
    const t = setTimeout(() => useGame.getState().advance(), delay)
    return () => clearTimeout(t)
  }, [auto, typed, pause, overlay, skipping, autoDelay, voiceBusy])

  useEffect(() => {
    if (!skipping) return
    if (pause.kind !== 'say' && pause.kind !== 'wait' && !ctrlHeldRef.current) {
      useUI.getState().set({ skipping: false })
    }
  }, [pause.kind, skipping])

  useEffect(() => {
    if (!skipping || overlay) return
    const tick = () => {
      const g = useGame.getState()
      const p = g.pause
      if (p.kind === 'wait') {
        g.advance()
        return
      }
      if (p.kind !== 'say') return
      if (ctrlHeldRef.current || useSettings.getState().skipUnreadAllowed || useGlobal.getState().isRead(p.lineId)) {
        useGlobal.getState().markRead(p.lineId)
        g.advance()
      }
    }
    tick()
    const iv = setInterval(tick, 55)
    return () => clearInterval(iv)
  }, [skipping, overlay])
}
