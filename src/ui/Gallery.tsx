import { useEffect, useState, type CSSProperties } from 'react'
import { CgArt } from '@/art/cg'
import { CG_IDS, type CgId } from '@/content/cgs'
import { CHECKLIST, CHECKLIST_AREAS, type ChecklistArea } from '@/content/checklist'
import { ADVANCED_KNOWLEDGE_IDS, KNOWLEDGE, KNOWLEDGE_IDS, type KnowledgeId } from '@/content/knowledge'
import { MINIGAMES, MINIGAME_IDS, type MinigameId, type MinigameKind } from '@/content/minigames'
import { MinigameHost } from '@/minigames'
import { BestStars } from '@/minigames/StarRating'
import { useGlobal } from '@/store/global'
import { useUI, type GalleryTab } from '@/store/ui'
import { ENDINGS_META } from '@/systems/ending'
import {
  FourPointStar,
  PAPER_INK_ACCENT,
  Paper,
  RoomBadge,
  SearchRule,
  Stamp,
  StickyNote,
} from '@/ui/material'
import { CopyChecklistButton } from './sim/CopyChecklistButton'

const TABS: { id: GalleryTab; label: string; testId: string; strip: string }[] = [
  { id: 'cards', label: '知識卡圖鑑', testId: 'tab-cards', strip: '#c6382b' },
  { id: 'cg', label: '回憶相簿', testId: 'tab-cg', strip: '#2f5d8c' },
  { id: 'endings', label: '結局列表', testId: 'tab-endings', strip: '#2d7355' },
  { id: 'practice', label: '練習模式', testId: 'tab-practice', strip: '#8f6514' },
]

const AREA_INK: Record<ChecklistArea, string> = {
  SEO: PAPER_INK_ACCENT.rin,
  AEO: PAPER_INK_ACCENT.hare,
  GEO: PAPER_INK_ACCENT.mirai,
  通用: PAPER_INK_ACCENT.sensei,
}

const KIND_META: Record<MinigameKind, { label: string; color: string }> = {
  quiz: { label: '問答測驗', color: PAPER_INK_ACCENT.rin },
  spot: { label: '程式除錯', color: '#98251c' },
  serp: { label: '搜尋結果設計', color: '#2d7355' },
  placeholder: { label: '練習', color: PAPER_INK_ACCENT.kuro },
}

const PRACTICE_LABELS: Partial<Record<MinigameId, string>> = {
  'w1-robots': 'W1 · robots.txt 與 noindex 除錯',
  'w2-serp': 'W2 · 社團首頁搜尋結果設計',
  'w3-jsonld': 'W3 · JSON-LD 結構化資料檢查',
  'w4-cwv': 'W4 · Core Web Vitals 指標測驗',
  'w5-cite': 'W5 · GEO 哪一段最可能被 AI 引用',
  'w6-update': 'W6 · 核心更新應對測驗',
  'sq-r1': '凜支線 1 · 轉址與標準網址測驗',
  'sq-r2': '凜支線 2 · 重複內容與 Sitemap 除錯',
  'sq-r3': '凜支線 3 · 圖片與行動版最佳化檢查',
  'sq-h1': '晴支線 1 · 圖片替代文字與結構化資料檢查',
  'sq-h2': '晴支線 2 · 籃球社搜尋結果改寫',
  'sq-h3': '晴支線 3 · 問答結構與 AEO 測驗',
  'sq-m1': '未來支線 1 · 實體一致性除錯',
  'sq-m2': '未來支線 2 · AI 爬蟲與 robots.txt 測驗',
  'sq-m3': '未來支線 3 · 原創性與資訊增益測驗',
  'sq-x1': '黑川支線 · 白帽與黑帽界線測驗',
}

const PRACTICE_IDS = MINIGAME_IDS.filter((id) => id !== 'demo-quiz')

