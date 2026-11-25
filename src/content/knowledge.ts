/** Knowledge card registry (plan §3.7). P3 fills summary/detail/misconception. */
export const KNOWLEDGE_TITLES = {
  'what-is-seo-aeo-geo': '三種搜尋優化',
  'robots-vs-noindex': 'robots.txt 與 noindex',
  'sitemap': 'Sitemap',
  'search-console': '站長工具',
  'search-intent': '搜尋意圖',
  'title-and-meta': '標題與描述',
  'answer-first': '結論先說',
  'question-headings': '問題型標題',
  'json-ld': 'JSON-LD',
  'schema-visible-match': '標記要與內容一致',
  'entity-consistency': '實體一致性',
  'core-web-vitals': '網站體驗核心指標',
  'mobile-first': '行動版優先',
  'image-optimization': '圖片最佳化',
  'alt-text': '替代文字',
  'redirects': '301 與 302',
  'canonical': '標準網址',
  'duplicate-content': '重複內容',
  'internal-links': '內部連結',
  'spam-policies': '垃圾內容政策',
  'link-schemes': '連結計畫',
  'eeat': 'E-E-A-T',
  'helpful-content': '有幫助的內容',
  'core-update': '核心更新',
  'geo-citations': '生成式引用',
  'original-data': '原創資料',
  'ai-crawlers': 'AI 爬蟲',
  'llms-txt-truth': 'llms.txt 的真相',
  'faq-reality': 'FAQ 的正確期待',
  'freshness': '內容時效性',
  'author-pages': '作者頁',
} as const

export type KnowledgeId = keyof typeof KNOWLEDGE_TITLES
export const KNOWLEDGE_IDS = Object.keys(KNOWLEDGE_TITLES) as KnowledgeId[]

export interface KnowledgeCard {
  id: KnowledgeId
  title: string
  /** 一句話重點 */
  summary: string
  /** 詳細說明（≤150 字） */
  detail: string
  /** 常見誤解 */
  misconception: string
}

// P3: fill in the text below (keep ids typed). Empty strings = not yet written.
const BODY: Partial<Record<KnowledgeId, Pick<KnowledgeCard, 'summary' | 'detail' | 'misconception'>>> = {}

export const KNOWLEDGE: Record<KnowledgeId, KnowledgeCard> = Object.fromEntries(
  KNOWLEDGE_IDS.map((id) => [
    id,
    { id, title: KNOWLEDGE_TITLES[id], summary: '', detail: '', misconception: '', ...BODY[id] },
  ]),
) as Record<KnowledgeId, KnowledgeCard>
