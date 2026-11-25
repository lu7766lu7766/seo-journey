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
- [~] 截圖審查（全角色 × 全表情、全背景）＋總監簽核（延至 P5 Playwright 截圖一併審查）

## P2 養成系統
- [ ] `activities.ts`：8 種活動數值（plan §2.4）
- [ ] 排程規則：本週主題 ×1.5、體力 < 20 效果減半、體力 0 進保健室、壓力 ≥ 80 有 30% 失誤、15% 小插曲
- [ ] 每週流程狀態機：主線 → 排程 → 放學後 → 週末 → 評測 → 下一週／搜尋祭
- [ ] 排程 UI（4 格、拖放或點選、預覽數值變化）＋成長結果動畫
- [ ] 狀態面板（五角雷達圖、體力與壓力條、三人好感度、週次）
- [ ] 委託公佈欄（支線解鎖條件：週次範圍、前置任務；每週最多 2 件）
- [ ] 週末行動選擇（約會 1／2／3 階段、≥ 55 門檻、未達門檻播普通相處）
- [ ] 週評測動畫（好感度變化＋一句評語）
- [ ] 黑帽旗標與第 6 週人工處罰
- [ ] 結局判定（plan §2.6，含平手規則）
- [ ] 平衡模擬測試（plan §7.3 五種策略）＋數值校準
- [ ] 總監簽核

## P3 劇本（遵守 plan §3.2 寫作守則、§3.6 事實表）
- [ ] 序章「404 號社辦」（≤ 1,300 字）
- [ ] 第 1 週「看不見的網站」
- [ ] 第 2 週「一句話的勇氣」
- [ ] 第 3 週「說給機器聽的語言」
- [ ] 第 4 週「快一點，再快一點」（含黑川）
- [ ] 第 5 週「被引用的理由」
- [ ] 第 6 週「演算法的大雨」（含人工處罰分支、雨中三選一）
- [ ] 搜尋祭（三評審 × 3 段評語）
- [ ] 結局 × 7
- [x] 約會：凜 × 3＋普通相處
- [x] 約會：晴 × 3＋普通相處
- [x] 約會：未來 × 3＋普通相處
- [ ] 支線：sq-r1、sq-r2、sq-r3（凜）
- [ ] 支線：sq-h1、sq-h2、sq-h3（晴）
- [ ] 支線：sq-m1、sq-m2、sq-m3（未來）
- [ ] 支線：sq-x1（黑川）
- [x] 排程小插曲台詞＋週評測評語
- [x] 知識卡內文 × 31（summary／detail／misconception）
- [ ] 劇本 lint＋時長估算通過（主線 ≤ 30 分鐘、全收集 60～90 分鐘）
- [ ] 總監審稿（口吻、正確性、節奏）＋簽核

## P4 小遊戲與收集
- [ ] quiz 引擎（多題、解說）
- [ ] spot 引擎（點選行、多目標、限錯 3 次）
- [ ] serp 引擎（片段組合、即時預覽、評分）
- [ ] 主線題目資料：W1 spot、W2 serp、W3 spot、W4 quiz
- [ ] 支線題目資料 × 10
- [ ] 小遊戲單元測試
- [ ] 知識卡圖鑑頁
- [ ] 回憶相簿（結局 CG × 7＋約會畫面）
- [ ] 結局列表（未達成時顯示提示）
- [ ] 練習模式（重玩小遊戲）
- [ ] 總監簽核

## P5 打磨
- [ ] Web Audio 音效（點擊、文字嗶聲、選項、成長、好感度上升）
- [ ] Web Audio BGM × 3（日常、溫馨、搜尋祭）
- [ ] 轉場與演出（fade、flash、震動、CG 展示）
- [ ] 無障礙（對比、鍵盤焦點、減少動態偏好）
- [ ] 效能：code split 檢查、首包 JS < 250KB gzip、字型載入
- [ ] Playwright e2e：自動通關主線＋讀檔、設定、圖鑑頁
- [ ] 1280×720／1920×1080 截圖審查
- [ ] 總監簽核

## P6 部署
- [ ] README（玩法、開發指令、部署方式）
- [ ] 最終 QA：`vite preview` 完整通關
- [ ] 推送分支
- [ ] Vercel 部署（使用者匯入 repo，或提供 token 由 CLI 部署）
- [ ] 線上版煙霧測試

---

## 進度紀錄
- 2026-11-25：完成 plan.md 與 task.md；P0 開始（Sonnet 執行中）。
- 2026-11-25：P0 完成（Sonnet）：typecheck／test(25)／build 通過，主 chunk 129KB gzip；Playwright 煙霧測試（標題→名字→demo→選項→backlog→存/讀檔→重載）無 console error，截圖在 scratchpad；待總監簽核＋commit。
- 2026-11-25：P0 總監簽核。劇本註冊改為 import.meta.glob 自動註冊（檔名＝scene id）。待改進：選項按鈕對比偏低（交給 P1 處理）。接著平行展開 P1／P2／P3／P4。
- 2026-11-25：平行派出 6 個 Sonnet（各自在 git worktree）：P1 美術（凜打樣＋背景＋標題＋UI）、P2 養成系統、P3a 主線與結局、P3b 約會＋flavor＋知識卡、P3c 10 個支線、P4 小遊戲與收集。完成後由總監審查並合併到 main。
- 2026-11-25：P3b（約會、flavor、知識卡）總監審稿通過並合併；修正 date-rin-3 旁白人稱。
- 2026-11-25：P1 完成：5 位角色 SVG 立繪（10 表情＋眨眼／說話／呼吸）、15 張背景（含日暮夜色調與櫻花／星空粒子）、10 張事件 CG、標題畫面與高對比選項 UI；typecheck／test(32)／build 全過（主包 148.5KB gzip）。
