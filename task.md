# task.md — 《直到你找到我》任務清單

> 規格以 [plan.md](./plan.md) 為準，本檔只記錄任務拆解與進度。
> **完成一項就立刻打勾 `[x]`**，並在「進度紀錄」寫一行。接手的 AI 請先讀 plan.md → 本檔 → `CONTRIBUTING.md`（P0 完成後才會有）。
>
> - 開發分支：`main`（直接提交到 main）
> - **每個階段完成都必須先 commit + push，才能開始下一階段**（commit 訊息格式：`P<n>: <摘要>`）；平行進行的階段各自完成後分別 commit
> - 標記說明：`[ ]` 未開始｜`[~]` 進行中｜`[x]` 完成｜`[!]` 卡住（寫原因）

---

## P0 骨架與引擎
- [x] 撰寫 plan.md
- [x] 撰寫 task.md
- [x] Vite + React 19 + TS strict 專案，scripts：dev／build／preview／typecheck／test，alias `@/`
- [x] Tailwind 4 主題 token（粉彩色、字型 Noto Sans TC／LXGW WenKai TC）
- [x] `src/engine/types.ts`：Cmd、ChoiceOpt、Effects、Cond、Scene 型別
- [x] DSL helper：scene／bg／show／hide／say／choice／opt／effect／when／minigame／card／bgm／sfx／cg／wait
- [x] Scene runner（純 TS）：PC 堆疊、巢狀區塊、效果套用、穩定的行 id、`{name}` 替換
- [x] 註冊表：characters.ts（角色、表情、主色）、BgId、knowledge.ts（ID＋標題＋空白內文）、minigame ID
- [x] Scene 註冊表＋動態 import（code split）＋ demo 劇本
- [x] Zustand store：遊戲狀態、設定、已讀紀錄
- [x] 存讀檔：自動存檔＋3 欄位、版本號＋migrate、try/catch；跨存檔的全域資料（圖鑑、結局、已讀）
- [x] `src/systems/score.ts` 好感度公式＋測試
- [x] `src/systems/estimate.ts` 時長估算＋測試
- [x] 16:9 舞台縮放＋黑邊、桌機檢查（< 1024px 顯示「請使用電腦遊玩」）
- [x] VNStage：背景層、角色層（左中右、進退場、表情切換）
- [x] DialogueBox：毛玻璃、名牌顏色、打字機效果、點擊推進
- [x] ChoiceMenu、Backlog（L）、隱藏 UI（H）、自動播放（A）、已讀快轉（Ctrl）、Esc 選單
- [x] TitleScreen（開始 → 輸入名字、繼續、讀檔、設定）
- [x] 美術佔位元件 `<CharacterSprite>`／`<Background>`＋PNG 覆蓋機制（`public/art/manifest.json`）
- [x] audio stub API
- [x] 測試：runner、cond、存讀檔、score；`tests/scriptLint.test.ts` 骨架
- [x] `vercel.json`、`.gitignore`、`CONTRIBUTING.md`（目錄分工規則）
- [x] 驗收：typecheck／test／build 全過、Playwright 煙霧測試＋截圖審查
- [x] 總監簽核＋commit

## P1 美術（SVG）
- [x] 角色共用零件（臉型、眼睛表情組、嘴型、腮紅與符號、眨眼、說話、呼吸動畫）
- [x] **打樣：凜**（8 個表情）→ 總監審查 → 給使用者看 → 確認畫風
- [x] 晴（8 個表情）
- [x] 未來（8 個表情、髮夾發光）
- [x] 索老師（8 個表情）
- [x] 黑川（normal／smug／surprised／sad，黑色棒球帽）
- [x] 背景：gate、classroom、clubroom、corridor、rooftop、library、broadcast
- [x] 背景：council、street、planetarium、beach、festival
- [x] 時段色調（day／dusk／night）＋雨天疊層＋粒子（櫻花、雨、星空）
- [x] 標題畫面美術
- [x] UI 視覺打磨（對話框、名牌、選項、選單）
- [x] 截圖審查（全角色 × 全表情、全背景）＋總監簽核

