import { useEffect, useState } from 'react'
import { CgArt } from '@/art/cg'
import { CG_IDS, type CgId } from '@/content/cgs'
import { CHECKLIST, CHECKLIST_AREAS, type ChecklistArea } from '@/content/checklist'
import { KNOWLEDGE, KNOWLEDGE_IDS, type KnowledgeId } from '@/content/knowledge'
import { MINIGAMES, MINIGAME_IDS, type MinigameId, type MinigameKind } from '@/content/minigames'
import { MinigameHost } from '@/minigames'
import { BestStars } from '@/minigames/StarRating'
import { useGlobal } from '@/store/global'
import { useUI, type GalleryTab } from '@/store/ui'
import { ENDINGS_META } from '@/systems/ending'
import { CopyChecklistButton } from './sim/CopyChecklistButton'

const TABS: { id: GalleryTab; label: string; testId: string }[] = [
  { id: 'cards', label: '知識卡圖鑑', testId: 'tab-cards' },
  { id: 'cg', label: '回憶相簿', testId: 'tab-cg' },
  { id: 'endings', label: '結局列表', testId: 'tab-endings' },
  { id: 'practice', label: '練習模式', testId: 'tab-practice' },
]

const KIND_META: Record<MinigameKind, { label: string; badgeClass: string }> = {
  quiz: { label: '問答測驗', badgeClass: 'bg-sky/50 text-[#1d4e6b]' },
  spot: { label: '程式除錯', badgeClass: 'bg-sakura/60 text-[#73233b]' },
  serp: { label: '搜尋結果設計', badgeClass: 'bg-mint/70 text-[#1c5944]' },
  placeholder: { label: '練習', badgeClass: 'bg-ink/10 text-ink' },
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
}

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
    return (
      <div className="flex h-full flex-col justify-between gap-4" data-testid="card-detail">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-ink/15 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sakura/50 px-3 py-0.5 text-xs font-bold text-[#73233b]">知識卡</span>
                <span className="rounded-full bg-sky/40 px-2.5 py-0.5 text-xs font-bold text-[#1d4e6b]">{check.area}</span>
              </div>
              <h3 className="mt-1 font-title text-3xl font-bold text-ink">{card.title}</h3>
            </div>
            <button className="btn-pastel" onClick={() => onSelect(null)}>返回列表</button>
          </div>

          <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-ink/60">一句話重點</div>
            <p className="font-title text-xl font-bold text-[#251e38]">{card.summary}</p>
          </div>

          <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-ink/60">詳細說明</div>
            <p className="text-base leading-relaxed text-ink">{card.detail}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-sakura/60 bg-[#fff3f6]/90 p-3.5">
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#9c2b48]">常見誤解</div>
              <p className="text-sm font-medium text-[#5c2032]">{card.misconception}</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50/90 p-3.5">
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-800">實戰檢查清單</div>
              <p className="text-sm font-medium text-emerald-950">{check.action}</p>
            </div>
          </div>
        </div>

        <p className="text-right text-xs text-ink/65">※ 依 2026 年實務，搜尋引擎規則會持續變動。</p>
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink/75">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', ...CHECKLIST_AREAS] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setArea(a)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                area === a ? 'bg-ink text-white' : 'bg-white/75 text-ink hover:bg-white'
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
            className="ml-1 w-40 rounded-full border border-ink/15 bg-white/85 px-3 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-sakura"
          />
        </div>
        <span className="flex items-center gap-2">
          <CopyChecklistButton unlocked={unlocked} label="複製清單" testId="copy-checklist-gallery" toastBelow className="btn-pastel px-3 py-1 text-xs" />
          <span className="rounded-full bg-white/80 px-3 py-1 font-bold text-ink" data-testid="cards-count">
            已收集 {count} / {KNOWLEDGE_IDS.length}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {filteredIds.map((id) => {
          const idx = KNOWLEDGE_IDS.indexOf(id)
          const isUnlocked = unlockedSet.has(id)
          const card = KNOWLEDGE[id]
          const itemArea = CHECKLIST[id].area
          return isUnlocked ? (
            <button
              key={id}
              data-testid={`card-item-${id}`}
              onClick={() => onSelect(id)}
              className="flex flex-col rounded-2xl border border-white/90 bg-white/85 p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sakura hover:bg-white"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#b83b5e]">#{String(idx + 1).padStart(2, '0')}</span>
                <span className="rounded-full bg-sky/35 px-2 py-0.5 text-[10px] font-bold text-[#1d4e6b]">{itemArea}</span>
              </div>
              <span className="mt-0.5 font-title text-lg font-bold text-ink">{card.title}</span>
              <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink/75">{card.summary}</span>
            </button>
          ) : (
            <div
              key={id}
              data-testid={`card-locked-${id}`}
              className="flex flex-col rounded-2xl border border-ink/10 bg-ink/5 p-3.5 text-left opacity-75"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink/45">#{String(idx + 1).padStart(2, '0')}</span>
                <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-ink/50">{itemArea}</span>
              </div>
              <span className="mt-0.5 font-title text-lg font-bold text-ink/50">？？？</span>
              <span className="mt-1 text-xs text-ink/55">{CARD_SOURCES[id] ?? '在劇情或支線中解鎖'}</span>
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
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-ink/75">
        <span>點擊已解鎖的回憶 CG 可全螢幕檢視。</span>
        <span className="rounded-full bg-white/80 px-3 py-1 font-bold text-ink" data-testid="cg-count">
          已收集 {count} / {CG_IDS.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {CG_IDS.map((id) => {
          const isUnlocked = unlockedSet.has(id)
          return isUnlocked ? (
            <button
              key={id}
              data-testid={`cg-thumb-${id}`}
              onClick={() => onOpenLightbox(id)}
              className="group relative h-[162px] w-[288px] overflow-hidden rounded-2xl border-2 border-white/90 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sakura hover:shadow-md"
            >
              <div className="pointer-events-none h-[720px] w-[1280px] origin-top-left scale-[0.225]">
                <CgArt id={id} />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-ink/0 transition group-hover:bg-ink/10" />
            </button>
          ) : (
              <div
                key={id}
                data-testid={`cg-locked-${id}`}
                className="flex h-[162px] w-[288px] flex-col items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-ink/10 px-4 text-center text-ink/45"
              >
                <span className="font-title text-2xl font-bold tracking-widest">LOCKED</span>
                <span className="mt-1 text-xs">{CG_SOURCES[id] ?? '尚未解鎖'}</span>
              </div>
          )
        })}
      </div>
    </div>
  )
}

function EndingsTab({ reached }: { reached: string[] }) {
  const reachedSet = new Set(reached)
  const count = ENDINGS_META.filter((e) => reachedSet.has(e.id)).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-ink/75">
        <span>達成條件依各週累計好感度與選項紀錄判定。</span>
        <span className="rounded-full bg-white/80 px-3 py-1 font-bold text-ink" data-testid="endings-count">
          已達成 {count} / {ENDINGS_META.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {ENDINGS_META.map((meta) => {
          const isReached = reachedSet.has(meta.id)
          return (
            <div
              key={meta.id}
              data-testid={`ending-item-${meta.id}`}
              className={`flex items-center justify-between rounded-2xl border px-5 py-3.5 ${
                isReached
                  ? 'border-white/90 bg-white/85 shadow-sm'
                  : 'border-ink/10 bg-ink/5 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                      isReached ? 'bg-mint text-[#1a523e]' : 'bg-ink/15 text-ink/60'
                    }`}
                  >
                    {isReached ? '已達成' : '尚未達成'}
                  </span>
                  <h3 className="font-title text-xl font-bold text-ink">
                    {isReached ? meta.title : '？？？'}
                  </h3>
                </div>
                <p className="mt-1 text-sm text-ink/75">
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
    <div className="space-y-3">
      <p className="text-sm text-ink/75">
        可單獨重玩主線與支線小遊戲，練習不會影響劇情存檔與屬性；只會更新每個小遊戲的最佳星等（★ 最多三顆）。
      </p>
      <div className="grid grid-cols-2 gap-3">
        {PRACTICE_IDS.map((id) => {
          const kind = MINIGAMES[id].kind
          const km = KIND_META[kind]
          return (
            <button
              key={id}
              data-testid={`practice-${id}`}
              onClick={() => onLaunch(id)}
              className="flex items-center justify-between rounded-2xl border border-white/90 bg-white/85 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sakura hover:bg-white"
            >
              <span className="min-w-0 flex-1 pr-3">
                <span className="block font-title text-base font-bold text-ink">
                  {PRACTICE_LABELS[id] ?? id}
                </span>
                <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${km.badgeClass}`}>
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
      className="absolute inset-0 z-40 flex items-center justify-center bg-ink/45"
      data-testid="gallery-modal"
      onClick={(e) => {
        e.stopPropagation()
        if (!lightboxCg && !activeMinigame) close()
      }}
    >
      <div
        className="glass flex h-[640px] w-[1040px] max-w-[1060px] flex-col rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="圖鑑與回憶相簿"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  data-testid={t.testId}
                  onClick={() => switchTab(t.id)}
                  className={`rounded-full px-5 py-2 font-title text-lg font-bold transition ${
                    active
                      ? 'bg-[#d6334a] text-white shadow-sm'
                      : 'bg-white/75 text-ink hover:bg-white'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
          <button
            className="btn-pastel"
            data-testid="gallery-close"
            onClick={close}
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === 'cards' && (
            <CardsTab unlocked={cards} selected={selectedCard} onSelect={handleSelectCard} />
          )}
          {tab === 'cg' && (
            <CgTab unlocked={cgs} onOpenLightbox={setLightboxCg} />
          )}
          {tab === 'endings' && <EndingsTab reached={endings} />}
          {tab === 'practice' && <PracticeTab onLaunch={setActiveMinigame} />}
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
              className="btn-pastel absolute right-6 bottom-6 z-10 px-6 py-2 text-lg"
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
        <div
          className="absolute inset-0 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <MinigameHost
            id={activeMinigame}
            onResolve={(_won, stars) => {
              // practice never touches story flags or rewards; it may only raise the stored best star rating
              if (typeof stars === 'number') useGlobal.getState().setStars(activeMinigame, stars)
              setActiveMinigame(null)
            }}
          />
          <button
            className="btn-pastel absolute right-6 top-4 z-40"
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
