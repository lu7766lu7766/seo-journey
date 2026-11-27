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

// Card text (plan §3.6 fact sheet). Limits: summary ≤30, detail ≤150, misconception ≤60 characters.
const BODY: Partial<Record<KnowledgeId, Pick<KnowledgeCard, 'summary' | 'detail' | 'misconception'>>> = {
  'what-is-seo-aeo-geo': {
    summary: 'SEO讓人搜得到，AEO讓答案被取用，GEO讓AI願意引用。',
    detail:
      'SEO是讓搜尋引擎找到並理解你的網站；AEO是讓精選摘要、語音助理、AI摘要等答案引擎能直接取用你的清楚答案；GEO是讓生成式搜尋在整理答案時，有機會把你列為引用來源。三者共通的核心，都是有幫助、可信、讀得懂的內容。依2026年實務，規則會持續變動，沒有任何做法能保證排名或被引用。',
    misconception: '常見誤解：做了SEO就一定會被AI引用，或排名第一。',
  },
  'robots-vs-noindex': {
    summary: 'robots.txt管能不能爬，noindex管能不能收錄。',
    detail:
      'robots.txt告訴爬蟲哪些路徑不要抓取，但不保證頁面不被收錄，網址仍可能因外部連結出現。想讓頁面不出現在搜尋結果，要用noindex（meta標籤或X-Robots-Tag）。而且該頁不能被robots.txt擋住，否則爬蟲看不到noindex。',
    misconception: '常見誤解：在robots.txt擋住，頁面就一定不會被收錄。',
  },
  sitemap: {
    summary: 'Sitemap幫助搜尋引擎探索網址，但不保證收錄。',
    detail:
      'Sitemap是列出你希望被探索的網址清單，對新網站、大型網站、更新頻繁的網站特別有用。可以在Search Console或Bing Webmaster Tools提交。它只是幫助發現頁面，是否收錄，仍取決於內容品質與其他因素。',
    misconception: '常見誤解：提交sitemap，網址就會立刻被收錄。',
  },
  'search-console': {
    summary: '站長工具是網站與搜尋引擎之間的健康檢查窗口。',
    detail:
      'Google Search Console與Bing Webmaster Tools能查看哪些頁面已被收錄、哪些有錯誤、使用者用哪些查詢找到你，也能提交sitemap、檢查單一網址。它提供的是診斷資料，不會直接提升排名，但能幫你看到問題在哪裡。',
    misconception: '常見誤解：裝了站長工具，排名就會自動變好。',
  },
  'search-intent': {
    summary: '先想搜尋的人真正想要什麼，再決定寫什麼。',
    detail:
      '搜尋意圖大致可分為想知道（資訊）、想前往（導覽）、想比較或購買（交易）等。同一個詞，不同人可能有不同目的。先觀察搜尋結果頁呈現的是哪一類內容，再決定頁面要回答什麼、用什麼形式，比單純塞進關鍵字有用得多。',
    misconception: '常見誤解：把關鍵字重複越多次，排名就越好。',
  },
  'title-and-meta': {
    summary: '標題與描述前段放重點，搜尋引擎可能自行改寫。',
    detail:
      'title是搜尋結果上的標題，meta description常被用作摘要，兩者都該清楚說明頁面內容、吸引對的人點進來。兩者沒有固定的正確字數，過長可能被截斷，所以重點放在前段。搜尋引擎也可能依查詢改寫顯示內容，不必為此焦慮。',
    misconception: '常見誤解：title一定要剛好60字，否則就會扣分。',
  },
  'answer-first': {
    summary: '先給結論，再補細節，像倒金字塔。',
    detail:
      '答案引擎與忙碌的讀者都偏好直接、清楚的答案。把結論放在段落最前面，再補充理由、例子與例外，既方便人閱讀，也方便系統擷取。一個段落只談一件事，讓每一段都能單獨被理解。',
    misconception: '常見誤解：把答案寫得很短，就一定會被選作精選摘要。',
  },
  'question-headings': {
    summary: '用讀者會問的話當標題，答案緊接在後。',
    detail:
      '把小標題寫成使用者真正會問的問題，例如「404 頁面會影響排名嗎？」，下方立刻用一兩句話回答，再展開說明。這樣的結構讓讀者快速找到答案，也讓答案引擎更容易判斷這段在回答什麼。',
    misconception: '常見誤解：所有標題都改成問句，成效就會變好。',
  },
  'json-ld': {
    summary: 'JSON-LD是用標準格式，把頁面意思說給機器聽。',
    detail:
      'JSON-LD是目前主流的結構化資料寫法，以Schema.org詞彙描述頁面上的組織、活動、文章等實體，放在script標籤中。它能幫機器更準確理解內容，但不保證搜尋結果出現特殊樣式。語法錯誤或類型用錯，都會讓標記失效。',
    misconception: '常見誤解：加了JSON-LD就一定會出現複合式搜尋結果。',
  },
  'schema-visible-match': {
    summary: '標記的內容，必須是使用者在頁面上看得到的。',
    detail:
      '結構化資料要如實反映頁面上可見的內容。標記裡寫的活動日期、價格、評分，頁面上必須也看得到且一致。標記不存在於頁面的資訊，或誇大、虛構的內容，可能被視為違反規範，甚至被人工處理。',
    misconception: '常見誤解：標記裡多寫一點好處，反正使用者看不到。',
  },
  'entity-consistency': {
    summary: '同一個對象，在各處的名稱與資訊要一致。',
    detail:
      '學校、品牌、人物等「實體」，若在網站與外部各處用不同名稱、地址、成立年份，機器就難以確認它們是同一個。統一名稱寫法、補上官方連結與介紹頁，有助於搜尋與生成式引擎正確辨識，也讓讀者更信任。',
    misconception: '常見誤解：名稱寫法不同只是小事，機器都看得懂。',
  },
  'core-web-vitals': {
    summary: '核心指標是LCP、INP、CLS，衡量載入、互動、穩定。',
    detail:
      'LCP看主要內容多快出現，INP看操作後多快有回應（2024年3月取代FID），CLS看畫面有沒有亂跳。改善方式包括壓縮圖片、延遲載入非首屏內容、替圖片預留版位。它是頁面體驗訊號之一，不是排名的萬靈丹。',
    misconception: '常見誤解：指標全綠，排名就會大幅提升。',
  },
  'mobile-first': {
    summary: 'Google以行動版內容為主來收錄與評估網頁。',
    detail:
      'Google採行動版優先索引，主要用手機版頁面的內容來索引與排名。若手機版內容比桌機版少、被隱藏或難以操作，就可能吃虧。確保兩個版本內容與結構化資料一致，並讓按鈕、文字在小螢幕上也好用。',
    misconception: '常見誤解：只要桌機版做得漂亮，手機版隨便就好。',
  },
  'image-optimization': {
    summary: '圖片要夠清楚也要夠輕，才不拖慢載入。',
    detail:
      '依實際顯示尺寸提供圖片，選用適合的現代格式如WebP或AVIF，並設定寬高以避免版面跳動。首屏以外的圖片可延遲載入，但最大的首屏主圖不要延遲，否則LCP會變差。好用的圖片還能被圖片搜尋找到。',
    misconception: '常見誤解：所有圖片都加上延遲載入，速度一定最快。',
  },
  'alt-text': {
    summary: '替代文字，是圖片的文字說明。',
    detail:
      'alt文字讓看不到圖片的人（如使用螢幕閱讀器）與搜尋引擎理解圖片內容。請用自然的一句話描述圖片的重點與用途，裝飾性圖片可留空。不要在alt裡堆砌關鍵字，那既不好讀，也可能被視為濫用。',
    misconception: '常見誤解：在alt塞滿關鍵字，圖片排名就會變好。',
  },
  redirects: {
    summary: '301是永久搬家，302是暫時借道。',
    detail:
      '網址永久搬家時用301，把舊網址指向新網址，讓使用者與搜尋引擎知道以新位置為準；暫時性的調整才用302。頁面真的刪除了，且沒有替代頁，回傳404或410即可，不必一律轉到首頁。轉址鏈越短越好。',
    misconception: '常見誤解：所有失效頁面都該301到首頁。',
  },
  canonical: {
    summary: 'canonical是告訴搜尋引擎，哪一個網址是代表。',
    detail:
      '當多個網址內容相同或高度相似時，可用rel=canonical標示你希望作為代表的網址，幫助整合訊號。它是提示而非指令，搜尋引擎可能選擇不同網址。搭配一致的內部連結與sitemap，效果會更穩定。',
    misconception: '常見誤解：設了canonical，搜尋引擎就一定照辦。',
  },
  'duplicate-content': {
    summary: '重複內容多半是整理問題，不是被處罰。',
    detail:
      '網址參數、列印版、有無www等，會讓同一內容出現在多個網址。搜尋引擎通常會挑一個代表顯示，但可能不是你想要的，也會分散訊號與爬取資源。用301、canonical與一致的內部連結整理即可。',
    misconception: '常見誤解：網站有重複內容，就一定會被處罰。',
  },
  'internal-links': {
    summary: '內部連結是網站內的路標，也是脈絡的說明。',
    detail:
      '清楚的內部連結幫助爬蟲發現頁面，也讓讀者知道下一步去哪。連結文字要描述目標頁面的內容，避免「點這裡」。重要頁面要有被其他頁面連到，孤立頁面較難被發現。連結要自然，不必硬塞。',
    misconception: '常見誤解：連結數量越多越好，不用管內容相不相關。',
  },
  'spam-policies': {
    summary: '違反垃圾內容政策，可能遭降權或人工處罰。',
    detail:
      '常見違規手法有連結計畫、關鍵字堆砌、隱藏文字、cloaking（對爬蟲與使用者展示不同內容）、大規模濫用內容、網站聲譽濫用與過期網域濫用。違規可能由演算法壓低，或被人工處罰，嚴重時從搜尋結果消失。',
    misconception: '常見誤解：只要不被發現，黑帽手法就很安全。',
  },
  'link-schemes': {
    summary: '買賣連結、互換連結，是為了操縱排名的手段。',
    detail:
      '以操縱排名為目的的連結，例如購買連結、大量交換連結、自動產生的連結，屬於連結計畫，違反垃圾內容政策。正當的做法是做出值得被引用的內容，讓他人自然連結。付費或贊助的連結，應標示rel=sponsored或nofollow。',
    misconception: '常見誤解：反向連結買越多，排名就越穩。',
  },
  eeat: {
    summary: 'E-E-A-T是經驗、專業、權威與信任的品質概念。',
    detail:
      'E-E-A-T出現在Google的品質評分員指南，用來評估內容是否可靠，其中以「信任」最重要。具體做法包括標示作者、說明專業或第一手經驗、註明來源、公開聯絡方式。它是評估概念，不是單一的排名分數。',
    misconception: '常見誤解：E-E-A-T是一個可以量測的排名分數。',
  },
  'helpful-content': {
    summary: '寫給人看、真正解決問題的內容，才長久。',
    detail:
      '官方建議以人為本：內容是否有原創資訊、深入分析，是否讓讀完的人能達成目的、不必再搜尋別處。避免只為搜尋引擎而寫、大量改寫他人內容、堆砌字數。先想清楚讀者是誰，再開始寫。',
    misconception: '常見誤解：文章越長，就越被認為有幫助。',
  },
  'core-update': {
    summary: '核心更新是搜尋系統的大規模調整，排名會波動。',
    detail:
      '搜尋引擎會不定期推出核心更新，調整整體評估內容的方式，排名因此上下波動。官方建議不要追逐每一次波動，也沒有單一「修好」的開關。持續改善內容品質、信任與體驗，才是長期方向。',
    misconception: '常見誤解：排名掉了，一定是網站被處罰了。',
  },
  'geo-citations': {
    summary: '生成式搜尋會綜合多個來源，並附上引用。',
    detail:
      'Google AI摘要與AI模式、ChatGPT搜尋、Perplexity、Copilot等，會綜合來源寫出答案並附上引用。提高被引用機會的做法：原創資料、可查證的主張、標明來源、清楚作者與實體資訊，以及讓爬蟲讀得到重要內容（別只靠JS才出現）。沒有方法保證被引用。',
    misconception: '常見誤解：只要照著做，就能保證被AI引用。',
  },
  'original-data': {
    summary: '自己調查的數據，是別人複製不來的資訊增益。',
    detail:
      '原創的調查、實測、案例與第一手資料，能為內容帶來別處沒有的資訊。發布時要說明方法、樣本數與限制，數據才可查證、可被引用。誇大或灌水的數字，會傷害長期信任，得不償失。',
    misconception: '常見誤解：圖表做得漂亮，就算是原創資料。',
  },
  'ai-crawlers': {
    summary: 'AI爬蟲有搜尋用與訓練用，要分開看。',
    detail:
      'GPTBot用於OpenAI訓練，OAI-SearchBot用於ChatGPT搜尋，另有PerplexityBot等。Google-Extended只控管Gemini訓練與grounding，不影響Google搜尋與AI摘要（仍受Googlebot控制）。擋掉搜尋爬蟲可能不出現在該服務結果。',
    misconception: '常見誤解：擋掉Google-Extended，就會從Google搜尋消失。',
  },
  'llms-txt-truth': {
    summary: 'llms.txt只是社群提案，主要引擎尚未確認採用。',
    detail:
      'llms.txt是社群提出的構想，希望提供一份給大型語言模型看的網站摘要。截至目前，主要搜尋引擎並未確認會採用它，因此不要期待它帶來排名或引用。把心力放在清楚的內容、良好結構與可被爬取，仍然更實在。',
    misconception: '常見誤解：放了llms.txt，AI就會優先引用你。',
  },
  'faq-reality': {
    summary: 'FAQ的價值是結構清楚，不是特殊搜尋樣式。',
    detail:
      'Google自2023年起，把FAQ複合式搜尋結果大幅限縮給知名的政府與醫療網站，HowTo複合式結果也已停止顯示。但整理成問答的內容，結構清楚、方便回答，對讀者與答案引擎仍有幫助。請為人而寫，別為特效而加。',
    misconception: '常見誤解：加了FAQ schema，搜尋結果就會出現FAQ。',
  },
  freshness: {
    summary: '時效性，是指讓資訊保持正確，而不是亂改日期。',
    detail:
      '對於賽程、價格、政策等會變動的內容，定期檢查並更新才有價值。更新時請同步修改頁面上可見的日期與實質內容，並保留說明。只改日期、不改內容，不但沒幫助，還可能傷害信任。',
    misconception: '常見誤解：每天改一下更新日期，排名就會變好。',
  },
  'author-pages': {
    summary: '作者頁讓讀者知道，文章是誰寫的、憑什麼寫。',
    detail:
      '作者頁可介紹作者的背景、專長與相關經驗，並連到其代表作品與聯絡方式，讓人判斷可信度。文章頁面也要標示作者，與作者頁互相連結。內容必須真實，虛構的頭銜與經歷，反而會破壞信任。',
    misconception: '常見誤解：放一張大頭貼與頭銜，信任度就自動提升。',
  },
}

export const KNOWLEDGE: Record<KnowledgeId, KnowledgeCard> = Object.fromEntries(
  KNOWLEDGE_IDS.map((id) => [
    id,
    { id, title: KNOWLEDGE_TITLES[id], summary: '', detail: '', misconception: '', ...BODY[id] },
  ]),
) as Record<KnowledgeId, KnowledgeCard>