## P2 養成系統
- [x] `activities.ts`：8 種活動數值（plan §2.4）
- [x] 排程規則：本週主題 ×1.5、體力 < 20 效果減半、體力 0 進保健室、壓力 ≥ 80 有 30% 失誤、15% 小插曲
- [x] 每週流程狀態機：主線 → 排程 → 放學後 → 週末 → 評測 → 下一週／搜尋祭
- [x] 排程 UI（4 格、拖放或點選、預覽數值變化）＋成長結果動畫
- [x] 狀態面板（五角雷達圖、體力與壓力條、三人好感度、週次）
- [x] 委託公佈欄（支線解鎖條件：週次範圍、前置任務；每週最多 2 件）
- [x] 週末行動選擇（約會 1／2／3 階段、≥ 55 門檻、未達門檻播普通相處）
- [x] 週評測動畫（好感度變化＋一句評語）
- [x] 黑帽旗標與第 6 週人工處罰
- [x] 結局判定（plan §2.6，含平手規則）
- [x] 平衡模擬測試（plan §7.3 五種策略）＋數值校準
- [x] 總監簽核

## P3 劇本（遵守 plan §3.2 寫作守則、§3.6 事實表）
- [x] 序章「404 號社辦」（≤ 1,300 字）
- [x] 第 1 週「看不見的網站」
- [x] 第 2 週「一句話的勇氣」
- [x] 第 3 週「說給機器聽的語言」
- [x] 第 4 週「快一點，再快一點」（含黑川）
- [x] 第 5 週「被引用的理由」
- [x] 第 6 週「演算法的大雨」（含人工處罰分支、雨中三選一）
- [x] 搜尋祭（三評審 × 3 段評語）
- [x] 結局 × 7
- [x] 約會：凜 × 3＋普通相處
- [x] 約會：晴 × 3＋普通相處
- [x] 約會：未來 × 3＋普通相處
- [x] 支線：sq-r1、sq-r2、sq-r3（凜）
- [x] 支線：sq-h1、sq-h2、sq-h3（晴）
- [x] 支線：sq-m1、sq-m2、sq-m3（未來）
- [x] 支線：sq-x1（黑川）
- [x] 排程小插曲台詞＋週評測評語
- [x] 知識卡內文 × 31（summary／detail／misconception）
- [x] 劇本 lint＋時長估算通過（主線 ≤ 30 分鐘、全收集 60～90 分鐘）
- [x] 總監審稿（口吻、正確性、節奏）＋簽核

## P4 小遊戲與收集
- [x] quiz 引擎（多題、解說）
- [x] spot 引擎（點選行、多目標、限錯 3 次）
- [x] serp 引擎（片段組合、即時預覽、評分）
- [x] 主線題目資料：W1 spot、W2 serp、W3 spot、W4 quiz
- [x] 支線題目資料 × 10
- [x] 小遊戲單元測試
- [x] 知識卡圖鑑頁
- [x] 回憶相簿（結局 CG × 7＋約會畫面）
- [x] 結局列表（未達成時顯示提示）
- [x] 練習模式（重玩小遊戲）
- [x] 總監簽核

## P5 打磨
- [x] Web Audio 音效（點擊、文字嗶聲、選項、成長、好感度上升）
- [x] Web Audio BGM × 3（日常、溫馨、搜尋祭）
- [x] 轉場與演出（fade、flash、震動、CG 展示）
- [x] 無障礙（對比、鍵盤焦點、減少動態偏好）
- [x] 效能：code split 檢查、首包 JS < 250KB gzip、字型載入
- [x] Playwright e2e：自動通關主線＋讀檔、設定、圖鑑頁
- [x] 1280×720／1920×1080 截圖審查
- [x] 總監簽核

## P6 部署
- [x] README（玩法、開發指令、部署方式）
- [x] 最終 QA：`vite preview` 完整通關
- [x] 推送分支
- [ ] Vercel 部署（待使用者於 Vercel 匯入 `lu7766lu7766/seo-journey` 或提供 token 由 CLI 部署）
- [ ] 線上版煙霧測試（部署後驗證）

---

