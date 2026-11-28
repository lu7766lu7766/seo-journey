import { create } from 'zustand'
import { audio, audioVoice } from '@/audio'
import { voiceKey } from '@/audio/voiceKey'
import { VOICE_PREFETCH } from '@/audio/voicePlayer'
import { preloadSceneArt, warmSimScreenArt } from '@/art/preload'
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
import { defaultPersisted, normalizeData, resumeBgm, writeSave, type BacklogEntry, type PersistedGame, type Phase } from './save'

export interface CardToast {
  id: string
  title: string
  summary: string
  n: number
}

export interface GameStore extends PersistedGame {
  active: boolean
  pause: Pause
  /** 目前這行之後、可預測的有語音台詞的語音鍵（預載用；不存檔） */
  voiceAhead: string[]
  /** queued knowledge card toasts; `toast` mirrors `toastQueue[0] ?? null` */
  toastQueue: CardToast[]
  toast: CardToast | null

  /** reset to a fresh game (does not start a scene) */
  newGame: (playerName: string) => void
  /** start (or switch to) a scene by registry id */
  startScene: (id: string) => Promise<void>
  advance: () => void
  choose: (optionIndex: number) => void
  resolveMinigame: (won: boolean, stars?: number) => void
  applyEffects: (e: Effects) => void
  unlockCard: (id: string) => void
  dismissToast: () => void
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
      else if (cmd.k === 'bgm') {
        audio.bgm(cmd.id)
        set((s) => ({ stage: reduceStage(s.stage, cmd) }))
      } else if (cmd.k === 'sfx') audio.sfx(cmd.id)
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
      const patch: Partial<GameStore> = {
        pause,
        scene: runner!.snapshot(),
        voiceAhead: pause.kind === 'say' ? runner!.upcomingVoiced(VOICE_PREFETCH).map((l) => voiceKey(l.who, l.text, l.name)) : [],
      }
      if (pause.kind === 'say' && !s.backlog.some((b) => b.lineId === pause.lineId)) {
        const entry: BacklogEntry = { lineId: pause.lineId, who: pause.who, text: pause.text }
        if (pause.name) entry.name = pause.name
        if (pause.voice) entry.voice = pause.voice
        patch.backlog = [...s.backlog, entry].slice(-300)
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

  /** load a scene's script and its artwork (capped at 4s; overlay if >200ms) without touching any game state */
  const prepareScene = async (id: string) => {
    const scene = await loadScene(id)
    await preloadSceneArt(scene.cmds)
    return scene
  }
  const beginScene = (scene: Awaited<ReturnType<typeof loadScene>>) => {
    runner = new SceneRunner(scene, host)
    set({ active: true })
    sync(runner.start())
    warmSimScreenArt()
  }

  return {
    ...defaultPersisted(),
    active: false,
    pause: { kind: 'end' },
    voiceAhead: [],
    toastQueue: [],
    toast: null,

    newGame: (playerName) => {
      runner = null
      set({ ...defaultPersisted(playerName), active: true, pause: { kind: 'end' }, toastQueue: [], toast: null })
    },

    startScene: async (id) => {
      beginScene(await prepareScene(id))
    },

    advance: () => {
      if (!runner) return
      audioVoice.stop() // 推進就停止目前的語音（不等畫面更新）
      const p = get().pause
      if (p.kind === 'say') useGlobal.getState().markRead(p.lineId)
      sync(runner.advance())
    },
    choose: (i) => {
      if (!runner) return
      audioVoice.stop()
      audio.sfx('choice')
      sync(runner.choose(i))
    },
    resolveMinigame: (won, stars) => {
      if (!runner) return
      // best star rating per minigame lives in the cross-save global store (setStars only ever raises it)
      const p = get().pause
      if (typeof stars === 'number' && p.kind === 'minigame') useGlobal.getState().setStars(p.id, stars)
      set((s) => {
        const played = typeof s.flags['mg.played'] === 'number' ? s.flags['mg.played'] : 0
        const wonCnt = typeof s.flags['mg.won'] === 'number' ? s.flags['mg.won'] : 0
        const starsSum = typeof s.flags['mg.stars'] === 'number' ? s.flags['mg.stars'] : 0
        const starsMax = typeof s.flags['mg.starsMax'] === 'number' ? s.flags['mg.starsMax'] : 0
        return {
          flags: {
            ...s.flags,
            'mg.played': played + 1,
            'mg.won': wonCnt + (won ? 1 : 0),
            'mg.stars': starsSum + (typeof stars === 'number' ? stars : won ? 2 : 0),
            'mg.starsMax': starsMax + 3,
          },
        }
      })
      if (won && stars === 3) get().applyEffects({ stats: { con: 1 } })
      sync(runner.resolveMinigame(won))
    },

    applyEffects: (e) => set((s) => applyCore(s, e)),

    unlockCard: (id) => {
      useGlobal.getState().unlockCard(id)
      if (get().unlockedCards.includes(id)) return
      const card = (KNOWLEDGE as Record<string, { title: string; summary?: string }>)[id]
      const title = card?.title ?? id
      const summary = card?.summary ?? ''
      const nextItem: CardToast = { id, title, summary, n: ++toastN }
      audio.sfx('card')
      set((s) => {
        const nextQueue = [...s.toastQueue, nextItem]
        return {
          unlockedCards: [...s.unlockedCards, id],
          toastQueue: nextQueue,
          toast: nextQueue[0] ?? null,
        }
      })
    },
    dismissToast: () => {
      set((s) => {
        const nextQueue = s.toastQueue.slice(1)
        return { toastQueue: nextQueue, toast: nextQueue[0] ?? null }
      })
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
          if (SCENE_IDS.includes(eid)) {
            // preload first: while `phase` is 'ending' with no scene running the result screen would show ahead of the ending scene
            const endScene = await prepareScene(eid)
            set({ phase: 'ending', scene: null })
            beginScene(endScene)
          } else {
            set({ phase: 'ending', scene: null })
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
      const scene = data.scene ? await loadScene(data.scene.sceneId) : null
      // a save resumes mid-scene: preload what is on stage now plus everything the rest of the scene can show
      await preloadSceneArt(scene?.cmds ?? [], data.stage)
      // 讀檔從場景中間接續、不會重播 bgm 指令：依存檔記錄（或週次／階段預設）恢復背景音樂，並寫回舞台狀態讓之後的存檔保有它
      const bgm = resumeBgm(data)
      audio.bgm(bgm)
      set({ ...data, stage: { ...data.stage, bgm }, active: true, toastQueue: [], toast: null, pause: { kind: 'end' } })
      if (data.scene && scene) {
        runner = new SceneRunner(scene, host, data.scene)
        sync(runner.start())
      }
    },

    quitToTitle: () => {
      audioVoice.stop()
      runner = null
      clearTimeout(autosaveTimer)
      set({ active: false, pause: { kind: 'end' }, stage: initialStage() })
    },
  }
})

export type { MinigameId }
