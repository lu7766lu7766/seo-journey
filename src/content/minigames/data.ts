import type { MinigameId } from './index'
import type { MinigameDef } from './types'

export const MINIGAME_DATA: Record<MinigameId, MinigameDef> = {
  'demo-quiz': {
    kind: 'quiz',
    title: '新生暖身測驗：SEO／AEO／GEO',
    intro: '先用兩題小測驗，確認大家對三種搜尋優化的基本認識吧！',
    hint: '索老師提示：不管叫 SEO、AEO 還是 GEO，最後都是在回答同一件事——讀者與機器，能不能輕鬆找到、讀懂、信任這個頁面？',
    passCount: 1,
    questions: [
      {
        prompt: '凜問：「SEO、AEO、GEO 聽起來像三件不同的事，要分成三組人各做各的嗎？」你會怎麼回答？',
        options: [
          '不用分開做：SEO 做好了，AEO 和 GEO 自然也會跟著進步',
          '基本功相通：內容有幫助、可信，而且網頁能被機器順利讀取',
          '各自獨立：GEO 是寫給 AI 看的，網頁能不能被爬取不太重要',
        ],
        correct: 1,
        explain:
          '三者各有側重，但共同基礎是有幫助、可信、機器讀得懂的內容。「SEO 做好就自動搞定」忽略了答案與引用的寫法差異；「GEO 不用被爬取」則錯在 AI 搜尋同樣需要抓得到頁面。沒有任何做法能保證排名或引用。',
      },
      {
        prompt: '社團介紹頁希望 AI 摘要與語音助理能快速抓到重點，段落怎麼安排比較好？',
        options: [
          '先交代社團創立的完整歷史，讓讀者循序漸進讀到答案',
          '在每段開頭都重複一次主要關鍵字，幫機器標示這段的主題',
          '先用一兩句話講結論，再用後面的段落補充理由與細節',
        ],
        correct: 2,
        explain:
          '「結論先說」讓讀者與答案引擎第一眼就看到重點。先講歷史會把答案埋在後面；每段重複關鍵字只會讓文字不自然，也不是幫助機器理解的好方法。',
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
    hint: '索老師提示：想像搜尋結果只看得到前半段——哪一組一眼就讓同學知道「這是什麼社團、能找到什麼」？再留意有沒有誇大承諾或堆砌的字眼。',
    passScore: 72,
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
    hint: '索老師提示：三項指標各管一件事——載入多快（LCP）、操作多快有反應（INP）、畫面穩不穩（CLS）。先判斷題目在描述哪一件事，再比對數字有沒有超過門檻。',
    passCount: 3,
    questions: [
      {
        prompt: '手機點下「報名」按鈕後，畫面卡了將近一秒才有反應。這在量的是哪一項指標（2024 年 3 月起取代 FID 的那一項）？',
        options: [
          'INP：使用者操作頁面後，畫面多久給出回應',
          'LCP：頁面上最大的內容，多久完成載入顯示',
          'CLS：載入過程中，版面元素有沒有突然位移',
        ],
        correct: 0,
        explain:
          'INP 看的是互動後的反應速度，2024 年 3 月正式取代 FID。LCP 量的是主要內容出現的速度，CLS 量的是版面穩不穩，都不是「點了沒反應」這件事。',
      },
      {
        prompt: '檢測報告寫著：LCP 3.4 秒、INP 150 毫秒、CLS 0.05。官方「良好」標準是 LCP ≤ 2.5 秒、INP ≤ 200 毫秒、CLS ≤ 0.1，該先處理哪一項？',
        options: [
          '先處理 INP：150 毫秒已經非常接近 200 毫秒的門檻了',
          '先處理 CLS：0.05 是三個數字裡最小的，代表版面最不穩',
          '先處理 LCP：3.4 秒超過 2.5 秒的門檻，是唯一不及格的',
        ],
        correct: 2,
        explain:
          '只有 LCP 超出良好門檻。INP 與 CLS 都在門檻內，而且 CLS 數字越小代表越穩定。另外，Core Web Vitals 只是頁面體驗訊號之一，達標不代表排名一定上升。',
      },
      {
        prompt: '文章頂部的圖片載入完成後，把下方的「報名」按鈕往下推，晴差點按錯。比較合理的修法是？',
        options: [
          '把圖片壓縮得更小，載入夠快就不會再推擠到下面的按鈕，版面自然穩定',
          '替圖片設定 width／height，先預留好版面空間',
          '把按鈕改成用 JavaScript 動態產生，等圖片載完再放進頁面',
        ],
        correct: 1,
        explain:
          '版面跳動的根源是「沒預留位置」，預留圖片空間才能治本。壓縮圖片能改善載入速度（LCP），但圖片一出現仍會推擠；動態插入按鈕反而更容易造成位移。',
      },
      {
        prompt: '首頁最上方有一張大型主視覺圖片，想讓 LCP 表現更好，載入方式該怎麼設定？',
        options: [
          '首屏的主圖不要延遲載入，並提供大小合適、壓縮過的圖片',
          '加上 loading="lazy"，讓瀏覽器等有空時再慢慢載入',
          '直接放最高解析度的原圖，避免畫面模糊影響整體觀感',
        ],
        correct: 0,
        explain:
          '首屏最大的 LCP 圖片應該盡早載入，延遲載入只會讓 LCP 變慢。懶載入適合畫面下方的圖片；放超大原圖則會讓檔案過大，拖慢行動版載入。',
      },
    ],
  },

  'sq-r1': {
    kind: 'quiz',
    title: '學生會委託：轉址與標準網址大考驗',
    intro: '幫凜整理學生會網站改版後的舊公告網址前，先確認 301、302、404/410 與 canonical 的正確用法！',
    hint: '索老師提示：先問自己——這個頁面是「永久搬家」、「暫時改版」，還是「真的消失了」？不同情況，要給搜尋引擎不同的訊號。',
    passCount: 2,
    questions: [
      {
        prompt: '舊的「社團攤位申請表」網址已永久搬到新版申請表頁面，舊連結要怎麼處理？',
        options: [
          '舊頁保持原樣，另外在新頁放上相同內容，兩邊都開放給人看',
          '設 301 永久轉址，指向新版申請表頁面',
          '設 302 暫時轉址，等確定不會再改了再換成永久轉址',
        ],
        correct: 1,
        explain:
          '永久搬家且有對應新頁，就該用 301。302 代表「暫時」，會讓搜尋引擎猶豫該保留哪個網址；兩邊都留相同內容則會製造重複頁面。',
      },
      {
        prompt: '兩年前的活動公告已確定廢止，也沒有任何替代頁面，刪掉之後伺服器該怎麼回應？',
        options: [
          '統一用 301 轉到首頁，讓舊連結累積的價值都集中在首頁上',
          '回傳 200，頁面內容改成「此公告已刪除」的簡短說明',
          '回傳 404 或 410，明確告訴爬蟲這個頁面已經不存在',
        ],
        correct: 2,
        explain:
          '沒有替代頁時，誠實回報 404／410 最清楚。一律轉首頁容易被視為軟 404，也讓讀者困惑；回傳 200 卻只寫「已刪除」同樣是軟 404，搜尋引擎仍會當成正常頁面。',
      },
      {
        prompt: '「/rules」與「/rules?from=menu」內容相同。想讓搜尋引擎知道首選網址是 /rules，下列哪個做法最合理？',
        options: [
          '兩頁都用 canonical 指向 /rules，所有內部連結與 Sitemap 也統一用它',
          '只要在帶參數的頁面寫了 canonical，搜尋引擎一定只會收錄 /rules',
          '用 robots.txt 擋掉帶參數的網址，這樣就不用再寫 canonical 標記了',
        ],
        correct: 0,
        explain:
          'canonical 是「提示」不是指令，要搭配一致的內部連結與 Sitemap 才有說服力，所以不能說「一定」。用 robots.txt 擋掉參數網址，爬蟲反而看不到頁面上的 canonical。',
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
    hint: '索老師提示：搜賽程的人最想先知道什麼？時間、地點、年份有沒有排在最前面？時效性也別忘了確認。',
    passScore: 72,
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
    hint: '索老師提示：發問的人只想最快得到答案——哪種寫法讓他一眼就讀到？另外別忘了，沒有任何標記能保證搜尋結果出現特殊樣式。',
    passCount: 2,
    questions: [
      {
        prompt: '廣播社要把每集內容改寫成文字專欄，每個問答段落怎麼安排，最方便讀者與答案引擎擷取？',
        options: [
          '小標題用有創意的比喻吸引目光，答案放到第三段再揭曉',
          '小標題統一寫成「常見問題」，把各個問答合併成一整段連續的文字',
          '小標題用同學真的會問的問題，接著一兩句直接答案，再補細節',
        ],
        correct: 2,
        explain:
          '問題型標題對應真實提問，緊接一到兩句簡短的直接答案（沒有官方規定的字數），再補背景。比喻標題讓人看不出這段在回答什麼；全部擠成一段則失去「一段一主題」的結構。',
      },
      {
        prompt: '社長說：「只要加上 FAQ 結構化資料，Google 搜尋結果就會展開問答框。」你怎麼回應比較正確？',
        options: [
          '一般網站仍有機會獲得 FAQ 複合結果，只是要等搜尋引擎重新爬取並更新',
          'FAQ 複合結果自 2023 年起大幅限縮，寫 FAQ 的價值在於結構清楚',
          'FAQ 標記容易被判定成重複內容，所以最好不要在頁面上額外加入 FAQ',
        ],
        correct: 1,
        explain:
          '2023 年起 FAQ 複合結果幾乎只留給知名的政府與醫療網站（HowTo 也已停止顯示），所以做 FAQ 是為了讓內容清楚好回答。「等爬取就會出現」是過時的說法；FAQ 標記也不會被當成重複內容處罰。',
      },
      {
        prompt: '針對「社團經費怎麼申請？」，下列哪一段放在第一段，最能讓發問的人直接得到答案？',
        options: [
          '每月 10 日前到學生會網站下載申請表，附上單據交給學生會長審核。',
          '申請方式很簡單，請依照學校規定的流程辦理，若有疑問歡迎隨時來信詢問。',
          '社團經費制度從創校初期就已存在，歷經多次修訂，目前相當完善。',
        ],
        correct: 0,
        explain:
          '第一段直接交代期限、管道、表單與對象，就是可執行的答案。第二段聽起來親切卻沒有任何具體步驟；第三段在講歷史，都沒有回答「怎麼申請」。',
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
    hint: '索老師提示：每個爬蟲都有自己的 User-agent 名稱與用途——先分清楚它是來「訓練」、來「搜尋」，還是專門管 Google 的 AI 用途。',
    passCount: 2,
    questions: [
      {
        prompt: '天文社希望觀星報告能出現在 ChatGPT 搜尋的引用裡，又不想照片被拿去訓練模型。robots.txt 該怎麼設定？',
        options: [
          '分開設定：GPTBot 設 Disallow，OAI-SearchBot 維持允許',
          '兩者是同一支爬蟲的不同別名，封鎖其中一個就同時管到兩種用途',
          '寫一行 noai 指令，所有 AI 搜尋與訓練爬蟲都會統一遵守',
        ],
        correct: 0,
        explain:
          'GPTBot 用於 OpenAI 模型訓練，OAI-SearchBot 用於 ChatGPT 搜尋，兩者要分別設定。它們不是別名；robots.txt 也沒有通用的 noai 指令，要針對各自的 User-agent 寫規則。',
      },
      {
        prompt: '社員擔心：「在 robots.txt 封鎖 Google-Extended，網站就會從 Google 搜尋消失。」正確的說法是？',
        options: [
          '會消失：Google-Extended 就是 Googlebot 的另一個名字',
          '不會消失，但排名會稍微下降，因為沒有配合 Google 的 AI 功能',
          '不會影響搜尋：它只控管內容是否用於 Gemini 訓練與 grounding',
        ],
        correct: 2,
        explain:
          'Google-Extended 是獨立的控制項，管的是 Gemini 的訓練與 grounding，不影響 Google 搜尋的收錄與排名。它不是 Googlebot 的別名，也不會因為封鎖而被降排名。',
      },
      {
        prompt: '天文社為了「安全」，在 robots.txt 對所有爬蟲寫 Disallow: /，同時還想被 AI 搜尋引用。結果會是？',
        options: [
          '搜尋用爬蟲會改讀 llms.txt，所以被引用的機會不受影響',
          '頁面抓取不到，但搜尋結果裡完全不可能出現這個網址',
          '搜尋與 AI 爬蟲讀不到頁面，較難出現在搜尋結果與引用中',
        ],
        correct: 2,
        explain:
          '擋掉搜尋用爬蟲，等於不讓它們讀內容，自然較難被引用。llms.txt 只是社群提案，不能取代 robots.txt；而 robots.txt 只控制爬取，被別處連結的網址仍可能被收錄，要排除收錄應使用 noindex。',
      },
    ],
  },

  'sq-m3': {
    kind: 'quiz',
    title: '未來的考題：原創性與被引用之道',
    intro: '什麼樣的內容才能稱得上具備「資訊增益」，而不是別人文章的複製品？來回答未來的三道提問吧！',
    hint: '索老師提示：想想別人讀完你的文章，能得到什麼「在別處找不到」的東西？還有，沒有任何做法能保證被 AI 引用。',
    passCount: 2,
    questions: [
      {
        prompt: '要寫《青葉天台觀星指南》，下列哪個做法最能帶來真正的「資訊增益」？',
        options: [
          '把排名前十的觀星文章整理成一篇更完整的懶人包',
          '記錄自己十個夜晚在天台的光害、器材設定與實拍結果',
          '每個段落都擴寫得更長，補上更多星座背景與專有名詞',
        ],
        correct: 1,
        explain:
          '第一手的實測與觀察是別處沒有的新資訊。整理別人的內容只是重新排列，擴寫字數也不會增加新資訊，兩者都容易被其他文章取代。',
      },
      {
        prompt: '文章要用到外部機構公開的天文數據，怎麼寫最能兼顧可信度與被引用的機會？',
        options: [
          '標明可查證的來源，並補上自己的比較或實測說明',
          '用自己的話重新改寫並省略來源，讀起來比較像原創',
          '文末集中放一長串參考連結，內文不必逐項對應數據',
        ],
        correct: 0,
        explain:
          '可查證的出處加上自己的分析，讀者與系統才知道數據從哪來、你又多做了什麼。省略來源會失去可信度；只在文末堆連結，讀者無法判斷哪個數據對應哪個來源。',
      },
      {
        prompt: '同學提議：「放一份 llms.txt，AI 就會優先引用我們的網站。」你怎麼回應？',
        options: [
          'Google 已宣布支援，放了之後被引用的機率會明顯提高',
          '可以放，但要記得在 robots.txt 裡註明，AI 才會去讀它',
          '它只是社群提案，主要搜尋引擎未確認採用，沒有任何做法能保證引用',
        ],
        correct: 2,
        explain:
          '目前 llms.txt 只是提案，主要搜尋引擎並未確認採用，不要期待它帶來引用。真正有幫助的是原創資料、可查證的主張、清楚的實體資訊與可被爬取的內容；沒有任何方法能保證被引用。',
      },
    ],
  },

  'sq-x1': {
    kind: 'quiz',
    title: '流量學院戰帖：拆穿黑帽垃圾內容手法',
    intro: '黑川翔端出了幾種號稱「快速衝流量」的黑帽手法，你能精準辨識出它們分別違反了哪一項垃圾內容政策嗎？',
    hint: '索老師提示：先看手法的「目的」——是為了幫讀者，還是為了操縱排名？再對照各種垃圾內容政策的名稱與定義。',
    passCount: 3,
    questions: [
      {
        prompt: '黑川說：「花錢買 1,000 條外部連結，或跟別的網站大量互換連結，排名自然就上去了。」這是哪一種手法？',
        options: [
          '數位公關：以付費方式取得連結，屬於官方鼓勵的合法推廣做法',
          '連結計畫（Link schemes）：為操縱排名而買賣或交換連結',
          '關鍵字堆砌：在內文裡反覆塞入大量關鍵字來增加頁面相關度',
        ],
        correct: 1,
        explain:
          '以操縱排名為目的買賣、大量互換連結，就是連結計畫，違反垃圾內容政策。數位公關靠的是值得被引用的內容，不是付錢買連結；關鍵字堆砌則是另一種手法，與連結無關。',
      },
      {
        prompt: '網站偵測到是搜尋引擎爬蟲，就回傳塞滿關鍵字的頁面；真人訪客進來卻看到完全不同的廣告頁。這叫什麼？',
        options: [
          '偽裝（Cloaking）：對爬蟲與真人刻意展示不同的內容',
          '隱藏文字：把關鍵字用和背景相同的顏色藏在同一個頁面裡',
          '行動版優先索引：針對手機與爬蟲各提供一個不同的版本',
        ],
        correct: 0,
        explain:
          '對爬蟲與人類展示不同內容來欺騙搜尋系統，就是 Cloaking。隱藏文字是把字藏在同一個頁面裡；行動版優先索引是以手機版內容為主來索引，而且兩版內容本來就該一致。',
      },
      {
        prompt: '知名大網站把子目錄租給第三方，專門放與主站無關的優惠券與借貸比較來賺流量，這違反哪一項？',
        options: [
          '內部連結優化：把主站的權重分給子目錄，屬於正常的做法',
          '過期網域濫用：買下過期網域，掛上與原本無關的內容',
          '網站聲譽濫用：借主站的信任度，託管低監督的第三方內容',
        ],
        correct: 2,
        explain:
          '借用主站累積的信任與聲譽，放上缺乏監督、無關的第三方變現內容，就是網站聲譽濫用。內部連結是正常做法；過期網域濫用指的是買下舊網域再掛上無關內容，情境不同。',
      },
      {
        prompt: '用 AI 批量改寫別人的文章，一天產出 500 頁沒有原創價值的頁面來搶關鍵字，違反哪一項？',
        options: [
          '合理的內容擴充：頁面越多，涵蓋的搜尋詞就越廣',
          '大規模濫用內容：只要大量產出缺乏價值的頁面就算，與工具無關',
          'AI 內容一律違規：只要用了 AI 寫作，搜尋引擎就會直接處罰',
        ],
        correct: 1,
        explain:
          '問題在於「大量產出沒有價值的頁面來操縱排名」，不論人工或自動化都算大規模濫用內容。並不是用了 AI 就一律違規，也不是頁面越多越好。',
      },
    ],
  },
}