## 進度紀錄
- 2026-11-25：完成 plan.md 與 task.md；P0 開始（Sonnet 執行中）。
- 2026-11-25：P0 完成（Sonnet）：typecheck／test(25)／build 通過，主 chunk 129KB gzip；Playwright 煙霧測試（標題→名字→demo→選項→backlog→存/讀檔→重載）無 console error，截圖在 scratchpad；待總監簽核＋commit。
- 2026-11-25：P0 總監簽核。劇本註冊改為 import.meta.glob 自動註冊（檔名＝scene id）。待改進：選項按鈕對比偏低（交給 P1 處理）。接著平行展開 P1／P2／P3／P4。
- 2026-11-25：平行派出 6 個 Sonnet（各自在 git worktree）：P1 美術（凜打樣＋背景＋標題＋UI）、P2 養成系統、P3a 主線與結局、P3b 約會＋flavor＋知識卡、P3c 10 個支線、P4 小遊戲與收集。完成後由總監審查並合併到 main。
- 2026-11-25：P3b（約會、flavor、知識卡）總監審稿通過並合併；修正 date-rin-3 旁白人稱。
- 2026-11-25：P1 完成：5 位角色 SVG 立繪（10 表情＋眨眼／說話／呼吸）、15 張背景（含日暮夜色調與櫻花／星空粒子）、10 張事件 CG、標題畫面與高對比選項 UI；typecheck／test(32)／build 全過（主包 148.5KB gzip）。
- 2026-11-25：P2 完成：活動數值、排程規則與狀態機、委託公佈欄、週末約會分歧、週評測、結局判定、五角雷達圖狀態面板、存檔 v2 migration，以及五種策略各 1,000 局平衡模擬測試；typecheck／test(40)／build 全過（主包 161.4KB gzip）。
- 2026-11-25：P3 完成：序章、W1–W6 主線、搜尋祭、7 結局與 10 支線（全數自動 code-split）；劇本 lint、字數上限、時長估算（主線 ≤ 30m／全收集 60–90m）與 31 張知識卡／14 小遊戲／7 CG 覆蓋檢查全過；typecheck／test(41)／build 全過（主包 162.4KB gzip）。
- 2026-11-25：P4 完成：quiz／spot／serp 小遊戲引擎與 15 組題庫資料、純函式計分單元測試、以及延遲載入的圖鑑頁（知識卡 31 張／回憶相簿 10 CG／結局列表 7 種／練習模式 14 題）；typecheck／test(49)／build 全過（主包 179.9KB gzip）。
- 2026-11-25：P5 完成：Web Audio 8 種音效與 3 首循環 BGM、MinigameHost 延遲載入（主包 163.6KB gzip < 250KB）、1280×720／1920×1080／<1024px 桌機檢查與 Playwright 全自動通關＋存讀檔＋圖鑑 E2E（0 console/page/HTTP errors），並完成截圖審查與名牌層級／防連點修正。
- 2026-11-25：P6 完成：撰寫 README.md（玩法、熱鍵、開發指令、Vercel 部署步驟）、完成 `vite preview` 正式建置全程通關 QA；待使用者於 Vercel 匯入 repo 即可上線。
- 2026-11-25：視覺大升級完成：採用日式青春校園動漫×韓漫風格 AI 繪製 5 位主角立繪（含去背透明 WebP 與情緒微表情疊層）與 9 張核心校園/居家背景，其餘 6 張背景與 UI（深藍夜色發光對話框／菱形選項條／標題／養成背景）全面同步翻新；`public/art/` 共 1.44 MB，typecheck／test(49)／build（主包 166.5KB gzip）／`vite preview` E2E 全數通過並完成截圖審查。
- 2026-11-25：優化平日排程版面：精簡右側狀態面板並固定底部「預期變化」卡片與高對比送出按鈕，確保 4 格填滿與風險提示時亦不跑版或裁切；通過 `typecheck`／`test(49)`／`build`／`vite preview` E2E 與截圖檢查。
- 2026-11-25：新增 Q 版日式動漫任務動畫（`ActivityChibi`：含 8 種活動、失誤、保健室、休養與夥伴小插曲客串，及上方 4 格進度條），並為「週日評測報告」與「委託公佈欄」補上角色頭像與動態好感度進度條、修正 Backlog 選項字色對比；通過 `typecheck`／`test(49)`／`build`（主包 175.4KB gzip）／`vite preview` 全程 E2E（0 error）與截圖審查。
- 2026-11-25：新手教學與教室實務全面強化：改寫 W1／W3／W5 劇本於測驗前先補上生活化比喻（符合 ≤45 字／≤900 字規範）、Spot 找錯遊戲新增「索老師小提示」、知識卡解鎖改為雙行摘要浮窗、實作 UTF-8 存檔碼匯出與貼上還原、結局畫面新增課堂截圖用「學習成果報告」、排程活動卡補白話副標、寬度門檻支援縮放視窗繼續遊玩，並強化 `street`/`festival`/`rain` 背景光影與複合 CG 光斑景深；通過 `typecheck`／`test(50)`／`build`（主包 177.55KB gzip）／`vite preview` E2E（0 error）與截圖審查。
- 2026-11-25：修正 `Ctrl` 快轉偶發失效（支援左右 Control 鍵與輸入法狀態、預設與按住 `Ctrl` 強制跳過未讀台詞與 `wait`、DialogueBox 即時顯示文字與 HUD `快轉 (Ctrl) ●` 切換，輸入框聚焦時維持複製貼上正常）並將 `scripts/process-art.mjs` 改為增量合併模式；`typecheck`／`test(50)`／`build`（177.80KB gzip）／`vite preview` E2E 全過。註：剩餘 6 張背景與 10 張事件 CG 因圖片生成模型配額上限（HTTP 429，約 `15:37` 重置）暫未產出。
- 2026-11-25（總監審查）：驗收既有成果——typecheck／test／build 全過、首包 178KB gzip；瀏覽器實跑序章、排程、週評測、小遊戲無錯誤。審查發現：主線與結局偏薄、支線有灌水、每角色只有一張表情圖、6 張背景與 10 張 CG 尚未出圖、e2e 只能在 Windows 跑、Spot 程式碼非等寬字型。
- 2026-11-25：改進完成並合併——(1) 主線：序章、W1–W6、搜尋祭、7 結局加厚，W6 重寫為真正的核心更新危機（主線估算 29.3 分鐘，已貼近 30 分鐘上限）；(2) 10 個支線去灌水重寫（各約 950 字，全收集估算約 68 分鐘以上）；(3) 新增 `docs/art-requests.md`（43 張待出圖的規格與提示詞）、`npm run art:check`、CG 讀圖測試、e2e 跨平台（Linux 通過）、Spot 等寬字型。測試 65 項全過。

