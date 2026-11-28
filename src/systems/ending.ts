import type { CgId } from '@/content/cgs'
import { HEROINES, type CoreState, type HeroineId } from '@/engine/types'
import { score, scores } from './score'

export type EndingId =
  | 'end-blackhat'
  | 'end-true'
  | 'end-rin'
  | 'end-hare'
  | 'end-mirai'
  | 'end-normal'
  | 'end-bad'

export interface EndingMeta {
  id: EndingId
  title: string
  subtitle: string
  hint: string
  cgId: CgId
}

export const ENDINGS_META: EndingMeta[] = [
  {
    id: 'end-true',
    title: '真結局「搜尋祭的三重奏」',
    subtitle: 'SEO × AEO × GEO 全方位達標',
    hint: '條件：不使用黑帽手法，且凜、晴、未來好感度皆達 65 以上。',
    cgId: 'end-true',
  },
  {
    id: 'end-rin',
    title: '凜 END「索引之外的心意」',
    subtitle: '白鷺 凜 路線結局',
    hint: '條件：凜的好感度為三人最高且達 60 以上，且看過她的第 3 場約會或第 6 週雨夜選擇了她（未同時滿足真結局）。',
    cgId: 'end-rin',
  },
  {
    id: 'end-hare',
    title: '晴 END「一句話的告白」',
    subtitle: '夏川 晴 路線結局',
    hint: '條件：晴的好感度為三人最高且達 60 以上，且看過她的第 3 場約會或第 6 週雨夜選擇了她（未同時滿足真結局）。',
    cgId: 'end-hare',
  },
  {
    id: 'end-mirai',
    title: '未來 END「被你引用的我」',
    subtitle: '星野 未來 路線結局',
    hint: '條件：未來的好感度為三人最高且達 60 以上，且看過她的第 3 場約會或第 6 週雨夜選擇了她（未同時滿足真結局）。',
    cgId: 'end-mirai',
  },
  {
    id: 'end-normal',
    title: '普通 END「社團存續」',
    subtitle: '網站研究社保住了教室鑰匙',
    hint: '條件：三人平均好感度達 35 以上，但未達成個人或真結局。',
    cgId: 'end-normal',
  },
  {
    id: 'end-bad',
    title: '壞 END「404 Not Found」',
    subtitle: '社團遭到廢社，但留下一點希望',
    hint: '條件：三人平均好感度未達 35，且未走向黑帽結局。',
    cgId: 'end-bad',
  },
  {
    id: 'end-blackhat',
    title: '黑帽 END「人工處罰」',
    subtitle: '網站從搜尋索引中消失',
    hint: '條件：累計接受黑川的黑帽提議達 2 次以上。',
    cgId: 'end-blackhat',
  },
]

export const ENDING_BY_ID: Record<EndingId, EndingMeta> = Object.fromEntries(
  ENDINGS_META.map((e) => [e.id, e]),
) as Record<EndingId, EndingMeta>

const HEROINE_PRIORITY: Record<HeroineId, number> = { rin: 3, hare: 2, mirai: 1 }
const W6_CHOICE_FOR: Record<HeroineId, number> = { rin: 1, hare: 2, mirai: 3 }

/** Emotional gate for a heroine's personal ending: saw her 3rd date OR chose her on week 6 rainy night. */
export function hasRomanticGate(who: HeroineId, state: Pick<CoreState, 'flags'>): boolean {
  return getDateCount(who, state) >= 3 || Number(state.flags.w6Choice ?? 0) === W6_CHOICE_FOR[who]
}

/** Determine ending according to plan §2.6 priority & tie-breakers. */
export function determineEnding(state: CoreState): EndingId {
  const bh = Number(state.flags.blackhat ?? 0)
  if (bh >= 2) return 'end-blackhat'

  const sc = scores(state.stats, state.bond)
  if (HEROINES.every((h) => sc[h] >= 65) && bh === 0) return 'end-true'

  const sorted = [...HEROINES].sort((a, b) => {
    const diff = sc[b] - sc[a]
    if (Math.abs(diff) > 1e-6) return diff
    if (state.bond[b] !== state.bond[a]) return state.bond[b] - state.bond[a]
    return HEROINE_PRIORITY[b] - HEROINE_PRIORITY[a]
  })
  const top = sorted[0]
  if (sc[top] >= 60 && hasRomanticGate(top, state)) return `end-${top}` as EndingId

  const avg = (sc.rin + sc.hare + sc.mirai) / 3
  if (avg >= 35) return 'end-normal'

  return 'end-bad'
}

export function dateCountFlag(who: HeroineId): string {
  return `dateCount.${who}`
}

export function getDateCount(who: HeroineId, state: Pick<CoreState, 'flags'>): number {
  const v = state.flags[dateCountFlag(who)]
  return typeof v === 'number' ? v : 0
}

/**
 * Pick weekend date scene for a heroine (plan §3.4):
 * Stage 1 -> Stage 2 -> Stage 3 (requires score >= 55).
 * Otherwise falls back to casual scene without advancing stage.
 */
export function pickDateScene(
  who: HeroineId,
  state: CoreState,
): { sceneId: string; stage: 1 | 2 | 3 | 'casual'; increment: boolean } {
  const count = getDateCount(who, state)
  if (count === 0) return { sceneId: `date-${who}-1`, stage: 1, increment: true }
  if (count === 1) return { sceneId: `date-${who}-2`, stage: 2, increment: true }
  if (count === 2 && score(who, state.stats, state.bond) >= 55) {
    return { sceneId: `date-${who}-3`, stage: 3, increment: true }
  }
  return { sceneId: `date-${who}-casual`, stage: 'casual', increment: false }
}
