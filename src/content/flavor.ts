/**
 * Flavor text consumed by the systems (P2) and written by the script team (P3).
 * Contract only — P3 replaces the placeholder arrays with real lines (keep the shapes).
 */
import type { ActivityId } from './activityIds'
import type { Face, SpeakerId } from './characters'
import type { HeroineId } from '@/engine/types'

export interface FlavorLine {
  who: SpeakerId
  face?: Face
  text: string // ≤ 45 chars, {name} allowed
  /** optional small bond reward when this chatter fires */
  bond?: Partial<Record<HeroineId, number>>
}

/** Weekly report one-liners, picked by the heroine's current score tier: low <40, mid 40–64, high ≥65. */
export const WEEKLY_COMMENTS: Record<HeroineId, { low: FlavorLine[]; mid: FlavorLine[]; high: FlavorLine[] }> = {
  rin: { low: [], mid: [], high: [] },
  hare: { low: [], mid: [], high: [] },
  mirai: { low: [], mid: [], high: [] },
}

/** 15% random interlude after a schedule slot of this activity (plan §2.4). */
export const ACTIVITY_CHATTER: Record<ActivityId, FlavorLine[]> = {
  write: [], research: [], techcheck: [], schema: [], qa: [], authors: [], social: [], rest: [],
}

/** Result caption shown for a successful slot, per activity (narr/me voice). */
export const ACTIVITY_RESULT: Record<ActivityId, string[]> = {
  write: [], research: [], techcheck: [], schema: [], qa: [], authors: [], social: [], rest: [],
}

/** Stress ≥ 80 failure quips (who: 'me'). */
export const FAIL_LINES: FlavorLine[] = []
/** Stamina 0 → infirmary mini scene lines (bg 'infirmary'). */
export const INFIRMARY_LINES: FlavorLine[] = []
/** Notice-board blurbs for each side quest (shown on the 委託公佈欄). */
export const QUEST_BLURBS: Record<string, { title: string; client: string; blurb: string }> = {}
