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
- PNG 覆蓋：`public/art/manifest.json` 以 `"<charId>/<face>": true`、`"bg/<bgId>": true` 宣告，檔案放 `public/art/<id>/<face>.png`、`public/art/bg/<id>.png`。
- `src/minigames/index.tsx`：`<MinigameHost id onResolve(won) />`
- `src/audio/index.ts`：`audio.sfx(id)`、`audio.bgm(id)`

## 劇本寫法
- 一個檔案一個場景：`export default scene('<id>', [...])`，並在 `src/content/scenes/index.ts` 的 `SCENE_LOADERS` 註冊（key 必須等於 scene id）。
- 檔案放 `main/ dates/ side/ endings/`；每個檔案都必須註冊（測試會檢查）。
- 每行對白 ≤ 45 字、不得空白；`{name}` 為玩家名字。角色／表情／背景／知識卡／小遊戲 ID 都是型別，拼錯會編譯失敗。
- 新增知識卡 ID：`src/content/knowledge.ts`；新增小遊戲 ID：`src/content/minigames/index.ts`；新增背景：`src/content/backgrounds.ts`。
- `npm test` 內含 `tests/scriptLint.test.ts` 與 `src/systems/estimate.ts` 時長估算。

## 狀態與存檔
- 遊戲狀態：`useGame`（`src/store/game.ts`）；設定：`useSettings`；跨存檔資料（圖鑑/結局/CG/已讀）：`useGlobal`；UI 狀態：`useUI`。
- 要存進存檔的欄位加在 `PersistedGame`（`src/store/save.ts`），**並**：升 `SAVE_VERSION`、新增 `migrations[n]`、補 `normalizeData` 預設值、補測試。
- 所有 localStorage 存取只能透過 `src/store/storage.ts`。
