import { create } from 'zustand'
import { audio } from '@/audio'
import { applyEffects as applyCore } from '@/engine/effects'
import { SceneRunner, type RunnerHost } from '@/engine/runner'
import { initialStage, reduceStage } from '@/engine/stage'
import type { CoreState, Effects, HeroineId, MinigameId, Pause } from '@/engine/types'
import { loadScene, SCENE_IDS } from '@/content/scenes'
import { KNOWLEDGE } from '@/content/knowledge'
import { dateCountFlag, determineEnding, pickDateScene } from '@/systems/ending'
import { questDoneFlag } from '@/systems/quests'
import { INFIRMARY_WEEK_FLAG, WEEKEND } from '@/systems/schedule'
import { scores } from '@/systems/score'
import { statSnapshotFlags } from '@/systems/siteMetrics'
import { useGlobal } from './global'
import { defaultPersisted, normalizeData, writeSave, type PersistedGame, type Phase } from './save'

export interface GameStore extends PersistedGame {
  active: boolean
  pause: Pause
  /** last unlocked card, for a toast */
  toast: { id: string; title: string; summary: string; n: number } | null

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

  /** P2 weekly simulation flow actions */
  completeCurrentScene: () => Promise<void>
  commitScheduleResult: (nextCore: CoreState) => void
  startSideQuest: (id: string) => Promise<void>
  skipBoardToWeekend: () => void
  startWeekendDate: (who: HeroineId) => Promise<void>
  startWeekendRest: () => Promise<void>
  finishWeeklyReport: () => Promise<void>

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

  const autosaveNow = () => {
    clearTimeout(autosaveTimer)
    if (get().active) writeSave('auto', get().toPersisted())
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
      if (!runner) return
      set((s) => {
        const played = typeof s.flags['mg.played'] === 'number' ? s.flags['mg.played'] : 0
        const wonCnt = typeof s.flags['mg.won'] === 'number' ? s.flags['mg.won'] : 0
        return {
          flags: {
            ...s.flags,
            'mg.played': played + 1,
            'mg.won': wonCnt + (won ? 1 : 0),
          },
        }
      })
      sync(runner.resolveMinigame(won))
    },

    applyEffects: (e) => set((s) => applyCore(s, e)),

    unlockCard: (id) => {
      useGlobal.getState().unlockCard(id)
      set((s) => (s.unlockedCards.includes(id) ? s : { unlockedCards: [...s.unlockedCards, id] }))
      const card = (KNOWLEDGE as Record<string, { title: string; summary?: string }>)[id]
      const title = card?.title ?? id
      const summary = card?.summary ?? ''
      audio.sfx('card')
      set({ toast: { id, title, summary, n: ++toastN } })
    },
    reachEnding: (id) => {
      useGlobal.getState().unlockEnding(id)
      set((s) => (s.endingsReached.includes(id) ? s : { endingsReached: [...s.endingsReached, id] }))
    },
    setPhase: (phase, week) => set((s) => ({ phase, week: week ?? s.week })),

