/**
 * Shared DSL + state types. Content authors and every phase import from here.
 * Keep this file free of runtime imports from other src folders except `import type`.
 */
import type { BgId } from '@/content/backgrounds'
import type { CharId, Face, SpeakerId } from '@/content/characters'
import type { KnowledgeId } from '@/content/knowledge'
import type { MinigameId } from '@/content/minigames'
import type { CgId } from '@/content/cgs'

export type { BgId, CharId, Face, SpeakerId, KnowledgeId, MinigameId, CgId }

export const STAT_KEYS = ['con', 'tec', 'str', 'ans', 'tru'] as const
export type StatKey = (typeof STAT_KEYS)[number]

export const HEROINES = ['rin', 'hare', 'mirai'] as const
export type HeroineId = (typeof HEROINES)[number]

export type Stats = Record<StatKey, number>
export type Bonds = Record<HeroineId, number>
export type FlagValue = number | boolean
export type Flags = Record<string, FlagValue>

export type TimeOfDay = 'day' | 'dusk' | 'night'
export type Slot = 'left' | 'center' | 'right'
export type BgFx = 'fade' | 'flash' | 'rain'

/** Effects applied to the game state. `flags` SETS values, `inc` ADDS to numeric flags (missing = 0). */
export interface Effects {
  stats?: Partial<Stats>
  bond?: Partial<Bonds>
  stamina?: number
  stress?: number
  flags?: Flags
  inc?: Record<string, number>
}

export type CmpOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'

export type Cond =
  | { t: 'flag'; key: string; op?: CmpOp; value?: FlagValue }
  | { t: 'stat'; key: StatKey; op: CmpOp; value: number }
  | { t: 'bond'; who: HeroineId; op: CmpOp; value: number }
  | { t: 'score'; who: HeroineId; op: CmpOp; value: number }
  | { t: 'seen'; scene: string }
  | { t: 'and'; all: Cond[] }
  | { t: 'or'; any: Cond[] }
  | { t: 'not'; cond: Cond }

export interface ChoiceOpt {
  text: string
  effects?: Effects
  cond?: Cond
  then?: Cmd[]
}

export type Cmd =
  | { k: 'bg'; id: BgId; time?: TimeOfDay; fx?: BgFx }
  | { k: 'show'; who: CharId; at?: Slot; face?: Face }
  | { k: 'hide'; who: CharId | 'all' }
  | { k: 'say'; who: SpeakerId; face?: Face; text: string }
  | { k: 'choice'; options: ChoiceOpt[] }
  | { k: 'effect'; effects: Effects }
  | { k: 'if'; cond: Cond; then: Cmd[]; else?: Cmd[] }
  | { k: 'minigame'; id: MinigameId; win?: Effects; lose?: Effects }
  | { k: 'card'; id: KnowledgeId }
  | { k: 'bgm' | 'sfx'; id: string }
  | { k: 'cg'; id: CgId | 'none' }
  | { k: 'wait'; ms: number }

export interface Scene {
  id: string
  cmds: Cmd[]
}

/** The slice of game state the engine reads/writes. */
export interface CoreState {
  stats: Stats
  bond: Bonds
  stamina: number
  stress: number
  flags: Flags
}

/** Read-only view used by condition evaluation. */
export interface CondState extends CoreState {
  seenScenes: string[]
}

/** Serializable program counter. See runner.ts for the path encoding. */
export interface RunnerSnapshot {
  sceneId: string
  pc: number[]
}

export type Pause =
  | { kind: 'say'; lineId: string; who: SpeakerId; face?: Face; text: string }
  | { kind: 'choice'; lineId: string; options: { index: number; text: string }[] }
  | { kind: 'minigame'; lineId: string; id: MinigameId }
  | { kind: 'wait'; lineId: string; ms: number }
  | { kind: 'end' }

export interface StageState {
  bg: { id: BgId; time: TimeOfDay }
  rain: boolean
  chars: Partial<Record<Slot, { who: CharId; face: Face }>>
  cg: string | null
  /** increments on each flash bg-fx so the UI can replay the animation */
  flash: number
}
