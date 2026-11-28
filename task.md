# task.md — 《搜尋戀曲》任務清單

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
