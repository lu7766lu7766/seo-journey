import { create } from 'zustand'
import { safeGetJSON, safeSetJSON } from './storage'

/** Cross-save persistence: gallery / cards / endings / read-lines. */
const KEY = 'seo-journey:global'
interface Stored {
  cards: string[]
  endings: string[]
  cgs: string[]
  readLines: string[]
}

const stored = safeGetJSON<Partial<Stored>>(KEY) ?? {}
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])

/** mutable on purpose (can be thousands of entries; nothing renders it) */
const readLines = new Set<string>(list(stored.readLines))

interface GlobalStore {
  cards: string[]
  endings: string[]
  cgs: string[]
  unlockCard: (id: string) => void
  unlockEnding: (id: string) => void
  unlockCg: (id: string) => void
  isRead: (lineId: string) => boolean
  markRead: (lineId: string) => void
  flush: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined
export const useGlobal = create<GlobalStore>((set, get) => {
  const persist = () => safeSetJSON(KEY, { cards: get().cards, endings: get().endings, cgs: get().cgs, readLines: [...readLines] } satisfies Stored)
  const add = (field: 'cards' | 'endings' | 'cgs') => (id: string) => {
    if (get()[field].includes(id)) return
    set({ [field]: [...get()[field], id] } as Partial<GlobalStore>)
    persist()
  }
  return {
    cards: list(stored.cards),
    endings: list(stored.endings),
    cgs: list(stored.cgs),
    unlockCard: add('cards'),
    unlockEnding: add('endings'),
    unlockCg: add('cgs'),
    isRead: (id) => readLines.has(id),
    markRead: (id) => {
      if (readLines.has(id)) return
      readLines.add(id)
      clearTimeout(timer)
      timer = setTimeout(persist, 1000)
    },
    flush: () => {
      clearTimeout(timer)
      persist()
    },
  }
})

if (typeof window !== 'undefined') window.addEventListener('pagehide', () => useGlobal.getState().flush())
