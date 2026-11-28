import { STAT_KEYS, type Flags, type StatKey, type Stats } from '@/engine/types'

/**
 * 「網站儀表板」：把五項能力值換算成幾個看得懂的 **示意數據**（simulated）。
 * 純函式、對每個驅動能力值單調不減。這些數字是遊戲裡的比喻，不代表真實排名或流量預測。
 */

/** 社團網站的總頁數（已收錄頁數的分母） */
export const SITE_TOTAL_PAGES = 60
/** 行動版 LCP「良好」門檻（秒，web.dev 建議 ≤ 2.5s） */
export const LCP_GOOD = 2.5

export interface SiteMetrics {
  /** 已收錄頁數（索引覆蓋；技術力＋結構力） */
  indexed: number
  /** 行動版載入時間 LCP（秒；技術力，越低越好） */
  lcp: number
  /** 被搜尋點擊次數／週（內容力＋可答力） */
  clicks: number
  /** 被答案摘錄次數／週（可答力＋結構力） */
  snippets: number
  /** 被 AI 引用次數／週（信任力＋內容力） */
  aiCites: number
  /** 外部提及數（信任力） */
  mentions: number
}

export type MetricKey = keyof SiteMetrics

export interface MetricMeta {
  key: MetricKey
  label: string
  unit: string
  /** 數字越小越好（LCP） */
  lowerIsBetter?: boolean
  /** 一句話說明（顯示在儀表板小字） */
  hint: string
  /** 由哪些能力值驅動 */
  drivers: StatKey[]
}

export const METRIC_META: MetricMeta[] = [
  { key: 'indexed', label: '已收錄頁數', unit: `/ ${SITE_TOTAL_PAGES} 頁`, hint: '搜尋引擎找得到、收進索引的頁面', drivers: ['tec', 'str'] },
  { key: 'lcp', label: '行動版 LCP', unit: '秒', lowerIsBetter: true, hint: `≤ ${LCP_GOOD} 秒算良好`, drivers: ['tec'] },
  { key: 'clicks', label: '搜尋點擊', unit: '次/週', hint: '有人從搜尋結果點進來', drivers: ['con', 'ans'] },
  { key: 'snippets', label: '答案被摘錄', unit: '次/週', hint: '精選摘要、語音答案取用你的內容', drivers: ['ans', 'str'] },
  { key: 'aiCites', label: 'AI 引用', unit: '次/週', hint: 'AI 回答附上你的網站當來源', drivers: ['tru', 'con'] },
  { key: 'mentions', label: '外部提及', unit: '處', hint: '其他網站或社團提到你', drivers: ['tru'] },
]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** 能力值 10（起始）→ 0，100 → 1 */
const norm = (v: number) => clamp(((Number.isFinite(v) ? v : 10) - 10) / 90, 0, 1)

/**
 * 示意用的換算。起始能力值（各 10）≈「幾乎沒人找得到」的死站；各項 80 以上給出健康的數字。
 * `week` 只用來表示「網站上線越久、被收錄與點擊的累積越多」的小幅加成（0–6 週，最多約 +12%）。
 */
export function siteMetrics(stats: Stats, week = 6): SiteMetrics {
  const x = Object.fromEntries(STAT_KEYS.map((k) => [k, norm(stats[k])])) as Record<StatKey, number>
  const age = 0.88 + 0.02 * clamp(Number.isFinite(week) ? week : 6, 0, 6)

  const coverage = 0.6 * x.tec + 0.4 * x.str
  const indexed = Math.round(clamp((3 + (SITE_TOTAL_PAGES - 3) * Math.pow(coverage, 1.15)) * (0.94 + 0.06 * age), 3, SITE_TOTAL_PAGES))
  const lcp = Math.round((4.8 - 3.4 * Math.pow(x.tec, 0.9)) * 10) / 10

  const queryFit = 0.55 * x.con + 0.45 * x.ans
  const clicks = Math.round((2 + 520 * Math.pow(queryFit, 1.6)) * age)
  const answerFit = 0.6 * x.ans + 0.4 * x.str
  const snippets = Math.round(24 * Math.pow(answerFit, 1.8))
  const citeFit = 0.6 * x.tru + 0.4 * x.con
  const aiCites = Math.round(18 * Math.pow(citeFit, 1.8))
  const mentions = Math.round(30 * Math.pow(x.tru, 1.5))

  return { indexed, lcp, clicks, snippets, aiCites, mentions }
}

