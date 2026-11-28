# UI 美術指導規範：「社辦文具與學生手帳」

> 適用範圍：《直到你找到我 ～青葉學園網站研究社～》全體養成畫面與共用實體材質元件（16:9 舞台基準 `1280×720`）。  
> 示範實作：委託公佈欄（[`src/ui/sim/NoticeBoard.tsx`](../src/ui/sim/NoticeBoard.tsx)）與共用材質元件（[`src/ui/material/`](../src/ui/material/index.ts)）。  
> 元件展示頁：開發模式開啟 `/?dev=materials`（僅於 `import.meta.env.DEV` 載入，正式建置不佔首包）。

---

## 一、核心美術願景：雙層視覺語言分工

為了終結「白色圓角網頁卡片＋灰色小字＋膠囊標籤」造成的 SaaS 儀表板感，遊戲畫面嚴格切分為兩層視覺語言，各司其職：

| 層級 | 適用範圍 | 視覺隱喻與風格 |
|---|---|---|
| **系統介面層（System Chrome）** | 對話框 `DialogueBox`、劇情選項 `ChoiceMenu`、右上系統列 `SystemBar`、主選單／讀寫存檔／設定彈窗、知識卡獲得通知 Toast | **深藍毛玻璃**（`.vn-box`、`.hud-pill`、`.choice-btn`）：半透明夜空靛藍底色、細緻天藍光邊，與日系動漫立繪、背景和諧共存。**本層維持不變。** |
| **世界內物件層（Diegetic World Objects）** | **所有養成與互動畫面**：委託公佈欄、平日排程與演出、週末邀約、週日評測報告、小遊戲、知識卡圖鑑與相簿、社團狀態手冊 | **社辦文具與學生手帳**：紙張、軟木板、實木牌、和紙膠帶、圖釘、朱紅印章、便利貼、板夾成績單、社辦舊 CRT 電腦。讓玩家感覺自己正在「404 號社辦翻閱文具與操作社團設備」，而不是在點網頁表格。 |

### 反模式禁令（Phase 2 嚴禁出現）
1. **禁止 SaaS 膠囊標籤堆疊**：改用印章（`<Stamp>`）、手寫括號 `〔第 1/3 話〕`、色鉛筆色塊或手帳索引標籤，不再一排排 `rounded-full bg-white/80 text-[11px]`。
2. **禁止無材質純白／半透明玻璃框**：養成面板不得再使用 `.glass` 圓角白框；一切白底改為有暖纖維、微陰影、紙張色階與折角感的 `<Paper>` 或實體設備外殼。
3. **禁止小於 13px 的任何文字**：`1280×720` 基準舞台下，不得再出現 `text-[10px]`、`text-[11px]` 或 `text-xs`（12px）。
4. **禁止廉價視覺效果**：不使用高飽和霓虹漸層按鈕、過度擴散的黑色投影、或無意義的表情符號堆砌（如連串 `📊 ⚠ 💡` 當裝飾）。所有投影採用溫暖深棕色（`rgba(38, 18, 6, ...)`）以融入木質與夕陽校園光影。

---

## 二、色彩 Token 規範（`src/index.css` `@theme`）

### 既有核心色（延續保留）
| Token | 色碼 | 用途 |
|---|---|---|
| `--color-sakura` | `#f7b8c8` | 櫻花粉、愛心與少女感點綴 |
| `--color-sky` | `#9fd3f0` | 天空藍、Logo 星光與系統高亮 |
| `--color-mint` | `#b5ead7` | 薄荷綠、正向成長與體力條 |
| `--color-cream` | `#fffaf0` | 奶油白基準底色 |
| `--color-ink` | `#3b3550` | 通用深靛字色 |