- 2026-11-25（平衡）：使用者回報隨便玩就三項超標。用真實劇本的模擬器（`tests/fullSim.ts`）量測發現：(1) 分數全面爆表（認真玩的人三人皆 100）；(2) 三位角色好感度靠主線＋支線就全滿，週末約會選誰沒有影響；(3) 黑帽結局因 W4/W6 劇本邏輯**無法達成**。修正：分數公式 `statScale 0.5`、好感上限 40；主線好感 ×0.6、支線 ×0.45；推薦排程改為固定的主題輪替表；W6 在 `kuroPending` 或 `blackhat ≥ 1` 時再次邀約；W4／W6 把誘惑選項移出第一個。結果：用心玩 85% 真結局、普通認真 78%、偷懶點擊 12%、半認真與隨機 0%（多為普通結局）、偏愛某角色 91～100% 走她的結局、專攻 100%、黑帽 100%、擺爛 100% 壞結局。新增 `tests/balance.test.ts` 回歸測試，68 項測試全過，e2e 通關無錯誤。
- 2026-11-25（美術 CG 補齊）：定時排程於 15:45 自動喚醒執行；採用既有原畫／立繪風格基準，產出並轉檔補齊全部其餘 **6 張背景**（`street`、`festival`、`planetarium`、`beach`、`rain`、`infirmary`，全遊戲 15/15 背景皆已 AI 繪製完成）及 **6 張事件 CG**（`date-rin-3`、`date-hare-3`、`date-mirai-3`、`end-true`、`end-rin`、`end-normal`），總計 26/57 項資產就緒（`public/art/` 共 2.84 MB）。通過 `art:check`（0 broken）、`typecheck`、`test(68)`、`build`（177.90KB gzip）、`vite preview` 全程 E2E（0 error）與截圖審查。剩餘 `end-hare`、`end-mirai`、`end-bad`、`end-blackhat` 4 張 CG 因後端配額再次觸及 429 暫維持現有 AI 背景＋AI 立繪合成呈現（預計約 4 小時 47 分後可補齊）。

