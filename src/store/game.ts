import { create } from 'zustand'
import { audio } from '@/audio'
import { applyEffects as applyCore } from '@/engine/effects'
import { SceneRunner, type RunnerHost } from '@/engine/runner'
import { initialStage, reduceStage } from '@/engine/stage'
import type { Effects, MinigameId, Pause } from '@/engine/types'
import { loadScene } from '@/content/scenes'
import { KNOWLEDGE } from '@/content/knowledge'
import { useGlobal } from './global'
import { defaultPersisted, normalizeData, writeSave, type PersistedGame, type Phase } from './save'

export interface GameStore extends PersistedGame {
  active: boolean
  pause: Pause
  /** last unlocked card, for a toast */
  toast: { id: string; title: string; n: number } | null

  /** reset to a fresh game (does not start a scene) */
  newGame: (playerName: string) => void
  /** start (or switch to) a scene by registry id */
  startScene: (id: string) => Promise<void>
  advance: () => void
  choose: (optionIndex: number) => void
  resolveMinigame: (won: boolean) => void
  applyEffects: (e: Effects) => void
  unlockCard: (id: string) => void
  reachEnding: (id: string) => void
  setPhase: (phase: Phase, week?: number) => void
  toPersisted: () => PersistedGame
  loadPersisted: (data: PersistedGame) => Promise<void>
  quitToTitle: () => void
}

let runner: SceneRunner | null = null
let autosaveTimer: ReturnType<typeof setTimeout> | undefined
let toastN = 0

export const useGame = create<GameStore>((set, get) => {
  const host: RunnerHost = {
    getState: () => get(),
    applyEffects: (e) => get().applyEffects(e),
    onCmd: (cmd) => {
      if (cmd.k === 'card') get().unlockCard(cmd.id)
      else if (cmd.k === 'bgm') audio.bgm(cmd.id)
      else if (cmd.k === 'sfx') audio.sfx(cmd.id)
      else {
        if (cmd.k === 'cg' && cmd.id !== 'none') useGlobal.getState().unlockCg(cmd.id)
        set((s) => ({ stage: reduceStage(s.stage, cmd) }))
      }
    },
    onChoice: (lineId, text) => set((s) => ({ backlog: [...s.backlog, { lineId: lineId + '/pick', who: 'choice', text }].slice(-300) })),
  }

  /** push runner state into the store after any runner call */
  const sync = (pause: Pause) => {
    if (!runner) return
    set((s) => {
      const patch: Partial<GameStore> = { pause, scene: runner!.snapshot() }
      if (pause.kind === 'say' && !s.backlog.some((b) => b.lineId === pause.lineId)) {
        patch.backlog = [...s.backlog, { lineId: pause.lineId, who: pause.who, text: pause.text }].slice(-300)
      }
      if (pause.kind === 'end' && !s.seenScenes.includes(runner!.scene.id)) patch.seenScenes = [...s.seenScenes, runner!.scene.id]
      return patch
    })
    clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => get().active && writeSave('auto', get().toPersisted()), 400)
  }

  return {
    ...defaultPersisted(),
    active: false,
    pause: { kind: 'end' },
    toast: null,

    newGame: (playerName) => {
      runner = null
      set({ ...defaultPersisted(playerName), active: true, pause: { kind: 'end' }, toast: null })
    },

    startScene: async (id) => {
      const scene = await loadScene(id)
      runner = new SceneRunner(scene, host)
      set({ active: true })
      sync(runner.start())
    },

    advance: () => {
      if (!runner) return
      const p = get().pause
      if (p.kind === 'say') useGlobal.getState().markRead(p.lineId)
      sync(runner.advance())
    },
    choose: (i) => {
      if (!runner) return
      audio.sfx('choice')
      sync(runner.choose(i))
    },
    resolveMinigame: (won) => {
      if (runner) sync(runner.resolveMinigame(won))
    },

    applyEffects: (e) => set((s) => applyCore(s, e)),

    unlockCard: (id) => {
      useGlobal.getState().unlockCard(id)
      set((s) => (s.unlockedCards.includes(id) ? s : { unlockedCards: [...s.unlockedCards, id] }))
      const title = (KNOWLEDGE as Record<string, { title: string }>)[id]?.title ?? id
      audio.sfx('card')
      set({ toast: { id, title, n: ++toastN } })
    },
    reachEnding: (id) => {
      useGlobal.getState().unlockEnding(id)
      set((s) => (s.endingsReached.includes(id) ? s : { endingsReached: [...s.endingsReached, id] }))
    },
    setPhase: (phase, week) => set((s) => ({ phase, week: week ?? s.week })),

    toPersisted: () => {
      const s = get()
      return {
        playerName: s.playerName, week: s.week, phase: s.phase, stats: s.stats, bond: s.bond, stamina: s.stamina,
        stress: s.stress, flags: s.flags, seenScenes: s.seenScenes, unlockedCards: s.unlockedCards,
        endingsReached: s.endingsReached, scene: s.scene, stage: s.stage, backlog: s.backlog,
      }
    },

    loadPersisted: async (raw) => {
      const data = normalizeData(raw)
      runner = null
      set({ ...data, active: true, toast: null, pause: { kind: 'end' } })
      if (data.scene) {
        const scene = await loadScene(data.scene.sceneId)
        runner = new SceneRunner(scene, host, data.scene)
        sync(runner.start())
        // start() re-emits the paused `say` stage update only; stage from the save stays authoritative otherwise
      }
    },

    quitToTitle: () => {
      runner = null
      clearTimeout(autosaveTimer)
      set({ active: false, pause: { kind: 'end' }, stage: initialStage() })
    },
  }
})

export type { MinigameId }