const CARD_SOURCES: Partial<Record<KnowledgeId, string>> = {
  'what-is-seo-aeo-geo': '序章「404 號社辦」',
  'robots-vs-noindex': '第 1 週主線「看不見的網站」',
  sitemap: '第 1 週主線「看不見的網站」',
  'search-console': '第 1 週主線「看不見的網站」',
  'search-intent': '第 2 週主線「一句話的勇氣」',
  'title-and-meta': '第 2 週主線「一句話的勇氣」',
  'answer-first': '第 2 週主線「一句話的勇氣」',
  'question-headings': '第 2 週主線「一句話的勇氣」或晴支線 3',
  'json-ld': '第 3 週主線「說給機器聽的語言」',
  'schema-visible-match': '第 3 週主線「說給機器聽的語言」',
  'entity-consistency': '第 3 週主線或未來支線 1',
  'core-web-vitals': '第 4 週主線「快一點，再快一點」',
  'mobile-first': '第 4 週主線「快一點，再快一點」',
  'image-optimization': '第 4 週主線或凜支線 3',
  'alt-text': '第 4 週主線或晴支線 1',
  redirects: '第 1 週主線或凜支線 1',
  canonical: '第 3 週主線「說給機器聽的語言」或凜支線 1',
  'duplicate-content': '第 6 週主線「演算法的大雨」或凜支線 2',
  'internal-links': '第 3 週主線或凜支線 2',
  'spam-policies': '第 4 週主線或黑川支線',
  'link-schemes': '黑川支線「流量學院的挑戰」（W4–6）',
  eeat: '第 6 週主線「演算法的大雨」',
  'helpful-content': '第 6 週主線「演算法的大雨」',
  'core-update': '第 6 週主線「演算法的大雨」',
  'geo-citations': '第 5 週主線「被引用的理由」',
  'original-data': '第 5 週主線「被引用的理由」或未來支線 3',
  'ai-crawlers': '第 5 週主線「被引用的理由」或未來支線 2',
  'llms-txt-truth': '第 5 週主線「被引用的理由」',
  'faq-reality': '晴支線 3「廣播社的語音問答」（需先完成晴支線 1、2）',
  freshness: '晴支線 2「籃球社的比賽頁」（需先完成晴支線 1）',
  'author-pages': '第 6 週主線「演算法的大雨」',
  'gone-410': '凜支線 1「舊公告頁搬家」',
  'url-parameters': '凜支線 2「重複內容的幽靈」',
  'responsive-images': '凜支線 3「凜的秘密部落格」',
  'recipe-schema': '晴支線 1「料理社的食譜頁」',
  'same-as': '未來支線 1「圖書館消失的校史」',
  'verify-crawlers': '未來支線 2「AI 爬蟲來敲門」',
  'information-gain': '未來支線 3「未來的真面目」',
}

const ADVANCED_SET = new Set<KnowledgeId>(ADVANCED_KNOWLEDGE_IDS)

const CG_SOURCES: Record<CgId, string> = {
  'date-rin-3': '凜第 3 階段約會（好感度 ≥ 55）',
  'date-hare-3': '晴第 3 階段約會（好感度 ≥ 55）',
  'date-mirai-3': '未來第 3 階段約會（好感度 ≥ 55）',
  'end-true': '真結局（三人皆 ≥ 65 且無黑帽）',
  'end-rin': '凜結局（凜最高且 ≥ 60）',
  'end-hare': '晴結局（晴最高且 ≥ 60）',
  'end-mirai': '未來結局（未來最高且 ≥ 60）',
  'end-normal': '普通結局（三人平均 ≥ 35）',
  'end-bad': '壞結局（三人平均 < 35）',
  'end-blackhat': '黑帽結局（接受黑帽 ≥ 2 次）',
}

/** 固定於相簿相紙四角的老相角貼（Photo Corners）。 */
function AlbumCorners({ muted = false }: { muted?: boolean }) {
  const fill = muted ? '#9e8765' : '#332d28'
  const stroke = muted ? '#cbb796' : '#a6957c'
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <svg viewBox="0 0 16 16" className="mat-photo-corner -left-[2px] -top-[2px]">
        <path d="M0 0 H15 L0 15 Z" fill={fill} fillOpacity="0.9" />
        <path d="M1 1 H12 L1 12 Z" fill="none" stroke={stroke} strokeWidth="0.6" strokeOpacity="0.65" />
      </svg>
      <svg viewBox="0 0 16 16" className="mat-photo-corner -right-[2px] -top-[2px]">
        <path d="M16 0 H1 L16 15 Z" fill={fill} fillOpacity="0.9" />
        <path d="M15 1 H4 L15 12 Z" fill="none" stroke={stroke} strokeWidth="0.6" strokeOpacity="0.65" />
      </svg>
      <svg viewBox="0 0 16 16" className="mat-photo-corner -bottom-[2px] -left-[2px]">
        <path d="M0 16 H15 L0 1 Z" fill={fill} fillOpacity="0.9" />
        <path d="M1 15 H12 L1 4 Z" fill="none" stroke={stroke} strokeWidth="0.6" strokeOpacity="0.65" />
      </svg>
      <svg viewBox="0 0 16 16" className="mat-photo-corner -bottom-[2px] -right-[2px]">
        <path d="M16 16 H1 L16 1 Z" fill={fill} fillOpacity="0.9" />
        <path d="M15 15 H4 L15 4 Z" fill="none" stroke={stroke} strokeWidth="0.6" strokeOpacity="0.65" />
      </svg>
    </div>
  )
}

