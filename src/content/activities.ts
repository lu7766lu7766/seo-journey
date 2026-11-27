import type { ActivityId } from './activityIds'
import type { StatKey } from '@/engine/types'

export interface ActivityDef {
  id: ActivityId
  name: string
  short: string
  desc: string
  stats: Partial<Record<StatKey, number>>
  stamina: number
  stress: number
}

/** Schedule activities (plan §2.4). */
export const ACTIVITIES: Record<ActivityId, ActivityDef> = {
  write: {
    id: 'write',
    name: '撰寫原創文章',
    short: '寫作',
    desc: '撰寫第一手社團觀察與實用指南，提升內容力與信任力。',
    stats: { con: 6, tru: 1 },
    stamina: -16,
    stress: 9,
  },
  research: {
    id: 'research',
    name: '關鍵字與搜尋意圖研究',
    short: '意圖研究',
    desc: '分析讀者搜尋詞背後的真正需求，兼顧內容力與可答力。',
    stats: { con: 3, ans: 3 },
    stamina: -11,
    stress: 8,
  },
  techcheck: {
    id: 'techcheck',
    name: '技術健檢',
    short: '技術健檢',
    desc: '檢查索引設定、載入速度與行動版體驗，大幅提升技術力。',
    stats: { tec: 6 },
    stamina: -16,
    stress: 9,
  },
  schema: {
    id: 'schema',
    name: '結構化資料標記',
    short: '結構標記',
    desc: '整理標題層級、內部連結與 JSON-LD，讓機器一目了然。',
    stats: { str: 6 },
    stamina: -14,
    stress: 9,
  },
  qa: {
    id: 'qa',
    name: '問答段落整理',
    short: '問答整理',
    desc: '改寫為問題型標題與「結論先說」的精簡段落，強化可答力。',
    stats: { ans: 6 },
    stamina: -14,
    stress: 9,
  },
  authors: {
    id: 'authors',
    name: '作者頁與來源引用',
    short: '來源署名',
    desc: '完善作者經歷與可查證的資料出處，累積網站信任力。',
    stats: { tru: 5, con: 1 },
    stamina: -14,
    stress: 9,
  },
  social: {
    id: 'social',
    name: '社群交流與外部合作',
    short: '外部合作',
    desc: '與其他社團交換連結、宣傳合作，舒緩壓力的同時累積外部提及。',
    stats: { tru: 3, ans: 1 },
    stamina: -10,
    stress: -6,
  },
  rest: {
    id: 'rest',
    name: '休息（福利社／天台午睡）',
    short: '休息',
    desc: '買個紅豆麵包去天台吹風午睡，恢復大量體力並大幅減壓。',
    stats: {},
    stamina: 45,
    stress: -20,
  },
}

export const ACTIVITY_LIST: ActivityDef[] = Object.values(ACTIVITIES)

export interface WeekTheme {
  week: number
  title: string
  topic: string
  bonusActivities: ActivityId[]
}

/** Weekly themes & ×1.5 bonus activities (plan §3.3). */
export const WEEK_THEMES: Record<number, WeekTheme> = {
  1: { week: 1, title: '看不見的網站', topic: '爬取與索引', bonusActivities: ['techcheck'] },
  2: { week: 2, title: '一句話的勇氣', topic: '標題、描述與搜尋意圖', bonusActivities: ['research', 'qa'] },
  3: { week: 3, title: '說給機器聽的語言', topic: '結構化資料與實體', bonusActivities: ['schema'] },
  4: { week: 4, title: '快一點，再快一點', topic: 'Core Web Vitals 與行動版', bonusActivities: ['techcheck'] },
  5: { week: 5, title: '被引用的理由', topic: 'GEO 生成式引擎優化', bonusActivities: ['authors', 'write'] },
  6: { week: 6, title: '演算法的大雨', topic: 'E-E-A-T 與核心更新', bonusActivities: ['authors', 'write'] },
}

/**
 * The 「推薦排程」 button. Theme activity first, then a balanced mix, last slot rests.
 * Deliberately NOT optimal (it does not look at who you are courting), so mashing it yields
 * a decent site but not the true ending on its own.
 */
export const RECOMMENDED_SCHEDULE: Record<number, ActivityId[]> = {
  1: ['techcheck', 'write', 'research', 'rest'],
  2: ['qa', 'research', 'social', 'rest'],
  3: ['schema', 'authors', 'write', 'rest'],
  4: ['techcheck', 'qa', 'schema', 'rest'],
  5: ['authors', 'write', 'research', 'rest'],
  6: ['write', 'authors', 'social', 'rest'],
}
