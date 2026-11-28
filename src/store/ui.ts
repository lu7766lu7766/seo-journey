import { create } from 'zustand'
import type { KnowledgeId } from '@/content/knowledge'

export type Overlay = null | 'menu' | 'backlog' | 'save' | 'load' | 'settings' | 'status' | 'gallery' | 'music'
export type GalleryTab = 'cards' | 'cg' | 'endings' | 'practice'

interface UIStore {
  screen: 'title' | 'game'
  overlay: Overlay
  galleryTab: GalleryTab
  galleryCardId: KnowledgeId | null
  hidden: boolean
  auto: boolean
  skipping: boolean
  /** current dialogue line fully typed */
  typed: boolean
  /** bump to ask the DialogueBox to finish typing instantly */
  finishSignal: number
  setScreen: (s: 'title' | 'game') => void
  setOverlay: (o: Overlay) => void
  openGallery: (tab?: GalleryTab) => void
  openCard: (id: KnowledgeId) => void
  set: (p: Partial<Omit<UIStore, 'set'>>) => void
}

export const useUI = create<UIStore>((set) => ({
  screen: 'title',
  overlay: null,
  galleryTab: 'cards',
  galleryCardId: null,
  hidden: false,
  auto: false,
  skipping: false,
  typed: false,
  finishSignal: 0,
  setScreen: (screen) => set({ screen, overlay: null, galleryCardId: null, hidden: false, auto: false }),
  setOverlay: (overlay) => set({ overlay }),
  openGallery: (tab = 'cards') => set({ overlay: 'gallery', galleryTab: tab, galleryCardId: null }),
  openCard: (id) => set({ overlay: 'gallery', galleryTab: 'cards', galleryCardId: id }),
  set: (p) => set(p),
}))
