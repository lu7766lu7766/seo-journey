/**
 * Faithful headless simulator: plays the REAL scenes with the REAL schedule / quest / date /
 * ending logic. Only the player's behaviour is replaced by a Policy. Mirrors src/store/game.ts flow:
 * prologue -> (w<n> -> schedule -> board -> weekend -> report) x6 -> festival -> ending.
 */
import { ACTIVITIES, RECOMMENDED_SCHEDULE } from '@/content/activities'
import type { ActivityId } from '@/content/activityIds'
import { loadScene } from '@/content/scenes'
import { applyEffects, initialCore } from '@/engine/effects'
import { SceneRunner } from '@/engine/runner'
import { HEROINES, type ChoiceOpt, type CoreState, type Effects, type HeroineId } from '@/engine/types'
import { determineEnding, pickDateScene, type EndingId } from '@/systems/ending'
import { availableQuests, MAX_QUESTS_PER_WEEK, questDoneFlag } from '@/systems/quests'
import { score, scores } from '@/systems/score'
import { runWeekSchedule } from '@/systems/schedule'

export type Rng = () => number
export function makeRng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

export interface Policy {
  name: string
  /** pick among the offered options (indices into the choice's options) */
  choose(opts: { index: number; opt: ChoiceOpt }[], rng: Rng, state: CoreState): number
  minigameWinRate: number
  schedule(state: CoreState, week: number, rng: Rng): ActivityId[]
  /** how many available quests to do this week (0..2) */
  quests(week: number, available: number, rng: Rng): number
  weekend(state: CoreState, week: number, rng: Rng): HeroineId | 'rest'
  /** which available quests the player is willing to take (default: all) */
  questFilter?: (q: { id: string; heroine?: HeroineId }) => boolean
}

const ALL: ActivityId[] = ['write', 'research', 'techcheck', 'schema', 'qa', 'authors', 'social', 'rest']

export function effectValue(e?: Effects): number {
  if (!e) return 0
  let v = 0
  for (const x of Object.values(e.bond ?? {})) v += x ?? 0
  for (const x of Object.values(e.stats ?? {})) v += (x ?? 0) * 0.35
  v -= (e.inc?.blackhat ?? 0) * 25
  return v
}
export function optionValue(o: ChoiceOpt): number {
  let v = effectValue(o.effects)
  for (const c of o.then ?? []) if (c.k === 'effect') v += effectValue(c.effects)
  return v
}

const pickRand = <T,>(arr: T[], rng: Rng) => arr[Math.floor(rng() * arr.length)]

/** greedy schedule that raises the weakest heroine score the most (a careful player). */
function smartSchedule(state: CoreState, week: number, rng: Rng): ActivityId[] {
  let st = state
  const picked: ActivityId[] = []
  for (let i = 0; i < 4; i++) {
    let best: ActivityId = 'rest'
    let bestV = -Infinity
    for (const a of ALL) {
      if (a === 'rest' && (st.stamina > 45 || i < 3)) continue
      const r = runWeekSchedule(st, week, [a], () => 0.99).nextState
      const sc = scores(r.stats, r.bond)
      const v = Math.min(sc.rin, sc.hare, sc.mirai) * 3 + sc.rin + sc.hare + sc.mirai - (r.stamina < 25 ? 8 : 0)
      if (v > bestV) { bestV = v; best = a }
    }
    picked.push(best)
    st = runWeekSchedule(st, week, [best], () => 0.99).nextState
  }
  void rng
  return picked
}

function focusSchedule(who: HeroineId) {
  const prefs: Record<HeroineId, ActivityId[]> = {
    rin: ['techcheck', 'write', 'schema', 'rest'],
    hare: ['qa', 'research', 'schema', 'rest'],
    mirai: ['authors', 'write', 'qa', 'rest'],
  }
  return () => prefs[who]
}

const greedy = (opts: { index: number; opt: ChoiceOpt }[]) =>
  opts.reduce((b, c) => (optionValue(c.opt) > optionValue(b.opt) ? c : b)).index

