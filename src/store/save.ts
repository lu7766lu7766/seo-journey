import { isSimScreen, SIM_BGM } from '@/audio/cues'
import { initialCore } from '@/engine/effects'
import { initialStage } from '@/engine/stage'
import type { Bonds, Flags, HeroineId, RunnerSnapshot, StageState, Stats } from '@/engine/types'
import { scores } from '@/systems/score'
import { safeGetJSON, safeRemove, safeSetJSON } from './storage'

export const SAVE_VERSION = 4
export type SlotId = 'auto' | 1 | 2 | 3 | 4 | 5 | 6
export const SLOTS: SlotId[] = ['auto', 1, 2, 3, 4, 5, 6]
const key = (slot: SlotId) => `seo-journey:save:${slot}`

export type Phase = 'story' | 'schedule' | 'board' | 'weekend' | 'report' | 'ending'

export interface BacklogEntry {
  lineId: string
  /** speaker id, or 'choice' for a picked option */
  who: string
  /** custom display name for portraitless NPC lines (`who === 'npc'`) */
  name?: string
  text: string
  /** 語音鍵（有語音的說話者才有；對話紀錄用它查語音 manifest 做重播）。舊存檔沒有這個欄位也能讀。 */
  voice?: string
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
  /** P2 simulation fields */
  questsDoneThisWeek: number
  prevScores: Record<HeroineId, number>
  activeQuestId: string | null
  activeDateHeroine: { who: HeroineId; increment: boolean } | null
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
    questsDoneThisWeek: 0,
    prevScores: { rin: 10, hare: 10, mirai: 10 },
    activeQuestId: null,
    activeDateHeroine: null,
  }
}

function normalizeStage(raw: unknown, d: StageState): StageState {
  const s = { ...d, ...(raw && typeof raw === 'object' ? (raw as Partial<StageState>) : {}) }
  const bgm = (raw as { bgm?: unknown } | null | undefined)?.bgm
  return { ...s, bgm: typeof bgm === 'string' && bgm ? bgm : null }
}

/**
 * 讀檔後該播哪一首：停在養成畫面（排程／公佈欄／週末／週報，沒有劇本在演）一律是 `sim`；
 * 否則用存檔記錄的 BGM；沒有記錄（舊存檔、或尚未進過有 bgm 的場景）就依週次／階段挑預設。
 * `scene` 省略時視為沒有劇本在演。
 */
export function resumeBgm(d: Pick<PersistedGame, 'stage' | 'week' | 'phase'> & { scene?: PersistedGame['scene'] }): string {
  if (isSimScreen(d.phase, !!d.scene)) return SIM_BGM
  if (d.stage.bgm) return d.stage.bgm
  if (d.phase === 'ending') return 'warm'
  if (d.week >= 7) return 'festival'
  return 'daily'
}

const VALID_PHASES: readonly Phase[] = ['story', 'schedule', 'board', 'weekend', 'report', 'ending']

/** Fill any missing/invalid fields with defaults so old or hand-edited saves never crash. */
export function normalizeData(raw: unknown): PersistedGame {
  const d = defaultPersisted()
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Record<string, unknown>
  const num = (v: unknown, f: number) => (typeof v === 'number' && Number.isFinite(v) ? v : f)
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
  const obj = <T extends object>(v: unknown, f: T): T => ({ ...f, ...(v && typeof v === 'object' ? (v as T) : {}) })
  const scene = r.scene as RunnerSnapshot | null | undefined
  const activeDate = r.activeDateHeroine as { who?: unknown; increment?: unknown } | null | undefined
  return {
    playerName: typeof r.playerName === 'string' && r.playerName ? r.playerName : d.playerName,
    week: num(r.week, d.week),
    phase: VALID_PHASES.includes(r.phase as Phase) ? (r.phase as Phase) : 'story',
    stats: obj(r.stats, d.stats),
    bond: obj(r.bond, d.bond),
    stamina: num(r.stamina, d.stamina),
    stress: num(r.stress, d.stress),
    flags: obj(r.flags, {} as Flags),
    seenScenes: arr(r.seenScenes),
    unlockedCards: arr(r.unlockedCards),
    endingsReached: arr(r.endingsReached),
    scene: scene && typeof scene.sceneId === 'string' && Array.isArray(scene.pc) ? { sceneId: scene.sceneId, pc: scene.pc.map(Number) } : null,
    stage: normalizeStage(r.stage, d.stage),
    backlog: Array.isArray(r.backlog)
      ? (r.backlog as Record<string, unknown>[])
          .filter((b) => b && typeof b.text === 'string')
          .map((b) => {
            const entry: BacklogEntry = {
              lineId: typeof b.lineId === 'string' ? b.lineId : '',
              who: typeof b.who === 'string' ? b.who : 'narr',
              text: b.text as string,
            }
            if (typeof b.name === 'string' && b.name.trim()) entry.name = b.name
            if (typeof b.voice === 'string' && /^[0-9a-f]{12}$/.test(b.voice)) entry.voice = b.voice
            return entry
          })
      : [],
    questsDoneThisWeek: num(r.questsDoneThisWeek, 0),
    prevScores: obj(r.prevScores, d.prevScores),
    activeQuestId: typeof r.activeQuestId === 'string' ? r.activeQuestId : null,
    activeDateHeroine:
      activeDate && (activeDate.who === 'rin' || activeDate.who === 'hare' || activeDate.who === 'mirai')
        ? { who: activeDate.who, increment: Boolean(activeDate.increment) }
        : null,
  }
}

