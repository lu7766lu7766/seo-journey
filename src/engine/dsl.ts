import type {
  BgFx, BgId, CgId, ChoiceOpt, Cmd, CharId, Cond, Effects, Face, KnowledgeId, MinigameId, Scene, Slot, SpeakerId, TimeOfDay,
} from './types'

export const scene = (id: string, cmds: Cmd[]): Scene => ({ id, cmds })
export const bg = (id: BgId, time?: TimeOfDay, fx?: BgFx): Cmd => ({ k: 'bg', id, time, fx })
export const show = (who: CharId, at?: Slot, face?: Face): Cmd => ({ k: 'show', who, at, face })
export const hide = (who: CharId | 'all'): Cmd => ({ k: 'hide', who })
export const say = (who: Exclude<SpeakerId, 'npc'>, face: Face | undefined, text: string): Cmd => ({ k: 'say', who, face, text })
/** Portraitless NPC line with a custom nameplate (neutral styling). */
export const npc = (name: string, text: string): Cmd => ({ k: 'say', who: 'npc', name, text })
export const choice = (options: ChoiceOpt[]): Cmd => ({ k: 'choice', options })
export const opt = (text: string, effects?: Effects, then?: Cmd[], cond?: Cond): ChoiceOpt => ({ text, effects, then, cond })
export const effect = (effects: Effects): Cmd => ({ k: 'effect', effects })
/** `if` */
export const when = (cond: Cond, then: Cmd[], otherwise?: Cmd[]): Cmd => ({ k: 'if', cond, then, else: otherwise })
export const minigame = (id: MinigameId, win?: Effects, lose?: Effects): Cmd => ({ k: 'minigame', id, win, lose })
export const card = (id: KnowledgeId): Cmd => ({ k: 'card', id })
export const bgm = (id: string): Cmd => ({ k: 'bgm', id })
export const sfx = (id: string): Cmd => ({ k: 'sfx', id })
/** show an event CG; `cg('none')` clears it */
export const cg = (id: CgId | 'none'): Cmd => ({ k: 'cg', id })
export const wait = (ms: number): Cmd => ({ k: 'wait', ms })