## 待辦（下一步）
- [x] 美術 57/57 全部到齊（27 個表情、6 張背景、10 張 CG），`npm run art:check` 0 損壞；程式內的缺圖退回對應保留作為保險
- [x] 第二批美術（見 `docs/art-requests.md` 第 7 章）：10 張活動插圖 `ui/activity-*`、標題 Logo `ui/logo`（`npm run art:check` 71/71 全數完成）
- [x] 網站圖正式版：`public/og-image.jpg`、`favicon.png`、`apple-touch-icon.png` 皆已換成正式版美術（含 Open Graph 主視覺＋Logo 排版、高辨識度透明 Favicon、不透明深藍漸層 iOS 主畫面圖示）
- [ ] 實機計時：真人完整玩一次主線，確認落在 30 分鐘內（估算公式為近似值）
- [x] 保健室背景：排程中體力歸 0（及之後被取消的格子）改在保健室背景播放
- [ ] Vercel 部署（見 P6）
- 2026-11-27（美術整合）：檢查使用者產出的圖與遊戲結合——立繪、背景、CG 都已正確載入。整合修正：(1) 有真圖的表情不再重複套情緒色調濾鏡（之前 `sad` 會偏灰）；(2) 缺圖退回對應改為凜 happy→smile、sad→think、晴／未來 angry→think；(3) 星象館與雨天背景本身已是暗色，不再套夜晚濾鏡（原本星象館幾乎全黑）；(4) 結局畫面新增「只看 CG」切換鈕，避免成果報告蓋住結局圖；(5) e2e 總時限放寬到 420 秒並新增「同一句卡住 20 秒才失敗」偵測，納入 CG 切換鈕測試。測試 69 項全過、e2e 通關 0 錯誤。
- 2026-11-27：使用者補齊最後 8 張表情（57/57）並已合併；測試 69 項全過、e2e 通關 0 錯誤。
- 2026-11-27（第二批美術）：盤點仍是程式繪製／暫代的畫面，更新 `docs/art-requests.md`（新增第 7 章：10 張活動插圖、標題 Logo、3 個網站圖檔，附規格、提示詞、檢查表，並修正第一批的過時說明）。同步接好載入機制，放檔案即生效（已用替身圖驗證）：`ActivityChibi` 讀 `ui/activity-*`、標題讀 `ui/logo`、`process-art.mjs` 新增橫幅與 Logo 處理、`art:check` 納入 71 項。網站加入 meta description、Open Graph、Twitter Card、favicon 與環境感知的絕對網址（Vercel 自動、自訂網域設 `SITE_URL`），並產生暫代分享圖與圖示。另把 `end-true` 老師的 `happy`（唯一缺圖用法）改為 `smile`。測試 70 項全過、e2e 通關 0 錯誤。
- 2026-11-27（遊戲性／劇情／教學優化）：依檢視報告全數處理，由三個 Sonnet 平行完成後整合：
  - 教學：題庫重寫（「正確答案最長」95%→27%、錯誤選項含絕對字眼 38%→9%、選項執行時隨機排序），移除「40～60 字」非官方說法；小遊戲新增一次重試（附索老師提示）與 1～3 星評等；`tests/quizQuality.test.ts` 防止退化。
  - 遊戲性：體力／壓力經濟重做（焦躁、失誤現在會發生，倒下會失去當週約會，最佳節奏為 3 工作＋1 休息），新增網站儀表板（示意數據）與結局「實戰檢查清單」（可複製 Markdown）。
  - 劇情：雨夜選擇在結局有呼應、好感度分歧台詞（第 1、2、3、5、6 週）、晴與 AEO 戲份補強、7 張基礎知識卡進入主線（redirects、canonical、duplicate-content、internal-links、image-optimization、alt-text、question-headings）、第 5 週改為對話、第 1～5 週各有一個無對錯的取捨選擇、搜尋祭改為互動簡報。
  - 整合結果：測試 134 項全過、e2e 通關 0 錯誤；主線估算 29.8 分鐘（上限 30）。結局分布：用心玩 91% 真結局、認真玩 85%、偷懶點擊 3%（幾乎都走凜）、半認真與亂玩以普通結局為主、偏愛某角色 99～100% 走她的結局、擺爛 100% 壞結局、黑帽 100%。
  - 已知小問題：全部只點第一個選項的玩家幾乎都會走凜的結局（第一個選項常偏向凜）；硬撐型玩家平均會倒下約 4 次、壓力到頂，偏嚴苛。