type Migration = (env: Record<string, unknown>) => Record<string, unknown>
/** migrations[n] upgrades an envelope from version n to n+1 */
export const migrations: Record<number, Migration> = {
  0: (env) => {
    const state = (env.state ?? env.data ?? {}) as Record<string, unknown>
    return {
      ...env,
      version: 1,
      data: { ...state, playerName: state.playerName ?? env.name },
    }
  },
  1: (env) => {
    const data = (env.data ?? {}) as Record<string, unknown>
    return {
      ...env,
      version: 2,
      data: {
        questsDoneThisWeek: 0,
        prevScores: { rin: 10, hare: 10, mirai: 10 },
        activeQuestId: null,
        activeDateHeroine: null,
        ...data,
      },
    }
  },
  2: (env) => {
    const data = (env.data ?? {}) as Record<string, unknown>
    return {
      ...env,
      version: 3,
      data: {
        ...data,
        backlog: Array.isArray(data.backlog) ? data.backlog : [],
      },
    }
  },
  3: (env) => {
    const data = (env.data ?? {}) as Record<string, unknown>
    const stage = (data.stage && typeof data.stage === 'object' ? data.stage : {}) as Record<string, unknown>
    return {
      ...env,
      version: 4,
      data: { ...data, stage: { ...stage, bgm: typeof stage.bgm === 'string' ? stage.bgm : null } },
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

const PHASE_LABELS: Record<Phase, string> = {
  story: '劇情',
  schedule: '排程',
  board: '委託',
  weekend: '週末',
  report: '週報',
  ending: '結局',
}

export function makeLabel(d: PersistedGame): string {
  const where = d.week >= 7 ? '搜尋祭' : d.week > 0 ? `第 ${d.week} 週 ${PHASE_LABELS[d.phase] ?? ''}`.trim() : d.scene?.sceneId ?? '序章'
  const sc = scores(d.stats, d.bond)
  const scoreTag = `（凜${Math.round(sc.rin)}/晴${Math.round(sc.hare)}/未${Math.round(sc.mirai)}）`
  return `${d.playerName} · ${where}${scoreTag}`
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

const CODE_PREFIX = 'SEOJ1:'

/** Encode persisted progress into a portable UTF-8 Base64 save code for classroom use. */
export function exportSaveCode(data: PersistedGame, now = Date.now()): string {
  const env: SaveEnvelope = { version: SAVE_VERSION, savedAt: now, label: makeLabel(data), data }
  const bytes = new TextEncoder().encode(JSON.stringify(env))
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return CODE_PREFIX + btoa(bin)
}

/** Decode and migrate a classroom save code string. Returns null if malformed. */
export function importSaveCode(raw: string): SaveEnvelope | null {
  try {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const body = trimmed.startsWith(CODE_PREFIX) ? trimmed.slice(CODE_PREFIX.length) : trimmed
    const bin = atob(body)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown
    return migrate(parsed)
  } catch {
    return null
  }
}