/** 「好」的程度 0..1（給進度條用；LCP 反向） */
export function metricRatio(key: MetricKey, m: SiteMetrics): number {
  switch (key) {
    case 'indexed':
      return m.indexed / SITE_TOTAL_PAGES
    case 'lcp':
      return clamp((4.8 - m.lcp) / 3.4, 0, 1)
    case 'clicks':
      return clamp(m.clicks / 520, 0, 1)
    case 'snippets':
      return clamp(m.snippets / 24, 0, 1)
    case 'aiCites':
      return clamp(m.aiCites / 18, 0, 1)
    case 'mentions':
      return clamp(m.mentions / 30, 0, 1)
  }
}

export function formatMetric(key: MetricKey, v: number): string {
  return key === 'lcp' ? v.toFixed(1) : String(v)
}

// ---------------------------------------------------------------- 搜尋結果示意

export type SerpTier = 'bare' | 'basic' | 'rich'

export interface SerpMock {
  tier: SerpTier
  title: string
  url: string
  description: string
  /** 類似 sitelinks 的子連結（僅 rich） */
  sitelinks: string[]
  /** 是否顯示「被 AI 答案引用」的標籤（僅 rich） */
  aiChip: string | null
}

/** 搜尋結果示意：能力值越高，標題與描述越完整（純示意，Google 實際顯示的標題與摘要由系統自行決定）。 */
export function serpMock(stats: Stats): SerpMock {
  const quality = (stats.con + stats.ans + stats.str + stats.tec + stats.tru) / 5
  if (quality < 28) {
    return {
      tier: 'bare',
      title: '404 號社辦',
      url: 'aoba-web.club › index',
      description: '這個頁面沒有提供資訊描述。',
      sitelinks: [],
      aiChip: null,
    }
  }
  if (quality < 58) {
    return {
      tier: 'basic',
      title: '網站研究社｜新手也能懂的 SEO・AEO・GEO 入門',
      url: 'aoba-web.club › guide',
      description: '高中網站研究社的實作筆記：從被搜尋引擎找到，到被 AI 引用，一步步改善社團網站。',
      sitelinks: [],
      aiChip: null,
    }
  }
  return {
    tier: 'rich',
    title: '網站研究社｜SEO・AEO・GEO 實作筆記（2026 更新）',
    url: 'aoba-web.club › guide',
    description: '結論先說：先讓頁面被找到、再寫清楚答案、最後累積可信的來源。附技術健檢清單與問答範例。',
    sitelinks: ['技術健檢｜Core Web Vitals', '問答整理｜結論先說', '作者與來源'],
    aiChip: stats.tru >= 55 ? '被 AI 回答引用：網站研究社' : null,
  }
}

// ---------------------------------------------------------------- 每週快照（存在 flags，免存檔遷移）

const SNAP_PREFIX = 'wk0.'

/** 週初的能力值快照，寫進 flags（週報用來顯示「這週成長了多少」） */
export function statSnapshotFlags(stats: Stats): Flags {
  return Object.fromEntries(STAT_KEYS.map((k) => [`${SNAP_PREFIX}${k}`, stats[k]]))
}

export function readStatSnapshot(flags: Flags): Stats | null {
  const out = {} as Stats
  for (const k of STAT_KEYS) {
    const v = flags[`${SNAP_PREFIX}${k}`]
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    out[k] = v
  }
  return out
}