- 2026-11-27（第二批美術完成 71/71）：補齊全部 14 項第二批素材——10 張 1584×404 Q 版活動橫幅（`ui/activity-*`，一致主角造型＋安全區置左延伸漸層）、透明標題 Logo（`ui/logo`，LXGW WenKai TC＋放大鏡愛心徽章）、正式版分享預覽圖（`public/og-image.jpg` 1200×630）、透明 Favicon（`public/favicon.png` 512×512）與不透明 iOS 圖示（`public/apple-touch-icon.png` 180×180）。`npm run art:check` 71/71 0 損壞、`typecheck`/`test`/`build`/實機 E2E 與截圖審查全數通過。
- 2026-11-28（檢視意見第 1、2 批）：Opus 檢視、Gemini 交叉審查後達成共識，由 Sonnet（劇本／知識卡／用語／W5–W6 小遊戲）與 Gemini 4 Neon（結局門檻／搜尋祭／週報／NPC 名牌）平行實作，Opus 整合驗收：
  - 教學：修正「交換連結」與連結計畫矛盾、Sitemap 提交順序；知識卡重新分配為每週 4～5 張（canonical→W3、duplicate-content→W6、question-headings→W2）；新增 `w5-cite`、`w6-update` 主線小遊戲（共 16 個）；用語改為 Search Console、網站使用體驗核心指標、專人介入處理，「可答力」改名「解答力」；知識卡中英文補空格。
  - 劇情：旁白人稱統一為「我」、多處連續性錯誤、對齊立繪（髮箍／藍黑長髮／領結）；`date-rin-3` 改為制服逛夜市、`end-true` 改為黃昏合照以對齊既有 CG；晴、未來第 3 場約會改為「差一步說出口」，正式告白留給個人結局。
  - 系統：個人結局需看過第 3 場約會或雨夜選她；搜尋祭新增依支線三部曲解鎖的進階選項（與基本正解同為 +2，只給專屬肯定、不額外加權，避免全支線玩家三人同時跨過 65）；週報與週末選單拆成「網站＋互動」；新增無立繪 NPC 名牌 `npc()`（存檔 v3）；儀表板網域統一 `aoba-web.club`。
  - 結果：測試 137 項全過、e2e 通關 0 錯誤、主線估算 29.9 分鐘、首包 192.7KB gzip。結局分布：偷懶點擊 91% 普通結局（原 67% 未來結局）、用心均衡 93% 真結局、普通認真 88%、偏愛／專攻某角色 90～100% 走她的結局。
  - 待辦：支線進階知識卡（第 3 批）、重出 `sensei/sad.webp`。
- 2026-11-28（第 3 批與時長放寬）：Opus 指揮、Sonnet ×2 與 Gemini 4 Neon 平行實作後整合驗收：
  - 教學：7 件原本只發重複卡的支線，各新增 1 張「進階卡」（`gone-410`、`url-parameters`、`responsive-images`、`recipe-schema`、`same-as`、`verify-crawlers`、`information-gain`），知識卡 31 → 38；實戰檢查清單、圖鑑來源與「進階」標籤同步更新。
  - 時長：主線上限由 30 放寬為 35 分鐘（一堂 45～50 分鐘的課可跑完主線並保留說明時間），各場景字數上限不變；還原上一輪為壓時間刪掉的角色台詞與前後呼應（序章「低調計畫」鋪陳、「咖啡可以續杯，人不行」、真結局三十七份申請表、晴雨夜「麥克風的後座力」等），mainDepth 下限回復（w1 因 canonical 段落移到 w3 而為 600）。
  - 美術：`sensei/sad`、`sensei/think` 重繪因出圖配額耗盡（約 98 小時後重置）未完成，原圖未動；`docs/art-requests.md` §8.1 已補完整人工出圖提示詞與驗收檢查表。
  - 結果：測試 137 項全過、e2e 通關 0 錯誤、主線估算 32.3 分鐘、全收集約 76 分鐘、首包 194.8KB gzip，結局分布與前一輪相同。
  - 待辦：`sensei/sad`、`sensei/think` 重繪。
