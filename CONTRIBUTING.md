# CONTRIBUTING（平行開發約定）

規格見 `plan.md`，任務進度見 `task.md`。指令：`npm run dev | build | preview | typecheck | test`。路徑別名 `@/` = `src/`。

## 目錄所有權（各階段只改自己的目錄，避免衝突）
| 階段 | 專屬目錄 |
|---|---|
| P1 美術 | `src/art/**`、`public/art/**`、`src/index.css`（主題 token）、`src/ui/TitleScreen.tsx` 的視覺 |
| P2 系統 | `src/systems/**`、`src/ui/schedule/**` 等新 UI、`src/content/activities.ts`、`src/store/game.ts`（只加欄位/動作） |
| P3 劇本 | `src/content/scenes/**`、`src/content/knowledge.ts`（只填 `BODY`） |
| P4 小遊戲 | `src/minigames/**`、`src/content/minigames/**`（資料）、圖鑑/相簿 UI |
| 共用型別 | `src/engine/types.ts`（改動需通知所有階段） |

## 穩定介面（不要改簽名）
- `src/art/characters/index.tsx`：`<CharacterSprite id face speaking />`（600×1000 viewBox，高度撐滿父層）
- `src/art/backgrounds/index.tsx`：`<Background id time />`（填滿 1280×720 父層）
- 圖片覆蓋：以 WebP 為準（`public/art/<id>/<face>.webp`、`public/art/bg/<id>.webp`、`public/art/cg/<id>.webp`），由 `scripts/process-art.mjs` 處理並寫入 `public/art/manifest.json`（鍵 `"<id>/<face>"`、`"bg/<bgId>"`、`"cg/<cgId>"`，值為路徑字串）。製作規格與流程見 `docs/art-requests.md`；`npm run art:check` 檢查進度。
- `src/minigames/index.tsx`：`<MinigameHost id onResolve(won) />`
- `src/audio/index.ts`：`audio.sfx(id)`、`audio.bgm(id)`

## 劇本寫法
- 一個檔案一個場景：`export default scene('<id>', [...])`，**檔名（不含 .ts）必須等於 scene id**，且全專案不可重名。
- 檔案放 `main/ dates/ side/ endings/`，會被 `import.meta.glob` 自動註冊——**不要手動編輯 `src/content/scenes/index.ts`**。
- 每行對白 ≤ 45 字、不得空白；`{name}` 為玩家名字。角色／表情／背景／知識卡／小遊戲 ID 都是型別，拼錯會編譯失敗。
- 新增知識卡 ID：`src/content/knowledge.ts`；新增小遊戲 ID：`src/content/minigames/index.ts`；新增背景：`src/content/backgrounds.ts`。
- `npm test` 內含 `tests/scriptLint.test.ts` 與 `src/systems/estimate.ts` 時長估算。

## 狀態與存檔
- 遊戲狀態：`useGame`（`src/store/game.ts`）；設定：`useSettings`；跨存檔資料（圖鑑/結局/CG/已讀）：`useGlobal`；UI 狀態：`useUI`。
- 要存進存檔的欄位加在 `PersistedGame`（`src/store/save.ts`），**並**：升 `SAVE_VERSION`、新增 `migrations[n]`、補 `normalizeData` 預設值、補測試。
- 所有 localStorage 存取只能透過 `src/store/storage.ts`。

## 系統 ↔ 劇本 介面約定（P2 與 P3 共同遵守）
**場景 ID（＝檔名）**
- 主線 `main/`：`prologue`、`w1`～`w6`、`festival`
- 結局 `endings/`：`end-blackhat`、`end-true`、`end-rin`、`end-hare`、`end-mirai`、`end-normal`、`end-bad`
- 約會 `dates/`：`date-rin-1`～`3`、`date-rin-casual`（hare、mirai 同理）、`weekend-rest`（在家休息）
- 支線 `side/`：`sq-r1`～`sq-r3`、`sq-h1`～`sq-h3`、`sq-m1`～`sq-m3`、`sq-x1`