### 新增實體材質色票
| 分類 | Token | 色碼 | 說明 |
|---|---|---|---|
| **紙張** | `--color-paper` | `#fbf6eb` | 標準米白筆記紙（主力委託單、報告頁） |
| | `--color-paper-warm` | `#f5ebd4` | 偏暖淡黃便條／復古手冊紙 |
| | `--color-paper-kraft` | `#e9d9bc` | 牛皮紙色（特殊委託書、檔案夾封面） |
| | `--color-paper-line` | `#d8ccb6` | 筆記橫線與虛線撕裂線 |
| | `--color-paper-edge` | `#e2d5be` | 紙張裁切邊與拍立得外框線 |
| **軟木與木框** | `--color-cork` | `#c79563` | 壓縮軟木主色 |
| | `--color-cork-deep` | `#a57242` | 軟木暗面與孔隙 |
| | `--color-cork-light` | `#dba975` | 軟木受光亮粒 |
| | `--color-wood` | `#7a4f2d` | 暖橡木框主色（呼應走廊木門） |
| | `--color-wood-dark` | `#4d2f18` | 木框暗面、木牌標題底色 |
| | `--color-wood-light` | `#a67144` | 木紋受光斜切面 |
| **墨水與印章** | `--color-ink-body` | `#2c253b` | 鋼筆／原子筆主內文墨色（對比度 > 11:1） |
| | `--color-ink-muted` | `#5b5268` | 次要手寫鉛筆灰紫（對比度 > 6.5:1） |
| | `--color-stamp` | `#c6382b` | 朱紅印泥（「本週截止」「急件」「未達標」） |
| | `--color-stamp-dark` | `#98251c` | 印泥濃墨邊緣 |
| | `--color-stamp-blue` | `#2f5d8c` | 事務藍印章（「額度已滿」「已確認」） |
| | `--color-stamp-green` | `#2d7355` | 學園綠印章（「已完成」「挑戰通過」） |
| **便利貼** | `--color-note-yellow` | `#fff1a8` | 經典檸檬黃（額度提示、索老師小抄） |
| | `--color-note-pink` | `#ffdbe6` | 淡櫻粉（額度已滿、好感提示） |
| | `--color-note-mint` | `#d7f3e3` | 薄荷綠（檢核提醒） |
| | `--color-note-sky` | `#d9eefc` | 晴空藍（數據小記） |
| **和紙膠帶** | `--color-tape-sakura` | `#f5a8be` | 半透明粉和紙膠帶 |
| | `--color-tape-sky` | `#8ec9eb` | 半透明天藍和紙膠帶 |
| | `--color-tape-mint` | `#97dfc3` | 半透明薄荷和紙膠帶 |
| | `--color-tape-cream` | `#ebd8ae` | 半透明牛皮色和紙膠帶 |
| **舊電腦（小遊戲）** | `--color-crt-bezel` | `#d9d1bf` | 社辦泛黃米白塑膠機殼 |
| | `--color-crt-screen` | `#1b2a2f` | 終端／舊顯示器深青黑底 |
| | `--color-crt-glow` | `#7ce8c8` | 螢光綠青終端文字與游標 |

### 角色文字在紙面的對比修正
在米白／淡黃紙面上，直接用 `CHARACTERS[id].accent` 或亮橘（晴 `#f28c28`）、淡紫（未來 `#9a8cd0`）作文字會導致對比不足。**紙面文字統一採用高對比印刷墨色**：
- 凜：`#1f3a6e`（維持）
- 晴：`#b45309`（深琥珀棕，保留原橘色條作邊框識別）
- 未來：`#5b4b99`（深紫羅蘭，保留原淡紫色條作邊框識別）
- 索老師：`#7c5338`
- 黑川：`#2d2d38`

---

## 三、字體與字級規範（1280×720 舞台基準）

- **手寫／標題字體**：`font-title`（`LXGW WenKai TC` 霞鶩文楷 TC）—— 用於主標題、委託標題、委託內容手寫描述、評語台詞、便利貼、印章文字、木牌按鈕、日期表頭。
- **數據／介面字體**：`font-sans`（`Noto Sans TC`）—— 用於數值指標、報酬計算、能力標籤、圖表座標、程式碼外圍輔助標籤。
- **程式碼等寬字體**：保留 `Spot.tsx` 的 `CODE_FONT_STACK` 內聯設定（避開全域 `button { font-family: inherit }` 覆蓋）。

