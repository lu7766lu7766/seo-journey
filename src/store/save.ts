import { initialCore } from '@/engine/effects'
import { initialStage } from '@/engine/stage'
import type { Flags, RunnerSnapshot, StageState, Bonds, Stats } from '@/engine/types'
import { safeGetJSON, safeRemove, safeSetJSON } from './storage'

export const SAVE_VERSION = 1
export type SlotId = 'auto' | 1 | 2 | 3
export const SLOTS: SlotId[] = ['auto', 1, 2, 3]
const key = (slot: SlotId) => `seo-journey:save:${slot}`

export type Phase = 'story' | 'schedule' | 'weekend' | 'report' | 'ending'

export interface BacklogEntry {
  lineId: string
  /** speaker id, or 'choice' for a picked option */
  who: string
  text: string
}

/** Everything that goes into a save slot. Keep JSON-serializable. */
export interface PersistedGame {
  playerName: string
  week: number
  phase: Phase
  stats: Stats
  bond: Bonds
  stamina: number
  stress: number
  flags: Flags
  seenScenes: string[]
  unlockedCards: string[]
  endingsReached: string[]
  scene: RunnerSnapshot | null
  stage: StageState
  backlog: BacklogEntry[]
}

export interface SaveEnvelope {
  version: number
  savedAt: number
  label: string
  data: PersistedGame
}

export function defaultPersisted(playerName = '葉 搜一'): PersistedGame {
  return {
    playerName,
    week: 0,
    phase: 'story',
    ...initialCore(),
    seenScenes: [],
    unlockedCards: [],
    endingsReached: [],
    scene: null,
    stage: initialStage(),
    backlog: [],
  }
}

/** Fill any missing/invalid fields with defaults so old or hand-edited saves never crash. */
export function normalizeData(raw: unknown): PersistedGame {
  const d = defaultPersisted()
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Record<string, unknown>
  const num = (v: unknown, f: number) => (typeof v === 'number' && Number.isFinite(v) ? v : f)
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
  const obj = <T extends object>(v: unknown, f: T): T => ({ ...f, ...(v && typeof v === 'object' ? (v as T) : {}) })
  const scene = r.scene as RunnerSnapshot | null | undefined
  return {
    playerName: typeof r.playerName === 'string' && r.playerName ? r.playerName : d.playerName,
    week: num(r.week, d.week),
    phase: (['story', 'schedule', 'weekend', 'report', 'ending'] as const).includes(r.phase as Phase) ? (r.phase as Phase) : 'story',
    stats: obj(r.stats, d.stats),
    bond: obj(r.bond, d.bond),
    stamina: num(r.stamina, d.stamina),
    stress: num(r.stress, d.stress),
    flags: obj(r.flags, {} as Flags),
    seenScenes: arr(r.seenScenes),
    unlockedCards: arr(r.unlockedCards),
    endingsReached: arr(r.endingsReached),
    scene: scene && typeof scene.sceneId === 'string' && Array.isArray(scene.pc) ? { sceneId: scene.sceneId, pc: scene.pc.map(Number) } : null,
    stage: obj(r.stage, d.stage),
    backlog: Array.isArray(r.backlog) ? (r.backlog as BacklogEntry[]).filter((b) => b && typeof b.text === 'string') : [],
  }
}

type Migration = (env: Record<string, unknown>) => Record<string, unknown>
/** migrations[n] upgrades an envelope from version n to n+1 */
export const migrations: Record<number, Migration> = {
  // v0 (pre-release prototype): `{ version: 0, name, state: {...} }` -> `{ version: 1, data: { playerName, ... } }`
  0: (env) => {
    const state = (env.state ?? env.data ?? {}) as Record<string, unknown>
    return {
      ...env,
      version: 1,
      data: { ...state, playerName: state.playerName ?? env.name },
    }
  },
}

/** Upgrade any stored envelope to the current schema. Returns null if unusable. */
export function migrate(raw: unknown): SaveEnvelope | null {
  if (!raw || typeof raw !== 'object') return null
  let env = { ...(raw as Record<string, unknown>) }
  let v = typeof env.version === 'number' ? env.version : 0
  if (v > SAVE_VERSION) return null
  while (v < SAVE_VERSION) {
    const m = migrations[v]
    if (!m) return null
    env = m(env)
    v = typeof env.version === 'number' ? env.version : v + 1
  }
  return {
    version: SAVE_VERSION,
    savedAt: typeof env.savedAt === 'number' ? env.savedAt : 0,
    label: typeof env.label === 'string' ? env.label : '',
    data: normalizeData(env.data),
  }
}

export function makeLabel(d: PersistedGame): string {
  const where = d.week > 0 ? `第 ${d.week} 週` : d.scene?.sceneId ?? '序章'
  return `${d.playerName} · ${where}`
}

export function writeSave(slot: SlotId, data: PersistedGame, now = Date.now()): boolean {
  const env: SaveEnvelope = { version: SAVE_VERSION, savedAt: now, label: makeLabel(data), data }
  return safeSetJSON(key(slot), env)
}

export function readSave(slot: SlotId): SaveEnvelope | null {
  return migrate(safeGetJSON<unknown>(key(slot)))
}

export function deleteSave(slot: SlotId) {
  safeRemove(key(slot))
}

export function listSaves(): { slot: SlotId; env: SaveEnvelope | null }[] {
  return SLOTS.map((slot) => ({ slot, env: readSave(slot) }))
}

/** The most recent save of any slot (for "Continue"). */
export function latestSave(): { slot: SlotId; env: SaveEnvelope } | null {
  let best: { slot: SlotId; env: SaveEnvelope } | null = null
  for (const { slot, env } of listSaves()) if (env && (!best || env.savedAt > best.env.savedAt)) best = { slot, env }
  return best
}