**流程分工**
- P2 依每週流程呼叫上述場景；`festival` 結束後由 P2 依 plan §2.6 判定並播放 `end-*`。
- 第 6 週的人工處罰（`blackhat ≥ 1`）**寫在 `w6` 劇本內**（`when(flag('blackhat','gte',1), …)`），P2 不重複扣分。
- 週末約會：P2 決定播放哪一場（依該角色已約會次數旗標 `dateCount.rin` 等，以及第 3 場的好感度 ≥ 55 門檻），並在播放後遞增次數旗標；劇本不需處理次數。
- 支線完成：P2 在支線場景結束後設 `sq.<id>.done = true`；解鎖規則由 P2 負責（plan §3.5）。

**旗標命名**
- `blackhat`（數字）、`kuroPending`（第 4 週選「讓我考慮」）、`w6Choice`（數字：1＝rin、2＝hare、3＝mirai）

**資料檔**
- 評語、排程小插曲、失誤台詞、保健室、公佈欄文案：`src/content/flavor.ts`（形狀已固定；P3 填內容，P2 讀取）
- 活動 ID：`src/content/activityIds.ts`；活動數值：`src/content/activities.ts`（P2）
- CG ID：`src/content/cgs.ts`（P1 繪製 `src/art/cg/`，P3 以 `cg(id)` 呼叫）
- 背景另有 `home`（主角房間）、`infirmary`（保健室）

## 平衡（改任何好感／能力數字、門檻、權重前必讀）
- `tests/fullSim.ts` 會用**真實劇本**＋真實排程／支線／約會／結局邏輯，搭配多種「玩家行為」策略（偷懶點擊、隨機亂玩、用心均衡、偏愛某角色、專攻、被黑川誘惑、擺爛…）模擬通關。
- `tests/balance.test.ts` 是回歸測試：用心玩可拿真結局但按鈕狂點不行、專情於一人必走她的結局、7 個結局都能達成。改數值後跑 `npm test`；想看完整分布表：`BALANCE_REPORT=1 npx vitest run tests/balance.test.ts`。
- 全域旋鈕在 `src/systems/score.ts` 的 `TUNING`（`statScale`、`bondMax`）；推薦排程在 `src/content/activities.ts` 的 `RECOMMENDED_SCHEDULE`。
- 黑帽結局需要 `blackhat ≥ 2`：第 4 週接受＋第 6 週再接受（第 6 週的再次邀約在 `kuroPending` 或 `blackhat ≥ 1` 時出現）。
- 個人結局情感門檻：分數最高者達 ≥ 60 之外，還必須看過她的第 3 場約會（`dateCount.<h> ≥ 3`）或第 6 週雨夜選了她（`w6Choice`：1=rin、2=hare、3=mirai）；只看分數最高者，未達門檻則落回普通／壞結局，避免無感情選擇的偷懶點擊誤入告白結局。
- 體力／壓力經濟另有 `tests/economy.test.ts`（`tests/economySim.ts`）：最佳可持續節奏是「3 格工作＋1 格休息」，4 格硬撐會因為焦躁（壓力 ≥ 60，工作收益 ×0.75）、失誤（壓力 ≥ 80，30%）、倒下（體力歸 0 會失去當週週末約會）而吃虧。改活動的體力／壓力數字前先看它。
- 好感度與能力的顯示：網站儀表板的指標由 `src/systems/siteMetrics.ts` 從五項能力推導（示意數據，非真實預測）；結局的「實戰檢查清單」文字在 `src/content/checklist.ts`（31 張知識卡各一條，新增知識卡時要同步補）。
- 劇本裡可用 `hasCard('<id>')` 判斷是否學過知識卡，或用 `seen('<sceneId>')` 判斷是否完成特定場景（例如搜尋祭簡報的進階選項依 `seen('sq-r3')`／`seen('sq-h3')`／`seen('sq-m3')` 出現）。
- 小遊戲星等：3 顆＝第一次全對／零失誤／搜尋結果分數 ≥ 90；2 顆＝第一次過關；1 顆＝重試後過關。最高星等存在 `useGlobal.stars`。