### 強制字級階梯（Stage `1280×720` 下）
| 層級 | 最低字級 | 建議範圍 | 適用元素 |
|---|---|---|---|
| 畫面主標（H1/H2） | `24px` | `24px – 28px` | 木牌主標、手帳標題、成績單標頭 |
| 卡片／區塊標題（H3） | `19px` | `19px – 23px` | 委託標題、活動貼紙名稱、角色名稱 |
| **主要內文（Body）** | **15px（嚴格下限）** | `15.5px – 18px` | 委託內容、評語、活動描述、題目與選項、行動按鈕 |
| **次要資訊（Secondary）** | **13px（嚴格下限）** | `13px – 14.5px` | 委託人、系列話數、報酬明細、週次小標、印章文字 |

> **Phase 2 舊畫面字級清查警示**：目前 `ScheduleScreen.tsx`（`text-[11px]` 活動描述與風險條）、`WeeklyReport.tsx`（`text-[11px]` 圖例）、`SiteDashboard.tsx`（`text-[9px]` / `text-[10px]` / `text-[11px]`）、`StatusPanel.tsx`（`text-[10px]` / `text-[11px]`）、`Gallery.tsx`（`text-[10px]` 標籤）皆低於最低規範，第二階段重做時**必須全部升級至 ≥ 13px（內文 ≥ 15px）**。

---

## 四、品牌母題克制使用原則

四項代表《直到你找到我》世界觀的母題僅作點綴，**每個畫面最多出現 1–2 處，不得堆砌**：
1. **四芒星光（`FourPointStar`）**：呼應標題 Logo 與未來的髮夾，用於標題木牌旁、知識卡進階標記或極佳成績點綴。
2. **櫻花瓣（`SakuraPetal`）**：象徵青葉學園春季與戀愛氛圍，僅在空白休養便條、結局／約會邀約卡角落輕點一至兩片。
3. **搜尋框細線（`SearchRule`）**：以極細的放大鏡圖示接續漸淡底線，呼應「搜尋」主題，取代生硬的灰線 `<hr>`。
4. **404 門牌（`RoomBadge`）**：呼應社辦背景門牌「404」（Web Not Found 雙關），用於木牌角落、手冊封面角標與佈告欄銘牌。

---

## 五、共用材質元件庫（`src/ui/material/`）

紋理全數以純 CSS 多重漸層＋內聯 SVG `feTurbulence` / 手繪木紋與軟木碎粒實現（0 額外圖片請求、不更動 `manifest.json`、支援 `prefers-reduced-motion` 與鍵盤 `:focus-visible`）。

| 元件 | 檔案 | 主要 Props | 用途說明 |
|---|---|---|---|
| `<Corkboard>` | [`Corkboard.tsx`](../src/ui/material/Corkboard.tsx) | `header`, `footer`, `showHardware`, `className`, `innerClassName` | 實木斜接外框＋四角黃銅釘＋左上進光壓縮軟木板 |
| `<Paper>` | [`Paper.tsx`](../src/ui/material/Paper.tsx) | `as` (`div`/`button`/`article`/`section`), `tone` (`cream`/`warm`/`kraft`/`white`), `rule` (`none`/`lined`/`grid`/`memo`), `rotate`, `curled`, `interactive`, `dogEar` | 具紙纖維、翹角雙投影與互動微抬效果的實體紙片 |
| `<Tape>` | [`Tape.tsx`](../src/ui/material/Tape.tsx) | `color` (`sakura`/`sky`/`mint`/`cream`), `pattern` (`solid`/`stripe`/`dots`), `rotate`, `width`, `height` | 兩端手撕鋸齒邊的半透明和紙膠帶（`aria-hidden`） |
| `<Pin>` | [`Pin.tsx`](../src/ui/material/Pin.tsx) | `color` (`red`/`blue`/`yellow`/`mint`/`sakura`/`brass`), `size` | 立體圓頂圖釘，附金屬針腳與右下方投影（`aria-hidden`） |
| `<Stamp>` | [`Stamp.tsx`](../src/ui/material/Stamp.tsx) | `label`, `sublabel`, `color` (`vermilion`/`navy`/`forest`), `shape` (`rect`/`circle`/`oval`), `rotate`, `size` (`sm`/`md`/`lg`) | 雙線框微斑駁印章，字級保證 ≥ 13px |
| `<StickyNote>` | [`StickyNote.tsx`](../src/ui/material/StickyNote.tsx) | `color` (`yellow`/`pink`/`mint`/`sky`), `rotate`, `attach` (`none`/`pin`/`tape`), `pinColor`, `tapeColor` | 頂部背膠陰影與微翹角的便利貼 |
| `Motifs` | [`Motifs.tsx`](../src/ui/material/Motifs.tsx) | `FourPointStar`, `SakuraPetal`, `SearchRule`, `RoomBadge`, `WoodPlaque` | 品牌母題與木質標題牌 |

