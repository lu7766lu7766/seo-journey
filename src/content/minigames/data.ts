import type { MinigameId } from './index'
import type { MinigameDef } from './types'

export const MINIGAME_DATA: Record<MinigameId, MinigameDef> = {
  'demo-quiz': {
    kind: 'quiz',
    title: '新生暖身測驗：SEO／AEO／GEO',
    intro: '先用兩題小測驗，確認大家對三種搜尋優化的基本認識吧！',
    passCount: 1,
    questions: [
      {
        prompt: '關於 SEO、AEO 與 GEO 的關係，下列何者最正確？',
        options: [
          '三者核心都建立在有幫助、可信且機器讀得懂的內容上',
          '只要做了 SEO，就保證會被生成式 AI 引用在第一順位',
          '做了 GEO 之後，就完全不需要讓搜尋引擎爬蟲抓得到網頁',
        ],
        correct: 0,
        explain: 'SEO、AEO、GEO 各有側重，但共通基礎都是清楚、可信、對人有幫助且可被系統讀取的內容；沒有任何做法能保證排名或引用。',
      },
      {
        prompt: '想讓答案引擎與 AI 摘要更快抓到重點，寫作結構建議怎麼安排？',
        options: [
          '先鋪陳長篇故事，把真正結論留到文章最後一段',
          '採用倒金字塔法，先給出明確結論，再補充理由與細節',
          '把同一個關鍵字重複塞進每一句話裡',
        ],
        correct: 1,
        explain: '「結論先說」的倒金字塔寫法能讓讀者與答案引擎在第一時間讀懂核心答案，再視需要往下看細節。',
      },
    ],
  },

  'w1-robots': {
    kind: 'spot',
    title: '第一週健檢：為什麼網站搜尋不到？',
    intro: '凜檢查社團伺服器時發現網站完全沒出現在搜尋結果。請從 robots.txt 與 HTML 標頭中，點出阻礙搜尋引擎爬取與收錄的 2 行錯誤設定！',
    hint: '索老師提示：找找看寫著「Disallow（禁止進入） /」把整個網站門口封住的那一行，以及 HTML 裡寫著「noindex（不收錄）」的那一行！',
    filename: 'robots.txt + index.html (<head>)',
    maxMistakes: 3,
    wrongExplain: '這行設定是正常的，不會阻止整個網站被搜尋到。再找找看哪裡擋住了爬蟲或禁止收錄！',
    summary: 'robots.txt 控制「能不能爬」，noindex 控制「能不能收錄」；如果全站被 Disallow: / 擋住，爬蟲甚至進不來看見頁面上的 noindex。',
    targets: [2, 6],
    lines: [
      { code: '# /robots.txt', explain: '這是註解行，告訴你底下是網站根目錄的 robots.txt 內容。' },
      { code: 'User-agent: *', explain: '這行表示規則套用到所有搜尋引擎爬蟲，本身沒有問題。' },
      {
        code: 'Disallow: /',
        explain: '找到問題 1！「Disallow: /」會封鎖所有爬蟲抓取整個網站，連帶讓爬蟲無法進來讀取頁面內容。',
      },
      { code: 'Sitemap: https://aoba-web.club/sitemap.xml', explain: '列出 Sitemap 位置有助於探索網址，這是正確設定。' },
      { code: '<!-- /index.html -->', explain: '這是 HTML 首頁檔案的區段註解。' },
      { code: '<meta charset="UTF-8" />', explain: '設定 UTF-8 編碼確保繁體中文正常顯示，沒有問題。' },
      {
        code: '<meta name="robots" content="noindex" />',
        explain: '找到問題 2！「noindex」會要求搜尋引擎不要把首頁收錄進搜尋結果索引。',
      },
      { code: '<title>青葉學園 網站研究社｜404 號社辦</title>', explain: '正常的頁面標題，不會阻止收錄。' },
    ],
  },

  'w2-serp': {
    kind: 'serp',
    title: '第二週實戰：社團首頁搜尋結果改寫',
    intro: '幫網站研究社首頁挑選最合適的 Title 與 Meta Description，讓搜進來的同學一眼看懂社團在做什麼！',
    urlPreview: 'https://aoba-web.club/',
    siteName: '青葉學園網站研究社',
    passScore: 75,
    titles: [
      {
        text: '歡迎光臨我們的小天地｜一起努力吧！',
        intentScore: 8,
        clarityScore: 5,
        noSpam: true,
        frontLoaded: false,
        feedback: '太模糊了，看不出是哪所學校、什麼社團或提供什麼內容。',
      },
      {
        text: '青葉學園網站研究社｜SEO・AEO・GEO 學習筆記與社團指南',
        intentScore: 25,
        clarityScore: 15,
        noSpam: true,
        frontLoaded: true,
        feedback: '社團名稱與核心主題放在最前段，意圖明確且閱讀自然！',
      },
      {
        text: '網站研究社 SEO 推薦 排名第一 保證上首頁 免費流量秘笈 必看',
        intentScore: 10,
        clarityScore: 4,
        noSpam: false,
        frontLoaded: true,
        feedback: '關鍵字堆砌加上誇大的「保證排名」字眼，容易讓讀者反感也踩到垃圾內容紅線。',
      },
      {
        text: '這是一份關於私立青葉學園各種課外活動與電腦教室日常紀錄的社團首頁',
        intentScore: 15,
        clarityScore: 9,
        noSpam: true,
        frontLoaded: false,
        feedback: '前半段繞了太多遠路，「網站研究社」放到最後才出現，被截斷時讀者會搞不清楚主題。',
      },
    ],
    descriptions: [
      {
        text: '每週二放學於 404 社辦聚會，分享青葉學園網站研究社的 SEO 健檢實作、知識筆記與新生加入方式。',
        intentScore: 25,
        clarityScore: 15,
        noSpam: true,
        frontLoaded: true,
        feedback: '開門見山交代時間、地點、社團與內容重點，完全符合倒金字塔法！',
      },
      {
        text: '嗨大家好！櫻花飄落的那天我們在舊電腦前面聊了好多夢想，如果你也好奇我們發生了什麼故事，歡迎有空進來坐坐聊聊喔！',
        intentScore: 8,
        clarityScore: 6,
        noSpam: true,
        frontLoaded: false,
        feedback: '像抒情日記一樣沒有先講重點，搜尋的人無法判斷點進去能得到什麼資訊。',
      },
      {
        text: 'SEO 排名第一！保證流量暴增！免費關鍵字、黑帽技巧、學生會網站設計、社團推薦，快點擊連結看最新秘密教學！',
        intentScore: 9,
        clarityScore: 4,
        noSpam: false,
        frontLoaded: true,
        feedback: '充滿誘導點擊與堆砌詞彙，既不誠實也不符網站實際定位。',
      },
      {
        text: '成立於多年前某個學期的這間教室裡擺著一台老舊電腦，記錄著平常成員們一起喝茶與研究網頁設計的點點滴滴，想了解每週聚會時間或報名資訊請拉到最底下查看聯絡表單。',
        intentScore: 14,
        clarityScore: 9,
        noSpam: true,
        frontLoaded: false,
        feedback: '真正有用的時間與報名資訊被埋在最後段，在搜尋結果預覽中很容易被截斷。',
      },
    ],
  },

  'w3-jsonld': {
    kind: 'spot',
    title: '第三週除錯：說給機器聽的 JSON-LD',
    intro: '頁面可見文字寫著：「社團名稱為『青葉學園網站研究社』，聚會地點在 404 社辦」。請找出這段 JSON-LD 結構化資料中的 3 處錯誤（類型錯誤、內容與頁面不一致、語法漏字）！',
    hint: '索老師提示：檢查 1）"@type" 是不是我們社團該用的身分（不是食譜 Recipe！）、2）"name" 是否和頁面校名一致、3）每一欄結尾有沒有漏掉逗號「,」。',
    filename: 'club-schema.jsonld',
    maxMistakes: 3,
    wrongExplain: '這行語法與內容都正確，請比對頁面可見資訊與 JSON 語法規則！',
    summary: 'JSON-LD 必須選對 Schema.org 類型、如實反映頁面上看得到的實體名稱，並且遵守嚴格的 JSON 逗號與括號語法；同時結構化資料並不保證出現複合式搜尋結果。',
    targets: [3, 4, 5],
    lines: [
      { code: '<script type="application/ld+json">', explain: '標準的 JSON-LD script 標籤開頭。' },
      { code: '{', explain: 'JSON 物件開頭大括號，格式正確。' },
      { code: '  "@context": "https://schema.org",', explain: '正確宣告使用 Schema.org 詞彙表。' },
      {
        code: '  "@type": "Recipe",',
        explain: '找到錯誤 1！網站研究社不是「食譜（Recipe）」，應使用 Organization 或 EducationalOrganization 等符合實體的類型。',
      },
      {
        code: '  "name": "Aoba HS 神秘秘密基地",',
        explain: '找到錯誤 2！標記的 name 與頁面上可見的「青葉學園網站研究社」不一致，會造成實體辨識混亂。',
      },
      {
        code: '  "url": "https://aoba-web.club"',
        explain: '找到錯誤 3！這一行結尾缺少逗號「,」，會導致整段 JSON-LD 解析失敗！',
      },
      { code: '  "location": "青葉學園 404 社辦"', explain: '與頁面可見的社辦地點一致，此行本身內容沒問題。' },
      { code: '}', explain: 'JSON 物件結尾大括號，格式正確。' },
      { code: '</script>', explain: 'script 結尾標籤，格式正確。' },
    ],
  },

  'w4-cwv': {
    kind: 'quiz',
    title: '第四週特訓：Core Web Vitals 速度與體驗',
    intro: '校慶前夕大家用手機打開社團網站又慢又會跳動，測驗看看三大核心指標怎麼看、怎麼修！',
    passCount: 2,
    questions: [
      {
        prompt: '2024 年 3 月正式取代 FID 成為 Core Web Vitals 互動性指標的是哪一項？',
        options: ['LCP（最大內容繪製）', 'INP（與下一次繪製的互動）', 'CLS（累計版面配置轉移）'],
        correct: 1,
        explain: 'INP（Interaction to Next Paint）在 2024 年 3 月正式取代 FID，用來衡量使用者操作頁面後的整體反應速度。',
      },
      {
        prompt: '圖片載入後突然把按鈕往下推，導致晴按錯地方——這是哪項指標過高？應該怎麼改善？',
        options: [
          'CLS 過高；應替圖片與嵌入區塊預留明確的 width／height 或長寬比空間',
          'LCP 過高；應該把所有文字改成圖片',
          'INP 過高；應該刪除網站上的所有按鈕',
        ],
        correct: 0,
        explain: '未預留版位導致畫面元件突然跳動，會讓 CLS 飆高；替圖片設定 width／height 或 aspect-ratio 就能有效防止跳動。',
      },
      {
        prompt: '關於 Core Web Vitals 與首屏主要大圖（LCP 元素）的實務觀念，何者正確？',
        options: [
          '只要三大指標全部變綠燈，搜尋排名就一定會升到第一名',
          '為了省流量，首屏最大的主視覺圖片一定要加上 loading="lazy"',
          '應壓縮並提供合適尺寸的圖片、避免對首屏 LCP 主圖延遲載入；CWV 是體驗訊號之一而非萬靈丹',
        ],
        correct: 2,
        explain: '對首屏主圖加 loading="lazy" 反而會拖慢 LCP；此外 CWV 屬於頁面體驗訊號之一，仍需搭配優質內容與整體結構。',
      },
    ],
  },

  'sq-r1': {
    kind: 'quiz',
    title: '學生會委託：轉址與標準網址大考驗',
    intro: '幫凜整理學生會網站改版後的舊公告網址前，先確認 301、302、404/410 與 canonical 的正確用法！',
    passCount: 2,
    questions: [
      {
        prompt: '舊的「社團攤位申請表」網址已永久搬到新版申請表頁面，應該設定什麼？',
        options: [
          'HTTP 301 永久轉址到新版申請表網址',
          'HTTP 302 暫時轉址到網站首頁',
          '直接保留兩邊內容完全不同但同網址的假頁面',
        ],
        correct: 0,
        explain: '永久搬遷且有明確對應新頁面時，應使用 301 永久轉址把使用者與訊號導向新位置；302 只適合暫時調整。',
      },
      {
        prompt: '兩年前早已過期且確定廢除、沒有任何替代頁面的活動公告，刪除後最好回傳什麼狀態碼？',
        options: [
          '全部 301 轉回網站首頁，反正首頁一定有東西看',
          '老實回傳 404（找不到）或 410（已永久移除）',
          '回傳 200 OK 但畫面只寫「已刪除」三個字',
        ],
        correct: 1,
        explain: '沒有替代頁的已刪除頁面不該一律亂轉首頁（容易造成軟 404 混淆），直接回傳 404 或 410 才是誠實且清楚的做法。',
      },
      {
        prompt: '關於 rel="canonical" 標準網址標記，下列敘述何者正確？',
        options: [
          '它是強制指令，設定後搜尋引擎百分之百會完全照做',
          '它是強力的「提示（hint）」而非指令，須搭配一致的內部連結與 Sitemap',
          '它可以取代 301 轉址，用來把已經 404 的壞掉頁面修好',
        ],
        correct: 1,
        explain: 'rel="canonical" 是給搜尋引擎的提示而不是強制指令；若內部連結或訊號彼此矛盾，搜尋引擎仍可能選擇其他網址作為代表。',
      },
    ],
  },

  'sq-r2': {
    kind: 'spot',
    title: '找出重複內容的幽靈分身',
    intro: '同一篇「社團評鑑辦法」（標準網址為 /rules）卻冒出好幾個分身！請從模板與 Sitemap 片段中找出 3 處造成重複內容或訊號分散的錯誤！',
    hint: '索老師提示：只要看到網址尾巴多出「?sort=...」或「?from=...」問號參數的那幾行，就會製造分身喔！',
    filename: 'rules-template.html + sitemap.xml',
    maxMistakes: 3,
    wrongExplain: '這一行是正確指向標準網址 /rules 的寫法，沒有製造分身喔！',
    summary: '網址參數與不一致的內部連結會讓同一篇文章產生多個分身，分散爬取與連結訊號；請讓選單連結、canonical 與 Sitemap 全數指向同一條乾淨標準網址。',
    targets: [1, 4, 7],
    lines: [
      { code: '<!-- rules-template.html (<head>) -->', explain: 'HTML 區段註解，沒有問題。' },
      {
        code: '<link rel="canonical" href="https://aoba-web.club/rules?sort=date" />',
        explain: '找到問題 1！canonical 卻指向帶參數的 ?sort=date 網址，應該指向乾淨的標準網址 /rules。',
      },
      { code: '<nav aria-label="主選單">', explain: '語意化的導覽列標籤，格式良好。' },
      { code: '  <a href="/about">關於我們</a>', explain: '乾淨的標準內部連結，寫法正確。' },
      {
        code: '  <a href="/rules?from=menu">點這裡</a>',
        explain: '找到問題 2！內部連結硬加上 ?from=menu 參數製造重複網址，且錨點文字「點這裡」無法說明目標頁面主題。',
      },
      { code: '</nav>', explain: '導覽列結尾標籤，正常。' },
      { code: '<!-- sitemap.xml -->', explain: 'Sitemap 區段註解，沒有問題。' },
      {
        code: '<loc>https://aoba-web.club/rules?from=menu</loc>',
        explain: '找到問題 3！Sitemap 應該只列出乾淨的標準網址（/rules），不應放入帶追蹤參數的分身網址。',
      },
    ],
  },

  'sq-r3': {
    kind: 'spot',
    title: '凜的秘密貓咪部落格：圖片最佳化健檢',
    intro: '凜的《青葉街角貓咪觀察日記》在手機上載入超慢、滑動還會突然跳動！請找出造成 LCP 變慢或 CLS 跳動的 3 行圖片標籤問題！',
    hint: '索老師提示：找找看 1）檔案巨大 4000px 的舊格式原圖、2）不該對首屏主圖加上的 loading="lazy"、3）少了 width/height 預留空間的小圖！',
    filename: 'eggtart-diary.html',
    maxMistakes: 3,
    wrongExplain: '這一行寫法對圖片載入與版面穩定都有幫助，問題不在這！',
    summary: '圖片最佳化三大重點：轉換成輕量的 WebP／AVIF 並依顯示尺寸縮放、替圖片設定 width／height 預留空間防 CLS、絕對不要對首屏 LCP 主圖加上 loading="lazy"。',
    targets: [2, 3, 6],
    lines: [
      { code: '<article class="cat-diary">', explain: '文章容器標籤，格式正常。' },
      { code: '  <h1>橘貓蛋塔的櫻花樹午睡紀錄</h1>', explain: '清楚的文章主標題，沒有問題。' },
      {
        code: '  <img class="hero" src="/photos/eggtart-4000px.png" width="1200" height="800"',
        explain: '找到問題 1！首圖直接放 4000px 寬未壓縮的巨大 .png 原圖，檔案過大嚴重拖慢行動版載入速度，應縮放尺寸並改用 WebP／AVIF。',
      },
      {
        code: '       loading="lazy" alt="橘貓蛋塔在櫻花樹下翻肚打盹" />',
        explain: '找到問題 2！首屏第一眼看到的 LCP 主圖絕對不能加 loading="lazy"，否則會延後載入、讓 LCP 變差！',
      },
      { code: '  <p>蛋塔今天在四號花圃曬太陽，看起來精神很好。</p>', explain: '正常的文章段落。' },
      { code: '  <!-- 文章下方相簿區 -->', explain: '相簿區段註解。' },
      {
        code: '  <img src="/photos/ink-nap.webp" loading="lazy" alt="黑白貓墨水在長椅打盹" />',
        explain: '找到問題 3！這張圖片缺少 width 與 height 屬性，載入完成瞬間會把下方內容往下推，造成 CLS 版面跳動！',
      },
      { code: '</article>', explain: '文章結尾標籤，格式正常。' },
    ],
  },

  'sq-h1': {
    kind: 'spot',
    title: '料理社委託：食譜網頁與替代文字健檢',
    intro: '頁面上明明寫著「材料：低筋麵粉 200g、無鹽奶油 100g、砂糖 60g；烘烤時間 25 分鐘」。請找出食譜 HTML 與結構化資料中的 3 處錯誤！',
    hint: '索老師提示：看看哪兩張 <img> 的 alt= 寫得不自然或空白，以及 JSON-LD 裡誰的材料與「低筋麵粉／砂糖」不符！',
    filename: 'cookie-recipe.html',
    maxMistakes: 3,
    wrongExplain: '這一行寫法符合食譜頁面與無障礙規範，再檢查其他圖片 alt 與 JSON-LD 欄位！',
    summary: '有意義的內容圖片要寫自然具體的 alt（不可留空也不可塞關鍵字），裝飾圖片才留空；Recipe 結構化資料必須與頁面實際顯示的材料和時間一致。',
    targets: [2, 4, 8],
    lines: [
      { code: '<h1>香酥手工奶油餅乾食譜</h1>', explain: '清楚的食譜標題，沒有問題。' },
      { code: '<p>準備材料：低筋麵粉 200g、無鹽奶油 100g、砂糖 60g</p>', explain: '清楚列出材料與份量，格式正確。' },
      {
        code: '<img src="/img/cookie-finish.webp" width="800" height="600" alt="" />',
        explain: '找到問題 1！這是主角餅乾成品照而非純裝飾邊框，alt 卻留空，讓視障讀者與搜尋引擎看不懂照片內容。',
      },
      { code: '<ol><li>將奶油拌勻打發</li><li>加入過篩麵粉烤 25 分鐘</li></ol>', explain: '使用有序清單 <ol> 呈現製作步驟，結構清楚！' },
      {
        code: '<img src="/img/cookie-dough.webp" width="800" height="600" alt="餅乾 食譜 甜點 必吃 推薦 美食 烘焙" />',
        explain: '找到問題 2！alt 塞滿無關的關鍵字堆砌，既不好讀也可能被視為垃圾內容濫用，應該用一句自然的話描述圖片。',
      },
      { code: '<script type="application/ld+json">', explain: 'JSON-LD 標籤開頭。' },
      { code: '{ "@context": "https://schema.org", "@type": "Recipe",', explain: '食譜頁面使用 @type: "Recipe" 是正確的類型。' },
      { code: '  "name": "香酥手工奶油餅乾",', explain: '與頁面標題一致，沒有問題。' },
      {
        code: '  "recipeIngredient": ["松露奶油 100g", "食用金箔 2片"] }',
        explain: '找到問題 3！結構化資料寫的材料跟頁面上可見的低筋麵粉、砂糖完全不符合，標記必須與可見內容一致！',
      },
      { code: '</script>', explain: 'JSON-LD 結束標籤。' },
    ],
  },

  'sq-h2': {
    kind: 'serp',
    title: '籃球社委託：2026 春季地區決賽賽程摘要',
    intro: '地區決賽週末就要開打，幫籃球社挑選最符合「搜賽程」意圖、具備時效性且重點前置的 Title 與 Meta Description！',
    urlPreview: 'https://aoba-sports.club/basketball/2026-spring',
    siteName: '青葉高中籃球社',
    passScore: 75,
    titles: [
      {
        text: '籃球社最新公告(3)｜歡迎大家週末一起來加油喔',
        intentScore: 8,
        clarityScore: 6,
        noSpam: true,
        frontLoaded: false,
        feedback: '沒寫年份、賽事名稱與「賽程」，同學分不清是今年還是去年的舊公告。',
      },
      {
        text: '2026 春季地區決賽賽程｜青葉高中籃球社時間與場館一覽',
        intentScore: 25,
        clarityScore: 15,
        noSpam: true,
        frontLoaded: true,
        feedback: '年份、賽事、賽程與場館資訊全部放在前段，精準回應搜尋意圖！',
      },
      {
        text: '2026 籃球 賽程 冠軍 必勝 直播 免費看 熱門運動 推薦 比賽',
        intentScore: 9,
        clarityScore: 4,
        noSpam: false,
        frontLoaded: true,
        feedback: '關鍵字堆砌加上與官方賽程頁不符的誘導字詞，會降低可信度並違反規範。',
      },
      {
        text: '關於青葉高中籃球社創社三十年來的熱血精神與本學期地區決賽的完整出賽賽程公告',
        intentScore: 15,
        clarityScore: 8,
        noSpam: true,
        frontLoaded: false,
        feedback: '前半段在講社團歷史，「賽程」與年份都被擠到後半段，極易被截斷。',
      },
    ],
    descriptions: [
      {
        text: '2026/04/18（六）14:00 於青葉體育館開打，對戰櫻丘高中。內附對戰賽程表、入場應援規定與更新日期（2026/04/12 更新）。',
        intentScore: 25,
        clarityScore: 15,
        noSpam: true,
        frontLoaded: true,
        feedback: '開頭直接給出比賽日期、時間、場館與對手，並標明更新日期確認時效性，完美！',
      },
      {
        text: '從去年拿下縣大賽八強後，隊員每天揮汗練習到太陽下山，今年大家也充滿鬥志，想認識每位先發球員的故事與球衣背號就點進來看看吧！',
        intentScore: 8,
        clarityScore: 7,
        noSpam: true,
        frontLoaded: false,
        feedback: '完全沒交代幾點比賽、在哪裡打，不符合找「賽程」的即時需求。',
      },
      {
        text: '保證贏球！最新籃球賽程免費看、場邊福利、冠軍預測、裝備團購折扣碼大公開，不點進來絕對後悔！',
        intentScore: 7,
        clarityScore: 4,
        noSpam: false,
        frontLoaded: false,
        feedback: '標題黨加上與賽程無關的商業推銷話術，嚴重破壞官方頁面信任感。',
      },
      {
        text: '本頁記錄歷屆籃球社隊員名單、社費繳交辦法以及球衣清洗注意事項，若要查詢 2026 春季地區決賽的開賽時間與比賽場館，請先閱讀上方規範後再下拉觀看附表。',
        intentScore: 14,
        clarityScore: 8,
        noSpam: true,
        frontLoaded: false,
        feedback: '真正關鍵的時間與地點放到預覽後段才提，忙碌的觀眾可能還沒看到就被截斷了。',
      },
    ],
  },

  'sq-h3': {
    kind: 'quiz',
    title: '廣播社委託：問答專欄與 FAQ 的正確寫法',
    intro: '把《校園一問一答》變成文字版問答專欄時，該怎麼設計標題、答案長度與對 FAQ 複合結果的期待？',
    passCount: 2,
    questions: [
      {
        prompt: '設計對答案引擎友善的「問題型標題」段落，最理想的架構是？',
        options: [
          '用讀者常問的完整問題當小標題，緊接 40～60 字的直接答案，第二段再補背景細節',
          '小標題只寫「問題一」，答案用三百字散文慢慢鋪陳最後才揭曉',
          '把十個完全不同主題的問題全部塞進同一個長段落裡',
        ],
        correct: 0,
        explain: '問題型標題對應真實提問，緊接簡潔明確的結論，並維持一段一主題，最方便讀者掃描與答案引擎擷取。',
      },
      {
        prompt: '關於在網頁加入 FAQ 結構化資料的現實情況，下列何者符合實務事實？',
        options: [
          '只要加上 FAQ JSON-LD，Google 搜尋結果就一定會展開折疊問答盒',
          'Google 自 2023 年起已把 FAQ 複合結果大幅限縮給知名政府與醫療網站；做 FAQ 的價值在於結構清楚、方便回答',
          '加了 FAQ 標記會讓網頁被判定為重複內容而遭處罰',
        ],
        correct: 1,
        explain: 'Google 已大幅限縮 FAQ 複合式搜尋結果（HowTo 複合式結果也已停止顯示），因此寫 FAQ 是為了讓內容結構清楚、好讀好答，而非保證特效。',
      },
      {
        prompt: '針對「社團經費怎麼申請？」這個問題，下列哪一段放在第一段最符合 AEO 精神？',
        options: [
          '「其實社團經費制度的沿革可以追溯到青葉學園創校初期，當時前輩們為了爭取預算……」',
          '「申請方式其實很簡單喔，大家不用緊張，只要照著學校的流程一步一步做就可以了！」',
          '「請於每月 10 日前至學生會網站下載申請表，填妥並附上單據後交給學生會長審核。」',
        ],
        correct: 2,
        explain: '直接交代期限、管道、表單與繳交對象，四十餘字就讓發問者直接得到可執行的答案。',
      },
    ],
  },

  'sq-m1': {
    kind: 'spot',
    title: '圖書館委託：消滅校史實體矛盾',
    intro: '校史館紙本檔案確認的標準資料為：「青葉學園」、「1982 年創校」、「青葉區四丁目 12 號」。請找出網頁與頁尾中寫得不一致的 3 處錯誤！',
    hint: '索老師提示：一行一行核對校名是不是「青葉學園」、創校年是不是「1982」、地址是不是「青葉區四丁目 12 號」！',
    filename: 'aoba-history.html',
    maxMistakes: 3,
    wrongExplain: '這一行與校史館標準資料（青葉學園／1982 年／青葉區四丁目 12 號）完全一致！',
    summary: '實體（Entity）在網頁標題、內文、頁尾與 JSON-LD 中的名稱、年份、地址必須一致，搜尋與生成式模型才不會把資訊混雜甚至張冠李戴。',
    targets: [1, 3, 6],
    lines: [
      { code: '<!DOCTYPE html><html lang="zh-Hant">', explain: '正確宣告繁體中文網頁語系。' },
      {
        code: '<h1>青葉高中 校史沿革</h1>',
        explain: '找到矛盾 1！正式名稱應統一為「青葉學園」，混用「青葉高中」會讓機器誤判成不同實體。',
      },
      { code: '<p>青葉學園自創立以來，陪伴無數學子度過青春歲月。</p>', explain: '正確使用了標準校名「青葉學園」。' },
      {
        code: '<p>本校創校於 1985 年，累積數十年人文底蘊。</p>',
        explain: '找到矛盾 2！校史館紀錄為 1982 年創校，此處誤植為 1985 年，是造成 AI 回答錯誤年代的主因！',
      },
      { code: '<script type="application/ld+json">', explain: 'JSON-LD 標籤開頭。' },
      { code: '{"@context":"https://schema.org","@type":"School","name":"青葉學園","foundingDate":"1982"}</script>', explain: '這段 JSON-LD 的校名與創校年份都符合標準資料，寫法正確。' },
      {
        code: '<footer>校址：山櫻區四段 12 號｜電話：(02) 2345-6789</footer>',
        explain: '找到矛盾 3！正確校址應為「青葉區四丁目 12 號」，這裡寫成了錯誤的行政區與路名！',
      },
    ],
  },

  'sq-m2': {
    kind: 'quiz',
    title: '天文社委託：分清楚各種 AI 爬蟲',
    intro: '天文社希望觀星報告能被 AI 搜尋引用，但不希望未授權照片拿去訓練模型。請做出正確的爬蟲判斷！',
    passCount: 2,
    questions: [
      {
        prompt: '關於 GPTBot 與 OAI-SearchBot 的差別，下列何者正確？',
        options: [
          'GPTBot 主要用於 OpenAI 模型訓練；OAI-SearchBot 則用於 ChatGPT 搜尋與引用',
          '兩者完全一樣，只要擋掉其中一個就等於全部封鎖',
          'OAI-SearchBot 只負責抓圖片，GPTBot 只負責抓文字',
        ],
        correct: 0,
        explain: '訓練用爬蟲（如 GPTBot）與搜尋用爬蟲（如 OAI-SearchBot、PerplexityBot）分工不同，可在 robots.txt 分別設定規則。',
      },
      {
        prompt: '如果在 robots.txt 封鎖 Google-Extended，會對 Google 傳統搜尋結果造成什麼影響？',
        options: [
          '整個網站會立刻從 Google 搜尋索引中消失',
          '不會影響 Google 搜尋的收錄與排名，它只控管是否用於 Gemini 訓練與 grounding',
          '會讓網頁載入速度變慢，Core Web Vitals 變紅燈',
        ],
        correct: 1,
        explain: '依官方說明，Google-Extended 用於控管內容是否用於 Gemini 模型訓練與 grounding，不影響 Google 搜尋排名與收錄。',
      },
      {
        prompt: '若天文社全面在 robots.txt 寫 Disallow: / 並擋掉 OAI-SearchBot 與 PerplexityBot，會發生什麼事？',
        options: [
          '網站變安全了，而且各家 AI 搜尋反而會更積極引用他們',
          '可能導致一般搜尋引擎與這些 AI 搜尋服務抓不到頁面，進而不出現在搜尋結果與引用中',
          '只要加上 llms.txt 就能自動繞過 robots.txt 讓 AI 引用',
        ],
        correct: 1,
        explain: '擋掉搜尋用爬蟲可能讓你不出現在該服務的搜尋與引用結果中；想保留部分公開、部分不訓練，應針對個別 User-agent 精準設定。',
      },
    ],
  },

  'sq-m3': {
    kind: 'quiz',
    title: '未來的考題：原創性與被引用之道',
    intro: '什麼樣的內容才能稱得上具備「資訊增益」，而不是別人文章的複製品？來回答未來的三道提問吧！',
    passCount: 2,
    questions: [
      {
        prompt: '下列哪一種做法最能為一篇「青葉天台觀星指南」帶來真正的「資訊增益（Information Gain）」？',
        options: [
          '把網路上排名前十的觀星文章丟進工具改寫成一篇綜合摘要',
          '記錄自己十個夜晚在青葉天台實測的光害變化、器材參數與真實觀察心得',
          '把同樣的星座定義重複寫三次來拉長文章字數',
        ],
        correct: 1,
        explain: '第一手的實測數據、真實經驗與他人未曾提供的新觀察，才是無法被輕易複製的原創價值與資訊增益。',
      },
      {
        prompt: '在文章裡引用外部公開天文數據時，怎樣的寫法最能兼顧可信度與 GEO 表現？',
        options: [
          '直接抄來當成自己的發現，不要提原始來源比較像專家',
          '只貼一張沒有說明樣本與方法的漂亮圖表就夠了',
          '清楚標明可查證的原始來源出處，並補充自己的分析、比較或實測結果',
        ],
        correct: 2,
        explain: '標明可查證的來源能提升信任與E-E-A-T，再結合自身原創見解與清楚作者資訊，才容易成為值得信賴的來源。',
      },
      {
        prompt: '關於在網站放上 llms.txt 或優化 GEO 的預期，下列何者是正確的認知？',
        options: [
          '只要放了 llms.txt 並完成檢查清單，就能保證一定被 AI 摘要引用',
          'llms.txt 目前只是社群提案，主要搜尋引擎並未確認採用；也沒有任何做法能保證被 AI 引用',
          '生成式引擎只看 llms.txt，完全不看一般網頁 HTML 內容',
        ],
        correct: 1,
        explain: 'llms.txt 尚未獲主要搜尋引擎確認採用；做好原創資料、清楚主張、可查證來源與可爬取內容能提高機會，但沒有任何方法能保證被引用。',
      },
    ],
  },

  'sq-x1': {
    kind: 'quiz',
    title: '流量學院戰帖：拆穿黑帽垃圾內容手法',
    intro: '黑川翔端出了幾種號稱「快速衝流量」的黑帽手法，你能精準辨識出它們分別違反了哪一項垃圾內容政策嗎？',
    passCount: 3,
    questions: [
      {
        prompt: '花錢購買 1,000 條外部反向連結、或組成大型互換連結網路來操縱排名，這屬於什麼手法？',
        options: ['合理的數位公關', '連結計畫（Link schemes）', '標準網址整合'],
        correct: 1,
        explain: '以操縱排名為目的買賣連結或過度交換連結，屬於「連結計畫」，明確違反搜尋引擎垃圾內容政策。',
      },
      {
        prompt: '偵測到是搜尋引擎爬蟲時回傳塞滿關鍵字的頁面，真人訪客進來卻看到完全不同的廣告頁——這叫什麼？',
        options: ['偽裝（Cloaking）', '行動版優先索引', '倒金字塔摘要'],
        correct: 0,
        explain: '刻意對爬蟲與人類使用者展示不同內容以欺騙搜尋系統，稱為 Cloaking（偽裝），屬於嚴重違規手法。',
      },
      {
        prompt: '高權重的大網站把子目錄租給第三方，專門用來放與主站毫無關係的優惠券或借貸評比賺流量，這是什麼違規？',
        options: ['網站聲譽濫用（Site reputation abuse）', '實體一致性維護', '內部連結優化'],
        correct: 0,
        explain: '借用主站既有的信任度與聲譽來託管低監督、無關的第三方變現頁面，屬於「網站聲譽濫用」。',
      },
      {
        prompt: '用 AI 批量改寫別人的文章、一天產生 500 頁沒有原創價值又重複空洞的頁面來搶關鍵字，這違反哪一項？',
        options: ['結構化資料標記', '大規模濫用內容（Scaled content abuse）', 'Sitemap 提交規範'],
        correct: 1,
        explain: '無論人工或自動化工具，只要大量產生無實質幫助的低品質頁面來操縱排名，都屬於「大規模濫用內容」，可能遭降權或人工處罰。',
      },
    ],
  },
}