function CardsTab({
  unlocked,
  selected,
  onSelect,
}: {
  unlocked: string[]
  selected: KnowledgeId | null
  onSelect: (id: KnowledgeId | null) => void
}) {
  const [area, setArea] = useState<'all' | ChecklistArea>('all')
  const [query, setQuery] = useState('')
  const unlockedSet = new Set(unlocked)
  const count = KNOWLEDGE_IDS.filter((id) => unlockedSet.has(id)).length

  if (selected && unlockedSet.has(selected)) {
    const card = KNOWLEDGE[selected]
    const check = CHECKLIST[selected]
    const isAdv = ADVANCED_SET.has(selected)
    const idx = KNOWLEDGE_IDS.indexOf(selected)
    const ink = AREA_INK[check.area]

    return (
      <div className="flex h-full flex-col justify-between gap-3" data-testid="card-detail">
        <div
          className={`flex min-h-0 flex-1 flex-col rounded-[4px] border-2 p-[4px] shadow-[0_6px_16px_rgba(38,18,6,0.16)] ${
            isAdv
              ? 'border-[#c89634] bg-gradient-to-br from-[#fffdf4] via-[#fdf3d7] to-[#f8e7ba]'
              : 'border-[#967d57] bg-[#fffdf7]'
          }`}
        >
          <div
            className={`flex min-h-0 flex-1 flex-col justify-between gap-3 rounded-[2px] border p-4 ${
              isAdv ? 'border-[#d6a949]/75' : 'border-[#c8b38f]'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans text-[15px] font-bold" style={{ color: ink }}>
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="border border-current/75 px-2 py-0 font-title text-[14px] font-bold leading-snug"
                      style={{ color: ink }}
                    >
                      {check.area}
                    </span>
                    {isAdv ? (
                      <span
                        className="inline-flex items-center gap-1 border border-[#b5811b] bg-[#fff7dc] px-2.5 py-0 font-title text-[14px] font-bold leading-snug text-[#7c5308]"
                        data-testid="card-advanced-badge"
                      >
                        <FourPointStar size={14} color="#c58b18" />
                        進階知識卡
                      </span>
                    ) : (
                      <span className="border border-[#9a8870]/75 px-2 py-0 font-title text-[14px] font-bold leading-snug text-ink-muted">
                        基礎知識卡
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 font-title text-[26px] font-bold leading-tight text-ink-body">
                    {card.title}
                  </h3>
                </div>
                <button
                  type="button"
                  className="mat-washi-btn shrink-0 px-4 py-1.5 font-title text-[15px] font-bold"
                  onClick={() => onSelect(null)}
                >
                  ← 返回列表
                </button>
              </div>

              <SearchRule />

              <div className="rounded-[2px] border border-[#cbb794] bg-[#fffaf0]/90 px-4 py-2.5">
                <div className="font-sans text-[13.5px] font-bold tracking-wider text-ink-muted">一句話重點</div>
                <p className="mt-0.5 font-title text-[20px] font-bold leading-snug text-ink-body">{card.summary}</p>
              </div>

              <Paper tone="warm" rule="lined" curled={false} className="px-4 py-3">
                <div className="font-sans text-[13.5px] font-bold tracking-wider text-ink-muted">詳細說明</div>
                <p className="mt-1 font-sans text-[15.5px] leading-relaxed text-ink-body">{card.detail}</p>
              </Paper>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <StickyNote color="pink" rotate={-0.6} attach="tape" tapeColor="sakura" className="px-4 pb-3.5 pt-4">
                  <div className="font-title text-[14.5px] font-bold text-[#9c2b48]">常見誤解</div>
                  <p className="mt-1 font-sans text-[15px] font-medium leading-relaxed text-[#541d2e]">
                    {card.misconception}
                  </p>
                </StickyNote>
                <StickyNote color="mint" rotate={0.6} attach="tape" tapeColor="mint" className="px-4 pb-3.5 pt-4">
                  <div className="font-title text-[14.5px] font-bold text-[#1e5c40]">實戰檢查清單</div>
                  <p className="mt-1 font-sans text-[15px] font-medium leading-relaxed text-[#143d2b]">
                    {check.action}
                  </p>
                </StickyNote>
              </div>
            </div>

            <p className="text-right font-sans text-[13.5px] font-semibold text-ink-muted">
              ※ 依 2026 年實務，搜尋引擎規則會持續變動。
            </p>
          </div>
        </div>
      </div>
    )
  }

  const trimmed = query.trim().toLowerCase()
  const filteredIds = KNOWLEDGE_IDS.filter((id) => {
    if (area !== 'all' && CHECKLIST[id].area !== area) return false
    if (!trimmed) return true
    if (!unlockedSet.has(id)) return false
    const c = KNOWLEDGE[id]
    return c.title.toLowerCase().includes(trimmed) || c.summary.toLowerCase().includes(trimmed)
  })

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-dashed border-[#c7b392] pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', ...CHECKLIST_AREAS] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setArea(a)}
              className={`rounded-[3px] border-2 px-3 py-1 font-title text-[14.5px] font-bold transition focus-visible:outline-3 focus-visible:outline-[#2b6ea8] focus-visible:outline-offset-2 ${
                area === a
                  ? 'border-[#213352] bg-[#213352] text-[#fff8eb]'
                  : 'border-[#b59c77] bg-[#fffdf8] text-ink-body hover:bg-[#f5ebd4]'
              }`}
            >
              {a === 'all' ? '全部' : a}
            </button>
          ))}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋已收集卡片…"
            className="ml-1 w-48 rounded-[3px] border border-[#b59c77] bg-[#fffdf8] px-3 py-1 font-sans text-[14px] text-ink-body placeholder:text-ink-muted/75 focus:outline-none focus:ring-2 focus:ring-[#2b6ea8]"
          />
        </div>
        <span className="flex items-center gap-3">
          <CopyChecklistButton
            unlocked={unlocked}
            label="複製清單"
            testId="copy-checklist-gallery"
            toastBelow
            className="mat-washi-btn px-3 py-1 font-title text-[14px] font-bold"
          />
          <span
            className="border-b-2 border-[#8c7351] px-1.5 pb-0.5 font-title text-[15.5px] font-bold text-ink-body"
            data-testid="cards-count"
          >
            已收集 {count} / {KNOWLEDGE_IDS.length}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {filteredIds.map((id) => {
          const idx = KNOWLEDGE_IDS.indexOf(id)
          const isUnlocked = unlockedSet.has(id)
          const card = KNOWLEDGE[id]
          const itemArea = CHECKLIST[id].area
          const isAdv = ADVANCED_SET.has(id)
          const ink = AREA_INK[itemArea]

          return isUnlocked ? (
            <button
              key={id}
              type="button"
              data-testid={`card-item-${id}`}
              onClick={() => onSelect(id)}
              className={`flex rounded-[4px] border-2 p-[3px] text-left shadow-[0_3px_8px_rgba(38,18,6,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(38,18,6,0.22)] focus-visible:outline-3 focus-visible:outline-[#2b6ea8] focus-visible:outline-offset-2 ${
                isAdv
                  ? 'border-[#c89634] bg-gradient-to-br from-[#fffdf4] via-[#fdf3d7] to-[#f8e7ba]'
                  : 'border-[#9f8660] bg-[#fffdf7]'
              }`}
            >
              <div
                className={`flex h-full w-full flex-col rounded-[2px] border p-3 ${
                  isAdv ? 'border-[#d6a949]/75' : 'border-[#cbb692]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans text-[13.5px] font-bold" style={{ color: ink }}>
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {isAdv ? (
                      <span className="inline-flex items-center gap-1 border border-[#b5811b] bg-[#fff7dc] px-1.5 py-0 font-title text-[13px] font-bold leading-snug text-[#7c5308]">
                        <FourPointStar size={12} color="#c58b18" />
                        進階
                      </span>
                    ) : (
                      <span className="border border-[#9a8870]/65 px-1.5 py-0 font-title text-[13px] font-bold leading-snug text-ink-muted">
                        基礎
                      </span>
                    )}
                    <span
                      className="border border-current/70 px-1.5 py-0 font-title text-[13px] font-bold leading-snug"
                      style={{ color: ink }}
                    >
                      {itemArea}
                    </span>
                  </span>
                </div>
                <span className="mt-1.5 font-title text-[18px] font-bold leading-snug text-ink-body">
                  {card.title}
                </span>
                <span className="mt-1 line-clamp-2 font-sans text-[14px] leading-[1.45] text-ink-muted">
                  {card.summary}
                </span>
              </div>
            </button>
          ) : (
            <div
              key={id}
              data-testid={`card-locked-${id}`}
              className="mat-card-back flex rounded-[4px] border-2 border-dashed border-[#a68f6c] p-[3px] text-left"
            >
              <div className="flex h-full w-full flex-col rounded-[2px] border border-dashed border-[#bda888] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans text-[13.5px] font-bold text-[#6e5d47]">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {isAdv ? (
                      <span className="inline-flex items-center gap-1 border border-[#a68f6c] px-1.5 py-0 font-title text-[13px] font-bold leading-snug text-[#6e5d47]">
                        <FourPointStar size={12} color="#9e7f48" />
                        進階
                      </span>
                    ) : (
                      <span className="border border-[#a68f6c] px-1.5 py-0 font-title text-[13px] font-bold leading-snug text-[#6e5d47]">
                        基礎
                      </span>
                    )}
                    <span className="border border-[#a68f6c] px-1.5 py-0 font-title text-[13px] font-bold leading-snug text-[#6e5d47]">
                      {itemArea}
                    </span>
                  </span>
                </div>
                <span className="mt-1.5 font-title text-[18px] font-bold text-[#6e5d47]">？？？</span>
                <span className="mt-1 font-sans text-[13.5px] leading-snug text-[#5f503d]">
                  {CARD_SOURCES[id] ?? '在劇情或支線中解鎖'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CgTab({
  unlocked,
  onOpenLightbox,
}: {
  unlocked: string[]
  onOpenLightbox: (id: CgId) => void
}) {
  const unlockedSet = new Set(unlocked)
  const count = CG_IDS.filter((id) => unlockedSet.has(id)).length

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between border-b border-dashed border-[#c7b392] pb-2">
        <span className="font-sans text-[15px] font-medium text-ink-muted">
          點擊已解鎖的回憶 CG 可全螢幕檢視。
        </span>
        <span
          className="border-b-2 border-[#8c7351] px-1.5 pb-0.5 font-title text-[15.5px] font-bold text-ink-body"
          data-testid="cg-count"
        >
          已收集 {count} / {CG_IDS.length}
        </span>
      </div>

      <div className="rounded-[4px] border border-[#c7b392] bg-[#efe3ca]/75 p-4">
        <div className="grid grid-cols-3 gap-4">
          {CG_IDS.map((id) => {
            const isUnlocked = unlockedSet.has(id)
            return isUnlocked ? (
              <button
                key={id}
                type="button"
                data-testid={`cg-thumb-${id}`}
                onClick={() => onOpenLightbox(id)}
                className="group relative flex flex-col items-center rounded-[2px] border border-[#cbb99a] bg-[#fffdf8] p-2.5 pb-3 text-left shadow-[0_3px_10px_rgba(38,18,6,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(38,18,6,0.26)] focus-visible:outline-3 focus-visible:outline-[#2b6ea8] focus-visible:outline-offset-2"
              >
                <div className="relative h-[162px] w-[288px]">
                  <AlbumCorners />
                  <div className="h-full w-full overflow-hidden border border-[#d6c7ae] bg-[#1b223b]">
                    <div className="pointer-events-none h-[720px] w-[1280px] origin-top-left scale-[0.225]">
                      <CgArt id={id} />
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-[#2c253b]/0 transition group-hover:bg-[#2c253b]/10" />
                </div>
                <span className="mt-2 w-full px-1 font-title text-[13.5px] font-bold text-ink-body">
                  {CG_SOURCES[id]}
                </span>
              </button>
            ) : (
              <div
                key={id}
                data-testid={`cg-locked-${id}`}
                className="relative flex flex-col items-center rounded-[2px] border border-[#bea884] bg-[#ead9ba] p-2.5 pb-3 text-center"
              >
                <div className="relative flex h-[162px] w-[288px] flex-col items-center justify-center border border-dashed border-[#a48b63] bg-[#e2cea9]/80 px-4">
                  <AlbumCorners muted />
                  <Stamp label="尚未收藏" color="navy" shape="rect" size="sm" rotate={-5} />
                </div>
                <span className="mt-2 w-full px-1 font-sans text-[13.5px] font-medium text-[#5e4d38]">
                  {CG_SOURCES[id] ?? '尚未解鎖'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EndingsTab({ reached }: { reached: string[] }) {
  const reachedSet = new Set(reached)
  const count = ENDINGS_META.filter((e) => reachedSet.has(e.id)).length

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between border-b border-dashed border-[#c7b392] pb-2">
        <span className="font-sans text-[15px] font-medium text-ink-muted">
          達成條件依各週累計好感度與選項紀錄判定。
        </span>
        <span
          className="border-b-2 border-[#8c7351] px-1.5 pb-0.5 font-title text-[15.5px] font-bold text-ink-body"
          data-testid="endings-count"
        >
          已達成 {count} / {ENDINGS_META.length}
        </span>
      </div>

      <div className="divide-y divide-dashed divide-[#bfa988] border-x border-y-[3px] border-double border-x-[#c4b192] border-y-[#786147] bg-[#fffdf7]/70">
        {ENDINGS_META.map((meta) => {
          const isReached = reachedSet.has(meta.id)
          return (
            <div
              key={meta.id}
              data-testid={`ending-item-${meta.id}`}
              className={`flex items-center gap-4 px-5 py-3.5 ${isReached ? '' : 'bg-[#efe4ce]/60'}`}
            >
              <div className="flex w-[104px] shrink-0 items-center justify-center">
                {isReached ? (
                  <Stamp
                    label="已達成"
                    color={meta.id === 'end-true' ? 'vermilion' : 'forest'}
                    shape={meta.id === 'end-true' ? 'oval' : 'rect'}
                    size="sm"
                    rotate={-6}
                  />
                ) : (
                  <span className="border border-dashed border-[#9c896d] px-2.5 py-0.5 font-title text-[14px] font-bold text-ink-muted">
                    尚未達成
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-title text-[19px] font-bold ${isReached ? 'text-ink-body' : 'text-[#6c5b45]'}`}>
                    {isReached ? meta.title : '？？？'}
                  </h3>
                  {isReached && meta.id === 'end-true' && <FourPointStar size={16} color="#c58b18" />}
                </div>
                <p className="mt-0.5 font-sans text-[15px] text-ink-muted">
                  {isReached ? meta.subtitle : meta.hint}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PracticeTab({ onLaunch }: { onLaunch: (id: MinigameId) => void }) {
  const stars = useGlobal((s) => s.stars)
  return (
    <div className="space-y-3.5">
      <p className="border-b border-dashed border-[#c7b392] pb-2 font-sans text-[15px] text-ink-muted">
        可單獨重玩主線與支線小遊戲，練習不會影響劇情存檔與屬性；只會更新每個小遊戲的最佳星等（滿分三顆星光）。
      </p>
      <div className="grid grid-cols-2 gap-3">
        {PRACTICE_IDS.map((id) => {
          const kind = MINIGAMES[id].kind
          const km = KIND_META[kind]
          return (
            <button
              key={id}
              type="button"
              data-testid={`practice-${id}`}
              onClick={() => onLaunch(id)}
              className="flex items-center justify-between gap-3 rounded-[4px] border-2 border-[#b59f7c] bg-[#fffdf8] px-4 py-3 text-left shadow-[0_2px_6px_rgba(38,18,6,0.1)] transition hover:-translate-y-0.5 hover:border-[#2f5d8c] hover:shadow-[0_6px_14px_rgba(38,18,6,0.16)] focus-visible:outline-3 focus-visible:outline-[#2b6ea8] focus-visible:outline-offset-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-title text-[17px] font-bold leading-snug text-ink-body">
                  {PRACTICE_LABELS[id] ?? id}
                </span>
                <span
                  className="mt-1 inline-block border border-current/70 px-2 py-0 font-title text-[13.5px] font-bold leading-snug"
                  style={{ color: km.color }}
                >
                  {km.label}
                </span>
              </span>
              <BestStars stars={stars[id] ?? 0} testId={`practice-stars-${id}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Gallery() {
  const tab = useUI((s) => s.galleryTab)
  const galleryCardId = useUI((s) => s.galleryCardId)
  const setOverlay = useUI((s) => s.setOverlay)
  const openGallery = useUI((s) => s.openGallery)
  const cards = useGlobal((s) => s.cards)
  const cgs = useGlobal((s) => s.cgs)
  const endings = useGlobal((s) => s.endings)

  const [selectedCard, setSelectedCard] = useState<KnowledgeId | null>(galleryCardId)
  const [lightboxCg, setLightboxCg] = useState<CgId | null>(null)
  const [activeMinigame, setActiveMinigame] = useState<MinigameId | null>(null)

  useEffect(() => {
    setSelectedCard(galleryCardId)
  }, [galleryCardId])

  const close = () => setOverlay(useUI.getState().screen === 'game' ? 'menu' : null)

  const handleSelectCard = (id: KnowledgeId | null) => {
    setSelectedCard(id)
    if (!id) useUI.setState({ galleryCardId: null })
  }

  const switchTab = (next: GalleryTab) => {
    setSelectedCard(null)
    openGallery(next)
  }

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#140d0a]/62 px-6 pb-3 pt-14"
      data-testid="gallery-modal"
      onClick={(e) => {
        e.stopPropagation()
        if (!lightboxCg && !activeMinigame) close()
      }}
    >
      <div
        className="flex h-[644px] w-[1120px] flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="圖鑑與回憶相簿"
      >
        {/* 檔案夾突出索引籤列 */}
        <div className="flex items-end justify-between gap-4 px-1">
          <div className="flex items-end gap-1.5">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  data-testid={t.testId}
                  onClick={() => switchTab(t.id)}
                  className={`mat-folder-tab relative rounded-t-[8px] border-2 border-b-0 font-title font-bold ${
                    active
                      ? 'z-20 -mb-[2px] border-[#6b4929] bg-[#fbf6eb] px-6 pb-2.5 pt-2.5 text-[18px] text-ink-body shadow-[0_-2px_6px_rgba(38,18,6,0.16)]'
                      : 'mt-1.5 border-[#8d6b45] bg-[#decba8] px-5 py-1.5 text-[16.5px] text-[#53412d] hover:bg-[#ead9bc]'
                  }`}
                  style={active ? ({ borderTopWidth: '4px', borderTopColor: t.strip } as CSSProperties) : undefined}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="mb-1.5 flex items-center gap-2.5">
            <RoomBadge label="404 收藏冊" />
            <button
              type="button"
              className="mat-washi-btn px-3.5 py-1 font-title text-[15px] font-bold"
              data-testid="gallery-close"
              onClick={close}
              aria-label="關閉"
            >
              ✕ 關閉
            </button>
          </div>
        </div>

        {/* 牛皮檔案夾本體與米白收藏冊內頁 */}
        <div className="mat-folder-body flex min-h-0 flex-1 flex-col p-2.5">
          <Paper
            tone="cream"
            rule="none"
            curled={false}
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 pr-2.5 pt-1">
              {tab === 'cards' && (
                <CardsTab unlocked={cards} selected={selectedCard} onSelect={handleSelectCard} />
              )}
              {tab === 'cg' && <CgTab unlocked={cgs} onOpenLightbox={setLightboxCg} />}
              {tab === 'endings' && <EndingsTab reached={endings} />}
              {tab === 'practice' && <PracticeTab onLaunch={setActiveMinigame} />}
            </div>
          </Paper>
        </div>
      </div>

      {lightboxCg && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/85"
          data-testid="cg-lightbox"
          onClick={(e) => {
            e.stopPropagation()
            setLightboxCg(null)
          }}
        >
          <div className="relative h-full w-full">
            <CgArt id={lightboxCg} />
            <button
              type="button"
              className="mat-pass-btn absolute bottom-6 right-6 z-10 px-6 py-2 font-title text-[18px] font-bold"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxCg(null)
              }}
            >
              關閉預覽
            </button>
          </div>
        </div>
      )}

      {activeMinigame && (
        <div className="absolute inset-0 z-50" onClick={(e) => e.stopPropagation()}>
          <MinigameHost
            id={activeMinigame}
            onResolve={(_won, stars) => {
              // practice never touches story flags or rewards; it may only raise the stored best star rating
              if (typeof stars === 'number') useGlobal.getState().setStars(activeMinigame, stars)
              setActiveMinigame(null)
            }}
          />
          <button
            type="button"
            className="hud-pill absolute right-6 top-4 z-40 text-sm"
            data-testid="practice-exit"
            onClick={() => setActiveMinigame(null)}
          >
            離開練習
          </button>
        </div>
      )}
    </div>
  )
}

export default Gallery