### 標準用法範例
```tsx
<Paper as="button" interactive curled tone="cream" rule="lined" rotate={-1.2} className="p-6 pt-7">
  <Pin color="red" className="absolute -top-3 left-1/2 -translate-x-1/2" />
  <Stamp label="本週截止" color="vermilion" size="sm" rotate={-8} />
</Paper>
```

---

## 六、第二階段：各養成畫面轉換藍圖

所有畫面皆須維持頂部 `pt-14`（56px）讓右上 `SystemBar` 獨立懸停、並維持既有背景預載 `<ArtGate>` 與全部 `data-testid`。

### 1. 平日排程（`src/ui/sim/ScheduleScreen.tsx`）
- **實體隱喻**：攤開在社辦木桌上的「404 社團學生手帳 · 週計畫跨頁」。
- **時段改名（必要）**：原本「時段 1～4」改為 **「星期一」「星期二」「星期三」「星期四」**（呼應放學後委託與週末自由行動，完整構成一週）。
- **左側手帳週計畫頁**：
  - 頂端為手帳跨頁線圈／中縫裝訂紋理與木色標題標籤「第 N 週 · 社團週計畫」，右側放「推薦排程」和紙標籤按鈕。
  - **4 格行程**：手帳的「Mon / Tue / Wed / Thu」方格欄位（`Paper rule="grid"`）。已排入的活動顯示為**可撕下的彩色貼紙**（白邊＋微傾角度＋角色／主題色標，本週主題加成蓋上小型星光標或「×1.5」朱紅小章）。
  - **8 項活動區**：整齊排列於「貼紙收納頁 / 社團備忘便箋」上的貼紙卡（可點擊或拖放），每張貼紙清楚呈現 `15px+` 名稱、數值變化（`13px+`）與簡短說明，移除 `truncate text-[11px]` 截斷問題。
- **右側手帳右頁（狀態預覽與執行）**：
  - 嵌入簡潔版手帳狀態頁（體力／壓力手繪計量尺＋預期屬性變化小便條），風險提示改用貼在角落的黃色／粉紅 `<StickyNote>` 警示條（不再用小於 12px 的紅框文字）。
  - 「開始執行本週排程（4/4）」做成深藍硬殼手帳書籤帶或漆木啟動牌。
- **排程演出（`data-testid="schedule-playback"`）**：
  - 呈現為「手帳每日紀錄頁」：上方保留 `<ActivityChibi>` 舞台（可加相紙框線），下方敘事框使用 `<Paper rule="lined">` 筆記頁＋小插曲用貼在右下角的角色便利貼與拍立得頭像。
- **保留測試 ID**：`schedule-screen`、`slot-box-0..3`、`act-<id>`、`schedule-go`、`schedule-playback`、`schedule-next`、`schedule-skip`、`infirmary-note`、`tired-badge`、`tense-badge`、`schedule-risks`、`risk-tense`。

