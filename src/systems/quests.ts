import type { Flags, HeroineId } from '@/engine/types'

export const MAX_QUESTS_PER_WEEK = 2

export interface SideQuestMeta {
  id: string
  minWeek: number
  maxWeek: number
  requires?: string
  heroine?: HeroineId
  rewardHint: string
}

/** All 10 side quests and unlock rules (plan §3.5). */
export const SIDE_QUESTS: SideQuestMeta[] = [
  { id: 'sq-r1', minWeek: 1, maxWeek: 3, heroine: 'rin', rewardHint: '技術+8、凜好感+2' },
  { id: 'sq-r2', minWeek: 2, maxWeek: 5, requires: 'sq-r1', heroine: 'rin', rewardHint: '結構+6、技術+4、凜好感+2' },
  { id: 'sq-r3', minWeek: 4, maxWeek: 6, requires: 'sq-r2', heroine: 'rin', rewardHint: '技術+6、內容+4、凜好感+4' },
  { id: 'sq-h1', minWeek: 1, maxWeek: 3, heroine: 'hare', rewardHint: '結構+6、解答+4、晴好感+2' },
  { id: 'sq-h2', minWeek: 2, maxWeek: 5, requires: 'sq-h1', heroine: 'hare', rewardHint: '內容+5、解答+5、晴好感+2' },
  { id: 'sq-h3', minWeek: 4, maxWeek: 6, requires: 'sq-h2', heroine: 'hare', rewardHint: '解答+8、晴好感+4' },
  { id: 'sq-m1', minWeek: 3, maxWeek: 5, heroine: 'mirai', rewardHint: '信任+8、未來好感+2' },
  { id: 'sq-m2', minWeek: 3, maxWeek: 6, requires: 'sq-m1', heroine: 'mirai', rewardHint: '技術+4、信任+4、未來好感+2' },
  { id: 'sq-m3', minWeek: 5, maxWeek: 6, requires: 'sq-m2', heroine: 'mirai', rewardHint: '內容+6、信任+4、未來好感+4' },
  { id: 'sq-x1', minWeek: 4, maxWeek: 6, rewardHint: '信任+6、三人好感各+1' },
]

export const questDoneFlag = (id: string) => `sq.${id}.done`
export const isQuestDone = (id: string, flags: Flags) => !!flags[questDoneFlag(id)]

export function availableQuests(week: number, flags: Flags): SideQuestMeta[] {
  return SIDE_QUESTS.filter((q) => {
    if (isQuestDone(q.id, flags)) return false
    if (week < q.minWeek || week > q.maxWeek) return false
    if (q.requires && !isQuestDone(q.requires, flags)) return false
    return true
  })
}
