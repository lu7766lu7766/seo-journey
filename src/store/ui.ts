import { create } from 'zustand'

export type Overlay = null | 'menu' | 'backlog' | 'save' | 'load' | 'settings'

interface UIStore {
  screen: 'title' | 'game'
  overlay: Overlay
  hidden: boolean
  auto: boolean
  skipping: boolean
  /** current dialogue line fully typed */
  typed: boolean
  /** bump to ask the DialogueBox to finish typing instantly */
  finishSignal: number
  setScreen: (s: 'title' | 'game') => void
  setOverlay: (o: Overlay) => void
  set: (p: Partial<Omit<UIStore, 'set'>>) => void
}

export const useUI = create<UIStore>((set) => ({
  screen: 'title',
  overlay: null,
  hidden: false,
  auto: false,
  skipping: false,
  typed: false,
  finishSignal: 0,
  setScreen: (screen) => set({ screen, overlay: null, hidden: false, auto: false }),
  setOverlay: (overlay) => set({ overlay }),
  set: (p) => set(p),
}))