### 2. 週日評測報告（`src/ui/sim/WeeklyReport.tsx` ＋ `src/ui/sim/SiteDashboard.tsx`）
- **實體隱喻**：夾在深棕牛皮／木紋**金屬板夾（Clipboard）**上的「週日社團評測成績單」與「網站檢核報表」。
- **左側三位女主角評測欄**：
  - 每位女主角是一張水平排列的紙質評分卡（`Paper tone="white"`），左側貼拍立得頭像，中間為雙色鉛筆進度條（網站貢獻＋互動貢獻），右側蓋上評等印章（`<Stamp>`：「初識階段」灰藍／「漸入佳境」藍／「深度信賴」朱紅），分數增減用鋼筆紅藍手寫標記（`+8` / `-2`）。
  - 下方一行用 `font-title text-[16px]` 呈現角色親筆評語引號句子。
- **右側網站儀表板（`SiteDashboard.tsx`）**：
  - 做成方格紙列印報表（`Paper rule="grid"`），頂部貼一條「示意數據・非真實預測」紙膠帶標籤；6 個指標改為清楚的 `2×3` 表格小格（指標名 `13.5px`、數字 `22px`、▲▼ 變化 `13px`），下方「搜尋結果長這樣」做成復古瀏覽器列印剪報卡。
- **保留測試 ID**：`weekly-report`、`report-score-parts-<h>`、`report-score-bar-<h>`、`report-dashboard`、`report-next`、`site-dashboard`、`dashboard-simulated`、`metric-<key>`、`delta-<key>`、`serp-mock`、`serp-ai-chip`。

### 3. 週末自由行動（`src/ui/sim/WeekendMenu.tsx`）
- **實體隱喻**：放學街道黃昏前的四張「手寫邀約卡 / 明信片」＋「家裡鑰匙吊牌」。
- **版面構成**：
  - 頂部橫幅改為木牌或手帳橫條，體力／壓力用清晰手寫尺標呈現（`14px`）。
  - 三位女主角改為「半透明相框／立繪明信片」卡片（`Paper` 底部襯暖白相紙框，立繪維持原尺寸與動畫不遮臉，下方資料卡從 `.glass` 改成米白印刷相紙底，印有約會次數與階段）。
  - **保健室鎖定狀態**：被鎖定的女主角卡片上直接斜蓋朱紅 `<Stamp label="本週休養中" rotate={-10} />` 並降飽和，比灰底 Emoji `🔒` 更有劇情重量。
  - 「在家休息」卡保留 `<RestScene />` 主角房間晨光插畫，加上相紙白邊與薄荷綠便利貼標籤。
- **保留測試 ID**：`weekend-menu`、`infirmary-lock`、`date-rin`、`date-hare`、`date-mirai`、`weekend-rest`、`weekend-score-parts-<h>`、`weekend-rest-effect`。

### 4. 小遊戲（`src/minigames/Quiz.tsx`、`Spot.tsx`、`Serp.tsx`）
- **實體隱喻**：「404 社辦桌上那台舊 CRT 電腦螢幕」＋「螢幕邊框上的索老師黃色便利貼」。
- **外框整合**：
  - 可抽出一個共用 `<RetroMonitorFrame>`（米白微黃 `--color-crt-bezel` 塑膠機殼外框、電源小綠燈、右上角落品牌標籤），螢幕內針對三種小遊戲微調呈現：
    - **Spot（程式碼除錯）**：最適合舊電腦風格——上方是深青黑終端機視窗與清晰等寬程式碼行（行號＋點擊除錯回饋），下方/側面貼一張醒目的黃色 `<StickyNote>` 顯示索老師小提示！
    - **Serp（搜尋結果設計）**：螢幕裡模擬簡潔復古搜尋引擎瀏覽器視窗，下方兩個選項欄做成檢索便條卡片。
    - **Quiz（問答測驗）**：做成「社團入社測驗試卷」夾在木桌墊上或舊電腦測驗軟體畫面（題目紙卡＋ABCD 圓圈鉛筆畫記按鈕），結算時蓋上朱紅/綠 `<Stamp label="挑戰通過" / "差一點點" />`。