export const POLICIES: Record<string, Policy> = {
  // clicks through: first option, 推薦排程 (exact autoFill), all quests, rotates dates
  'lazy-clicker': {
    name: '偷懶點擊（首選項＋推薦排程＋全支線＋輪流約會）',
    choose: (o) => o[0].index,
    minigameWinRate: 0.7,
    schedule: (_s, week) => RECOMMENDED_SCHEDULE[week],
    quests: (_w, a) => Math.min(a, MAX_QUESTS_PER_WEEK),
    weekend: (_s, week) => (['rin', 'hare', 'mirai'] as const)[(week - 1) % 3],
  },
  'casual-random': {
    name: '隨便亂玩（全隨機，支線50%）',
    choose: (o, rng) => pickRand(o, rng).index,
    minigameWinRate: 0.6,
    schedule: (_s, _w, rng) => [0, 1, 2, 3].map(() => pickRand(ALL, rng)),
    quests: (_w, a, rng) => (rng() < 0.5 ? Math.min(a, 1 + Math.floor(rng() * 2)) : 0),
    weekend: (_s, _w, rng) => (rng() < 0.2 ? 'rest' : pickRand([...HEROINES], rng)),
  },
  'attentive-balanced': {
    name: '用心均衡（選最佳選項＋聰明排程＋全支線＋輪流約會）',
    choose: (o) => greedy(o),
    minigameWinRate: 0.9,
    schedule: smartSchedule,
    quests: (_w, a) => Math.min(a, MAX_QUESTS_PER_WEEK),
    weekend: (s, week) => {
      const sc = scores(s.stats, s.bond)
      return [...HEROINES].sort((a, b) => sc[a] - sc[b])[week % 3 === 0 ? 0 : 0]
    },
  },
  'decent': {
    name: '普通認真（最佳選項＋推薦排程＋全支線＋輪流約會）',
    choose: (o) => greedy(o),
    minigameWinRate: 0.8,
    schedule: (_s, week) => RECOMMENDED_SCHEDULE[week],
    quests: (_w, a) => Math.min(a, MAX_QUESTS_PER_WEEK),
    weekend: (_s, week) => (['rin', 'hare', 'mirai'] as const)[(week - 1) % 3],
  },
  'half-engaged': {
    name: '半認真（最佳選項＋隨機排程＋半數支線＋輪流約會）',
    choose: (o, rng) => (rng() < 0.7 ? greedy(o) : pickRand(o, rng).index),
    minigameWinRate: 0.7,
    schedule: (_s, _w, rng) => [0, 1, 2, 3].map(() => pickRand(ALL, rng)),
    quests: (_w, a, rng) => (rng() < 0.5 ? Math.min(a, 1) : 0),
    weekend: (_s, week, rng) => (rng() < 0.15 ? 'rest' : (['rin', 'hare', 'mirai'] as const)[(week - 1) % 3]),
  },
  // a typical romance player: does everything, but spends most weekends with one heroine
  'lean-rin': {
    name: '偏愛凜（推薦排程＋全支線＋4/6週末約凜）',
    choose: (o) => greedy(o), minigameWinRate: 0.8, schedule: (_s, week) => RECOMMENDED_SCHEDULE[week],
    quests: (_w, a) => Math.min(a, MAX_QUESTS_PER_WEEK),
    weekend: (_s, week) => (['rin', 'rin', 'hare', 'rin', 'mirai', 'rin'] as const)[week - 1],
  },
  'lean-hare': {
    name: '偏愛晴（推薦排程＋全支線＋4/6週末約晴）',
    choose: (o) => greedy(o), minigameWinRate: 0.8, schedule: (_s, week) => RECOMMENDED_SCHEDULE[week],
    quests: (_w, a) => Math.min(a, MAX_QUESTS_PER_WEEK),
    weekend: (_s, week) => (['hare', 'hare', 'rin', 'hare', 'mirai', 'hare'] as const)[week - 1],
  },
  'lean-mirai': {
    name: '偏愛未來（推薦排程＋全支線＋4/6週末約未來）',
    choose: (o) => greedy(o), minigameWinRate: 0.8, schedule: (_s, week) => RECOMMENDED_SCHEDULE[week],
    quests: (_w, a) => Math.min(a, MAX_QUESTS_PER_WEEK),
    weekend: (_s, week) => (['mirai', 'mirai', 'hare', 'mirai', 'rin', 'mirai'] as const)[week - 1],
  },
  'focus-rin': {
    name: '專攻凜',
    choose: (o) => greedy(o), minigameWinRate: 0.9, schedule: focusSchedule('rin'),
    quests: (_w, a) => Math.min(a, MAX_QUESTS_PER_WEEK), weekend: () => 'rin',
    questFilter: (q) => q.heroine === 'rin',
  },
  'focus-hare': {
    name: '專攻晴',
    choose: (o) => greedy(o), minigameWinRate: 0.9, schedule: focusSchedule('hare'),
    quests: (_w, a) => Math.min(a, MAX_QUESTS_PER_WEEK), weekend: () => 'hare',
    questFilter: (q) => q.heroine === 'hare',
  },
  'focus-mirai': {
    name: '專攻未來',
    choose: (o) => greedy(o), minigameWinRate: 0.9, schedule: focusSchedule('mirai'),
    quests: (_w, a) => Math.min(a, MAX_QUESTS_PER_WEEK), weekend: () => 'mirai',
    questFilter: (q) => q.heroine === 'mirai',
  },
  'tempted-blackhat': {
    name: '被黑川誘惑（遇到黑帽選項就選）',
    choose: (o) => {
      const bad = o.find((c) => (c.opt.effects?.inc?.blackhat ?? 0) > 0)
      return bad ? bad.index : o[0].index
    },
    minigameWinRate: 0.7,
    schedule: (_s, week) => RECOMMENDED_SCHEDULE[week],
    quests: (_w, a) => Math.min(a, 1), weekend: (_s, w) => (['rin', 'hare', 'mirai'] as const)[(w - 1) % 3],
  },
  'neglect': {
    name: '擺爛（最差選項、全休息、不接支線）',
    choose: (o) => {
      const safe = o.filter((c) => !(c.opt.effects?.inc?.blackhat ?? 0))
      return (safe.length ? safe : o).reduce((b, c) => (optionValue(c.opt) < optionValue(b.opt) ? c : b)).index
    },
    minigameWinRate: 0.3, schedule: () => ['rest', 'rest', 'rest', 'rest'],
    quests: () => 0, weekend: () => 'rest',
  },
}