    completeCurrentScene: async () => {
      const s = get()
      runner = null
      if (s.phase === 'story') {
        if (s.week === 0) {
          // Prologue (or demo) finished -> enter Week 1
          const snap = scores(s.stats, s.bond)
          set({ week: 1, phase: 'story', scene: null, prevScores: snap, questsDoneThisWeek: 0, flags: { ...s.flags, ...statSnapshotFlags(s.stats) } })
          if (SCENE_IDS.includes('w1')) {
            await get().startScene('w1')
          } else {
            set({ phase: 'schedule' })
            autosaveNow()
          }
          return
        }
        if (s.week >= 1 && s.week <= 6) {
          set({ phase: 'schedule', scene: null })
          autosaveNow()
          return
        }
        if (s.week >= 7) {
          const eid = determineEnding(s)
          get().reachEnding(eid)
          set({ phase: 'ending', scene: null })
          if (SCENE_IDS.includes(eid)) {
            await get().startScene(eid)
          } else {
            autosaveNow()
          }
          return
        }
      } else if (s.phase === 'board') {
        const qid = s.activeQuestId
        const nextFlags = qid ? { ...s.flags, [questDoneFlag(qid)]: true } : s.flags
        set({
          flags: nextFlags,
          questsDoneThisWeek: s.questsDoneThisWeek + (qid ? 1 : 0),
          activeQuestId: null,
          scene: null,
        })
        autosaveNow()
        return
      } else if (s.phase === 'weekend') {
        const info = s.activeDateHeroine
        const nextFlags = { ...s.flags }
        if (info?.increment) {
          const fk = dateCountFlag(info.who)
          const cur = typeof nextFlags[fk] === 'number' ? (nextFlags[fk] as number) : 0
          nextFlags[fk] = cur + 1
        }
        // the weekend is over: a collapse in the infirmary no longer locks anything
        nextFlags[INFIRMARY_WEEK_FLAG] = false
        set({ flags: nextFlags, activeDateHeroine: null, scene: null, phase: 'report' })
        autosaveNow()
        return
      } else if (s.phase === 'ending') {
        set({ scene: null })
        autosaveNow()
      }
    },

    commitScheduleResult: (nextCore) => {
      set({
        stats: nextCore.stats,
        bond: nextCore.bond,
        stamina: nextCore.stamina,
        stress: nextCore.stress,
        flags: nextCore.flags,
        phase: 'board',
        scene: null,
      })
      autosaveNow()
    },

    startSideQuest: async (id) => {
      set({ activeQuestId: id })
      await get().startScene(id)
    },

    skipBoardToWeekend: () => {
      set({ phase: 'weekend', scene: null })
      autosaveNow()
    },

    startWeekendDate: async (who) => {
      const s = get()
      // dates are locked in a week that ended in the infirmary (the UI only offers resting at home)
      if (s.flags[INFIRMARY_WEEK_FLAG] === true) return
      const pick = pickDateScene(who, s)
      get().applyEffects({ stress: WEEKEND.dateStress })
      set({ activeDateHeroine: { who, increment: pick.increment } })
      await get().startScene(pick.sceneId)
    },

    startWeekendRest: async () => {
      // stamina / stress come from the weekend-rest scene itself (WEEKEND.rest)
      set({ activeDateHeroine: null })
      await get().startScene('weekend-rest')
    },

    finishWeeklyReport: async () => {
      const s = get()
      const snap = scores(s.stats, s.bond)
      const nextWeek = s.week + 1
      set({ prevScores: snap, questsDoneThisWeek: 0, week: nextWeek, phase: 'story', scene: null, flags: { ...s.flags, ...statSnapshotFlags(s.stats) } })
      if (nextWeek <= 6) {
        const sceneId = `w${nextWeek}`
        if (SCENE_IDS.includes(sceneId)) {
          await get().startScene(sceneId)
        } else {
          set({ phase: 'schedule' })
          autosaveNow()
        }
      } else {
        if (SCENE_IDS.includes('festival')) {
          await get().startScene('festival')
        } else {
          const eid = determineEnding(get())
          get().reachEnding(eid)
          set({ phase: 'ending' })
          autosaveNow()
        }
      }
    },

    toPersisted: () => {
      const s = get()
      return {
        playerName: s.playerName, week: s.week, phase: s.phase, stats: s.stats, bond: s.bond, stamina: s.stamina,
        stress: s.stress, flags: s.flags, seenScenes: s.seenScenes, unlockedCards: s.unlockedCards,
        endingsReached: s.endingsReached, scene: s.scene, stage: s.stage, backlog: s.backlog,
        questsDoneThisWeek: s.questsDoneThisWeek, prevScores: s.prevScores, activeQuestId: s.activeQuestId,
        activeDateHeroine: s.activeDateHeroine,
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