- **保留測試 ID**：`minigame`、`quiz-opt-0..3`、`quiz-next`、`quiz-hint`、`spot-line-<i>`、`spot-hint-btn`、`spot-hint-box`、`spot-finish`、`serp-title-<i>`、`serp-desc-<i>`、`serp-submit`、`serp-hint`、`minigame-retry`、`minigame-done`。

### 5. 知識卡與圖鑑（`src/ui/Gallery.tsx`）
- **實體隱喻**：社團鐵櫃裡的「A4 牛皮檔案夾＋實體收藏知識卡＋貼角相簿」。
- **設計細節**：
  - 頂部分頁做成四個突出索引標籤（檔案夾頁籤：`知識卡圖鑑`、`回憶相簿`、`結局列表`、`練習模式`）。
  - **知識卡列表與詳情**：每張知識卡採雙層細框線（外框＋內框），編號 `#01` 用印章風格標記，**進階知識卡**加上淡金斜向微光邊條與 `<FourPointStar>` 箔光點綴；詳情頁做成一張完整「雙面收藏卡」（正面一句話重點與詳細說明，下方對比便條「常見誤解」粉紅便條 vs 「實戰檢查清單」薄荷便條）。
  - **回憶相簿**：未解鎖 CG 做成牛皮相紙空白底片框，已解鎖 CG 四角加上黑色／奶油色相片角套（Photo Corners）。
- **保留測試 ID**：`gallery-modal`、`tab-cards`、`tab-cg`、`tab-endings`、`tab-practice`、`gallery-close`、`cards-count`、`card-item-<id>`、`card-locked-<id>`、`card-detail`、`card-advanced-badge`、`cg-count`、`cg-thumb-<id>`、`cg-locked-<id>`、`cg-lightbox`、`endings-count`、`ending-item-<id>`、`practice-<id>`、`practice-stars-<id>`、`practice-exit`。

### 6. 狀態面板（`src/ui/sim/StatusPanel.tsx`）
- **實體隱喻**：「青葉學園 404 網站研究社 社員手冊」（打開雙頁或單頁手寫表格）。
- **設計細節**：
  - `StatusSummary` 改在 `<Paper rule="grid">` 上繪製雷達圖（線條改成鋼筆深藍與手繪感刻度，字級從 13px 起跳確保清晰），體力／壓力做成直尺刻度進度條，女主角好感度列加上角色色簽名線與手寫「在意項目」。
  - `StatusPanel`（透過系統列「狀態」開啟）與 `ScheduleScreen` 右側欄共用 `StatusSummary`，確保兩處風格一次統一。

---

## 七、第二階段實作檢核表

- [ ] 畫面內容區頂部保留 `pt-14`（56px），不與右上 `SystemBar`（`right-6 top-4`）重疊。
- [ ] 畫面內**無任何**以「狀態」「選單」「圖鑑」開頭的按鈕（避免違反 `e2e/playthrough.mjs` 的 `assertSystemBar`）。
- [ ] 所有按鈕與互動紙卡支援鍵盤 Tab 聚焦與明顯 `:focus-visible` 邊框。
- [ ] 遵守 `@media (prefers-reduced-motion: reduce)`，無強制動態或 hover 位移。
- [ ] 在 `1280×720` 與 `1920×1080` 兩種解析度下截圖目視檢查，所有文字 ≥ 13px（內文 ≥ 15px）、無溢出捲動裁切。
- [ ] 若新增任何 `/art/` 圖片，必須同步註冊至 `public/art/manifest.json`、`src/art/specs.ts` 與 `tests/artResolve.test.ts`，並通過 `npm run check:flash`（0 SVG 閃爍）。
- [ ] 驗證 `npm run typecheck`、`npm test`、`npm run build`（首包 `< 250KB` gzip）與 `npm run e2e` 全數通過。