- 2026-11-28（索老師表情重繪）：Gemini 4 Neon 以 Google Colab CLI（L4、`cagliostrolab/animagine-xl-4.0` SDXL 臉部 inpainting，眼鏡框鎖定沿用原圖）重繪 `sensei/sad`、`sensei/think`。第一版驗收退回（think 嘴角下垂像 sad、視線未偏移；sad 眼鏡框變淺變細），修正版通過：sad 八字眉＋嘴角下垂、think 平直嘴型＋視線看向斜上方，四表情眼鏡框一致、外框 0px 偏移。共花費約 1.08 compute units，Colab session 皆已停止。`art:check` 71/71、測試 137 項全過。
- 2026-11-28（改名與 Logo 重新設計）：遊戲由《搜尋戀曲》改名為《直到你找到我 ～青葉學園網站研究社～》（英文 Until You Find Me；「我被你找到」同時指社團網站被找到與女主角被看見）。Sonnet 更新網頁標題與 meta、標題畫面、檢查清單、README、plan.md，並在真結局以社辦字條「我在這裡。謝謝你，終於找到我了。——社辦」呼應片名（第一版讓凜單獨說出片名，偏向凜線而退回）。Gemini 4 Neon 重新設計標題 Logo（霞鶩文楷 TC、OFL；細緻光暈主標＋搜尋框副標，取代 emoji 風放大鏡愛心）與分享預覽圖（以既有背景與立繪重新合成；第一版凜的臂章被遮住而退回），兩張圖由 `node scripts/make-title-art.mjs` 以真實字型產生。repo 名、package 名與 localStorage 前綴 `seo-journey:` 保留以免存檔遺失。測試 137 項全過、`art:check` 71/71、e2e 通關 0 錯誤。
- 2026-11-28（消除 SVG 閃現）：使用者回報進遊戲會先閃一下最初的 SVG 圖。原因是圖片清單 `manifest.json` 非同步載入，載入前一律退回 SVG。Sonnet 實作啟動 Loading 畫面（`index.html` 純 HTML、`src/boot.ts` 等 manifest 與標題圖，上限 6 秒）、場景與非劇本畫面圖片預載（上限 4 秒，超過 200ms 才顯示讀取覆蓋層）、圖片元件載入中不再畫 SVG 而是深色底並淡入。`npm run check:flash` 在 Fast 3G／Slow 3G 節流下從開頁玩到第一週週報，SVG 與文字 Logo 備援皆未出現。測試 152 項全過、e2e 通關、首包 197.6KB gzip。
- 2026-11-28（音訊引擎）：Sonnet 將 `src/audio/` 改為讀取 `public/audio/manifest.json` 播放音檔（Web Audio 解碼、`loopStart`／`loopEnd` 無縫循環、1 秒等功率交叉淡化、SFX 快取與同時發聲上限、第一次互動才解鎖），沒有音檔的 id 沿用原合成聲；新增標題曲 `title`。第一版退回（讀檔後無 BGM、離開標題即淡出造成空檔），修正版把目前 BGM 記入 `stage.bgm`（存檔 v4）、讀檔恢復、標題曲持續到下一首才交叉淡化。音檔（ACE-Step 背景音樂、Stable Audio Open 音效）待使用者試聽挑選後放入。測試 181 項全過、e2e 通關、首包 199.7KB gzip。
- 2026-11-28（系統列統一）：使用者回報選單按鈕散落在各畫面內容面板、與遊戲選項混在一起很出戲。Sonnet 新增 `src/ui/SystemBar.tsx`，所有遊戲中畫面統一在右上顯示「狀態、圖鑑、選單 (Esc)」（劇本畫面另加自動、快轉、紀錄、隱藏；小遊戲只留選單），移除排程、公佈欄、週末、週報內容區的系統按鈕；「在家休息」改為週末第四張選項卡、「前往週末 →」移到公佈欄底部。第一版退回（在家休息卡用了扁平卡通房子、與動漫立繪風格衝突），修正版改用既有房間插圖 `bg/home`。測試 181 項全過、e2e 通關、首包 200.3KB gzip。
- 2026-11-28（音樂與音效）：以 Google Colab 產生正式音訊——背景音樂用 ACE-Step v1 3.5B（Apache 2.0）產 5 首 × 3 版本（無縫循環、−18 LUFS），音效用 Stable Audio Open 1.0（Stability AI Community License，標示「Powered by Stability AI」）產 8 種 × 4 版本（含少數程式合成版）。Gemini 產音效中途額度用盡，Opus 回收已生成的原始檔並停機，後處理與背景音樂改由 Sonnet 接手；共約 5.5 compute units。依使用者要求不事先定版，在標題主選單新增「音樂鑑賞」：可試聽全部版本並「採用這版」（存在設定中，預設為依數據建議的版本），manifest 改為多版本格式（`scripts/build-audio-manifest.mjs` 產生）。產製腳本在 `scripts/colab/{bgm,sfx}/`、流程見 `docs/audio-requests.md`。音檔 35MB（按需載入）、測試 209 項全過、e2e 通關（含音樂鑑賞）、首包 202KB gzip。
- 2026-11-28（口白與美術對齊）：使用者指出「藍黑長直」不自然且與立繪不符（凜立繪為鮮明藍色長髮）。Sonnet 先依全部立繪、背景、CG 整理各角色實際外觀，再逐行檢查並修正 26 個檔案：外觀與背景不符（凜髮色、社辦窗簾、白天場景誤寫夕陽、家政教室等）、CG 前後旁白不一致（普通結局與壞結局的在場人物）、日式或不自然用語（花火、太鼓、罰坐、丁目、後輩、少貧嘴等）。根因是 `plan.md` 角色外觀寫錯，已一併校正並在寫作守則加入「外觀描寫對照立繪、避免動漫圈簡稱與日式用語」。測試 209 項全過、e2e 通關。
- 2026-11-28（美術方向第一階段：社辦文具材質）：使用者指出任務圖卡等養成畫面太像網頁。Opus 定調「世界內物件用社辦文具與學生手帳材質，系統介面保留深藍毛玻璃」。Gemini（Orchestrator Neon）建立純 CSS＋內聯 SVG 材質系統（`src/index.css` 紙張、軟木、木框、印章、便利貼、和紙膠帶 token 與類別）與共用元件 `src/ui/material/`（Corkboard、Paper、Tape、Pin、Stamp、StickyNote、Motifs），重做委託公佈欄為木框軟木板＋圖釘／膠帶固定的委託單（拍立得頭像、「本週截止」朱紅印章、便利貼額度），新增 `docs/ui-art-direction.md` 規範與第二階段藍圖；dev 專用元件展示頁 `?dev=materials`。未新增圖檔、首包 206KB gzip、測試 209 項全過、e2e 通關。
- 2026-11-28（設定開關與語音播放機制）：依使用者要求，設定的音量滑桿改為「音樂／音效／語音」開關（`src/ui/Switch.tsx`，可鍵盤操作；舊設定音量 > 0 遷移為開），關音樂時 BGM 淡出、再開恢復應播曲。Sonnet 建立語音機制：key＝SHA-1(說話者＋台詞原文) 前 12 碼、檔案 `public/audio/voice/<sceneId>/<key>.mp3`、manifest 目前為空；推進／選項／選單／快轉即停，自動模式等語音播完，播放時 BGM 壓低 6 dB，按需載入並預載後 3 行，對話紀錄可重播，語音失敗或逾 4 秒視為無語音。`scripts/list-voice-lines.mjs` 列出 798 行待配音（主角與旁白不配）。Opus 將 sq-m3 一句「和{name}在天台」改為「和你一起在天台」，避免配音去名後不通順。測試 284 項全過、e2e 通關、首包 209KB gzip。
- 2026-11-28（配樂表與音效接線）：依 `docs/audio-review.md` 配樂表，Sonnet 新增 BGM `sim`、`minigame`、`melancholy`、`comedy`、`theme_rin`、`theme_hare`、`theme_mirai` 與音效 `shock`（音檔產出前用合成備援）；排程／公佈欄／週末／週報播 `sim`（不改寫 `stage.bgm`），小遊戲播 `minigame` 並在結束時淡回劇情曲；約會、結局與低落、搞笑段落逐點切曲；小遊戲過關改播 `win`、失敗播 `fail`，暴雨危機改 `shock`，週報依升降播 `grow`／`fail`。預設版本覆寫移到 `scripts/audio/default-picks.json`（title c3、click c3、blip c4、choice c3、fail c4、win c2）。合併時 Opus 解決 `src/store/game.ts` import 衝突，並修正既有問題：小遊戲中按 H 隱藏介面會卸載小遊戲、遺失作答進度，現在小遊戲中忽略 H。測試 301 項全過、e2e 通關、首包 200KB gzip。
- 2026-11-28（美術方向第二階段 a：排程、週報、週末）：Gemini 將平日排程改為攤在社辦木桌上的學生手帳跨頁（星期一～四欄、模切活動貼紙配手繪圖示、手帳方格塗色量表、便利貼風險提醒），排程演出改為拍立得＋每日紀錄頁；週報改為金屬板夾上的評測成績單（表格列＋照片角貼頭像＋鋼筆評分）與方格紙網站數據檢核表；週末改為軟木板上的四張拍立得卡。第一版退回（仍有「左側色條卡片」與彩色圓角數值標籤等網頁慣用樣式），修正版改為模切貼紙、墨水字數值與方格塗色進度。測試 301 項全過、e2e 通關、首包 206KB gzip。
- 2026-11-28（美術方向第二階段 b：小遊戲、圖鑑、狀態）：Gemini 抽出共用 `RetroMonitorFrame`（社辦舊 CRT：米黃機殼、掃描線、電源燈，索老師提示為邊框便利貼）與 `DotMatrixSlip`（點陣印表機結算紙），Quiz／Spot／Serp 全部改用；星等改四芒星。圖鑑改為檔案夾索引籤收藏冊：知識卡雙層框（進階卡箔金、未取得為卡背）、CG 相簿相角、結局名冊印章。狀態改為獨立的雙頁社員手冊（不動共用 Panel）。系統介面維持毛玻璃。測試 301 項全過、e2e 通關（一次 DNS 抖動重跑）、首包 208KB gzip。
