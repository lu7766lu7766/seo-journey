import type { KnowledgeId } from './knowledge'

/**
 * 實戰檢查清單：每張知識卡對應一條「回到自己真實網站就能做」的待辦（≤ 40 字，祈使句）。
 * 內容遵守 plan §3.6 事實表：不保證排名、不保證被 AI 引用。
 */
export type ChecklistArea = 'SEO' | 'AEO' | 'GEO' | '通用'

export interface ChecklistItem {
  action: string
  area: ChecklistArea
}

export const CHECKLIST_AREAS: ChecklistArea[] = ['SEO', 'AEO', 'GEO', '通用']

export const CHECKLIST: Record<KnowledgeId, ChecklistItem> = {
  'what-is-seo-aeo-geo': { area: '通用', action: '為網站列出三份重點頁面：要被搜到、被摘錄、被引用各一' },
  'robots-vs-noindex': { area: 'SEO', action: '不想被收錄的頁面加 noindex，且別同時用 robots.txt 擋掉它' },
  sitemap: { area: 'SEO', action: '提交 sitemap.xml 到 Search Console（不保證收錄）' },
  'search-console': { area: 'SEO', action: '註冊 Search Console，固定每週看一次索引與搜尋成效報表' },
  'search-intent': { area: 'SEO', action: '替每個頁面寫下它要回答的那一個搜尋問題，答不出來就重寫' },
  'title-and-meta': { area: 'SEO', action: '每頁寫獨一無二的標題，重點放前段，再補上清楚的描述' },
  'answer-first': { area: 'AEO', action: '每段開頭先用一兩句直接給結論，再補充細節與例子' },
  'question-headings': { area: 'AEO', action: '把標題改成讀者真的會問的問題句，例如「怎麼設定轉址？」' },
  'json-ld': { area: 'SEO', action: '用 JSON-LD 標記文章與組織資訊，再用官方工具驗證' },
  'schema-visible-match': { area: 'SEO', action: '逐項核對結構化資料，確保都和頁面上看得到的內容一致' },
  'entity-consistency': { area: 'GEO', action: '統一各平台上的名稱、成立年份與簡介寫法，不要互相矛盾' },
  'core-web-vitals': { area: 'SEO', action: '用 PageSpeed Insights 查 LCP、INP、CLS，先修最差的' },
  'mobile-first': { area: 'SEO', action: '用手機實際瀏覽，確認手機版內容和電腦版一樣完整' },
  'image-optimization': { area: 'SEO', action: '壓縮圖片到合適尺寸，並標明寬高，避免載入時版面跳動' },
  'alt-text': { area: 'SEO', action: '替有意義的圖片寫簡短具體的替代文字，裝飾圖則留空' },
  redirects: { area: 'SEO', action: '網址永久搬家用 301 轉址，暫時性的調整才用 302' },
  canonical: { area: 'SEO', action: '在重複內容的頁面加上 rel=canonical 指向主要網址' },
  'duplicate-content': { area: 'SEO', action: '把內容雷同的頁面合併或轉址，只保留一個主要網址' },
  'internal-links': { area: 'SEO', action: '在相關文章之間加內部連結，錨點文字寫出目標頁的主題' },
  'spam-policies': { area: '通用', action: '檢查並移除關鍵字堆砌、隱藏文字與大量灌水的頁面' },
  'link-schemes': { area: '通用', action: '不買賣、不互刷連結，只爭取別人自然願意引用你的理由' },
  eeat: { area: '通用', action: '在文章中呈現第一手經驗、作者資歷與可查證的資料來源' },
  'helpful-content': { area: '通用', action: '每篇文章發布前自問：讀者看完能解決什麼具體問題？' },
  'core-update': { area: '通用', action: '排名波動時先檢視內容是否真有幫助，別急著追逐演算法' },
  'geo-citations': { area: 'GEO', action: '重點用具體、可查證的陳述寫出，並標明資料出處' },
  'original-data': { area: 'GEO', action: '公開自己整理的調查或實測數據，並標明日期與方法' },
  'ai-crawlers': { area: 'GEO', action: '檢視 robots.txt，決定要放行哪些 AI 爬蟲再逐一設定' },
  'llms-txt-truth': { area: 'GEO', action: '別指望 llms.txt 帶來引用，把力氣花在內容與來源上' },
  'faq-reality': { area: 'AEO', action: '用問答區塊讓內容結構清楚，但別期待一定出現 FAQ 特效' },
  freshness: { area: '通用', action: '標示文章更新日期，並定期檢查舊內容是否已經過時' },
  'author-pages': { area: 'GEO', action: '建立作者頁：寫明姓名、經歷與聯絡方式，文章都連過去' },
}

const AREA_ORDER: ChecklistArea[] = CHECKLIST_AREAS

/**
 * 組成 Markdown：已學到的卡片依領域分組成 `- [ ] ...`，最後列出還沒學到的項目（用卡片標題）。
 */
export function buildChecklistMarkdown(
  learned: readonly string[],
  titles: Record<string, string>,
  opts: { playerName?: string; total?: number } = {},
): string {
  const learnedSet = new Set(learned)
  const ids = Object.keys(CHECKLIST) as KnowledgeId[]
  const have = ids.filter((id) => learnedSet.has(id))
  const missing = ids.filter((id) => !learnedSet.has(id))
  const lines: string[] = [`# 我的網站實戰檢查清單（搜尋戀曲 · 已學 ${have.length} / ${opts.total ?? ids.length} 張知識卡）`, '']
  if (opts.playerName) lines.push(`社員：${opts.playerName}`, '')
  lines.push('> 回到自己的真實網站逐項打勾。以下是通用的好做法，不保證排名或被 AI 引用。', '')
  for (const area of AREA_ORDER) {
    const items = have.filter((id) => CHECKLIST[id].area === area)
    if (!items.length) continue
    lines.push(`## ${area}`)
    for (const id of items) lines.push(`- [ ] ${CHECKLIST[id].action}`)
    lines.push('')
  }
  if (!have.length) lines.push('（還沒學到任何知識卡，先玩幾週再回來！）', '')
  if (missing.length) {
    lines.push('## 還沒學到的項目')
    for (const id of missing) lines.push(`- ${titles[id] ?? id}`)
    lines.push('')
  }
  return lines.join('\n')
}