async function playScene(id: string, state: CoreState, seen: Set<string>, pol: Policy, rng: Rng): Promise<CoreState> {
  const scene = await loadScene(id)
  let cur = state
  const runner = new SceneRunner(scene, {
    // `seen` doubles as the run's memory: scene ids, plus `card:<id>` for unlocked knowledge cards
    getState: () => ({
      ...cur,
      seenScenes: [...seen].filter((x) => !x.startsWith('card:')),
      unlockedCards: [...seen].filter((x) => x.startsWith('card:')).map((x) => x.slice(5)),
      playerName: '搜一',
    }),
    applyEffects: (e) => { cur = applyEffects(cur, e) },
    onCmd: (c) => { if (c.k === 'card') seen.add(`card:${c.id}`) },
  })
  let p = runner.start()
  for (let guard = 0; guard < 5000; guard++) {
    if (p.kind === 'end') break
    if (p.kind === 'say' || p.kind === 'wait') p = runner.advance()
    else if (p.kind === 'choice') {
      const cmd = runner.peek()
      const opts = p.options.map((o) => ({ index: o.index, opt: (cmd as { options: ChoiceOpt[] }).options[o.index] }))
      p = runner.choose(pol.choose(opts, rng, cur))
    } else if (p.kind === 'minigame') p = runner.resolveMinigame(rng() < pol.minigameWinRate)
  }
  seen.add(id)
  if (BOND_LOG) for (const h of HEROINES) BOND_LOG[`${id}:${h}`] = (BOND_LOG[`${id}:${h}`] ?? 0) + (cur.bond[h] - state.bond[h])
  return cur
}

export let BOND_LOG: Record<string, number> | null = null
export const setBondLog = (v: Record<string, number> | null) => { BOND_LOG = v }

export interface RunResult { ending: EndingId; scores: Record<HeroineId, number>; blackhat: number; state: CoreState }

export async function simulateRun(pol: Policy, rng: Rng): Promise<RunResult> {
  let state = initialCore()
  const seen = new Set<string>()
  state = await playScene('prologue', state, seen, pol, rng)
  for (let week = 1; week <= 6; week++) {
    state = await playScene(`w${week}`, state, seen, pol, rng)
    state = runWeekSchedule(state, week, pol.schedule(state, week, rng), rng).nextState
    // side quests
    const ok = (q: { id: string; heroine?: HeroineId }) => (pol.questFilter ? pol.questFilter(q) : true)
    const want = pol.quests(week, availableQuests(week, state.flags).filter(ok).length, rng)
    for (let n = 0; n < want; n++) {
      const avail = availableQuests(week, state.flags).filter(ok)
      if (!avail.length) break
      const q = avail[0]
      state = await playScene(q.id, state, seen, pol, rng)
      state = applyEffects(state, { flags: { [questDoneFlag(q.id)]: true } })
    }
    // weekend
    const wk = pol.weekend(state, week, rng)
    if (wk === 'rest') {
      state = applyEffects(state, { stamina: 25, stress: -15 })
      state = await playScene('weekend-rest', state, seen, pol, rng)
    } else {
      const pick = pickDateScene(wk, state)
      state = await playScene(pick.sceneId, state, seen, pol, rng)
      if (pick.increment) state = applyEffects(state, { inc: { [`dateCount.${wk}`]: 1 } })
    }
  }
  state = await playScene('festival', state, seen, pol, rng)
  const ending = determineEnding(state)
  return { ending, scores: scores(state.stats, state.bond), blackhat: Number(state.flags.blackhat ?? 0), state }
}

export const ENDING_ORDER: EndingId[] = ['end-true', 'end-rin', 'end-hare', 'end-mirai', 'end-normal', 'end-bad', 'end-blackhat']

export async function runBatch(polKey: string, n = 300, seed = 20261125) {
  const rng = makeRng(seed)
  const counts = Object.fromEntries(ENDING_ORDER.map((e) => [e, 0])) as Record<EndingId, number>
  const sum = { rin: 0, hare: 0, mirai: 0 }
  const stat = { con: 0, tec: 0, str: 0, ans: 0, tru: 0 }
  const bond = { rin: 0, hare: 0, mirai: 0 }
  for (let i = 0; i < n; i++) {
    const r = await simulateRun(POLICIES[polKey], rng)
    counts[r.ending]++
    for (const h of HEROINES) { sum[h] += r.scores[h]; bond[h] += r.state.bond[h] }
    for (const k of Object.keys(stat) as (keyof typeof stat)[]) stat[k] += r.state.stats[k]
  }
  const d = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / n])) as Record<string, number>
  return { counts, avg: { rin: sum.rin / n, hare: sum.hare / n, mirai: sum.mirai / n }, stats: d(stat), bond: d(bond) }
}
void ACTIVITIES; void score
