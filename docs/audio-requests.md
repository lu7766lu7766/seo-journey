# 音訊產製紀錄與重產流程

本文件記錄遊戲背景音樂（BGM）與音效（SFX）候選的產製方式。腳本在 [`scripts/colab/bgm/`](../scripts/colab/bgm/)、[`scripts/colab/sfx/`](../scripts/colab/sfx/)；產製輸出（含試聽頁、波形／頻譜 PNG、原始 WAV）放在 `/tmp/seo-journey-audio/{bgm,sfx}/`，**不進版控**。

> **已放入遊戲，玩家可在「音樂鑑賞」選版本。** 12 首 BGM × 3 個候選、9 種 SFX × 4 個候選的**成品 MP3 全部**放在 `public/audio/{bgm,sfx}/<id>_c<N>.mp3`，標題主選單的「音樂鑑賞」可逐一試聽並採用；預設採用 `scripts/audio/default-picks.json` 指定的候選。`public/audio/manifest.json` 由 [`scripts/build-audio-manifest.mjs`](../scripts/build-audio-manifest.mjs) 依 `scripts/audio/{bgm,sfx}-candidates.json` 與 `scripts/audio/default-picks.json` 產生；格式與引擎行為見 [`CONTRIBUTING.md`](../CONTRIBUTING.md) 的「音訊」。

## 授權標示（必須保留）

| 類別 | 模型／合成方式 | 授權 | 標示 |
| --- | --- | --- | --- |
| 背景音樂（v2 全 12 首） | ACE-Step 1.5（`ACE-Step/Ace-Step1.5`） | MIT License | 「背景音樂：ACE-Step 1.5 生成（MIT）」 |
| 音效（`card`／`grow`／`bond`／`win`） | Stable Audio Open 1.0 | Stability AI Community License | 「音效：Stable Audio Open 生成 — **Powered by Stability AI**」（授權要求的標示） |
| 音效（`click`／`blip`／`choice`／`fail`／`shock`） | 本機 Python 物理／加法／FM 合成（`scripts/colab/sfx/postprocess.py`） | 專案自研（無外部授權限制） | 已整合於整體音效標示內 |

標示出現在：音樂鑑賞畫面底部、標題畫面左下角、設定面板底部。**改版面時不要拿掉**；若之後商用規模超出 Stability AI Community License 的年營收門檻，需另行取得授權。音效候選中標「合成」的是程式合成（非 AI 生成），不受該授權限制。

## 重產後怎麼放進遊戲

1. 把新的 MP3 放進 `public/audio/bgm/`、`public/audio/sfx/`（只放成品 MP3，檔名 `<id>_c<N>.mp3`），並刪掉不再使用的舊檔。
2. 把新的 `candidates.json` 複製成 `scripts/audio/bgm-candidates.json`、`scripts/audio/sfx-candidates.json`。
3. `node scripts/build-audio-manifest.mjs`（會檢查檔案齊全、沒有多餘檔案），再跑 `npm test`。

## 模型與授權

| 項目 | 內容 |
| --- | --- |
| 模型 | ACE-Step v1 3.5B（文字轉音樂擴散模型） |
| 程式碼 | <https://github.com/ace-step/ACE-Step> |
| 權重 | Hugging Face `ACE-Step/ACE-Step-v1-3.5B`（公開，不需要 token） |
| 授權 | Apache License 2.0（可商用，需保留授權與署名聲明） |
| 執行環境 | Google Colab，L4 GPU（22 GiB VRAM）；`bfloat16`、`torch_compile=False` |

遊戲發佈時請在製作人員名單／授權頁註明「Music generated with ACE-Step (Apache-2.0)」。

## 這一輪產出的 5 首（各 3 個候選）

全部純器樂、無人聲，供長時間墊在對白底下，旋律不密、不爆音、無長段寂靜。

| id | 用途 | 風格 | 目標 BPM |
| --- | --- | --- | --- |
| `title` | 標題畫面／開場 | 抒情、帶思念與期待的青春感；鋼琴＋弦樂 | 75–85 |
| `daily` | 社辦、教室、日常育成 | 輕快明亮；木吉他、鐘琴、撥弦、輕打擊 | 105–115 |
| `warm` | 約會、夕陽天台、心動 | 溫柔；鋼琴＋柔和弦樂 | 70–80 |
| `tense` | 黑帽登場、演算法大雨、排名暴跌 | 輕度緊張不安（非恐怖）；撥弦、合成器脈衝、低音 | 95–105 |
| `festival` | 搜尋祭、頒獎 | 熱鬧歡騰；銅管、拍手、太鼓、明亮合成器 | 125–135 |

提示詞與 seed 全部記在 [`scripts/colab/bgm/tracks.json`](../scripts/colab/bgm/tracks.json)（`tracks[].candidates[].prompt/seed`），每首另有備援 seed，供 QA 不合格時重生使用。實際採用的 seed／提示詞（含備援）會寫進輸出的 `candidates.json`。

### 生成參數（`generation_defaults`）

`lyrics="[instrumental]"`、`audio_duration=150`、`infer_step=60`、`guidance_scale=15`、`scheduler_type=euler`、`cfg_type=apg`、`omega_scale=10`、`guidance_interval=0.5`、`use_erg_tag=true`、`use_erg_diffusion=true`，`batch_size=1`。

> ACE-Step 對提示詞中的 BPM 數字只是軟性參考，實際速度常與目標有落差；因此後處理會做速度估計與閘門（見下），並仍需人耳確認。

## 後處理（`postprocess_defaults`）

每個候選的處理順序：

1. 48 kHz 原始 WAV → 去 DC、20 Hz 高通 → 重取樣至 **44.1 kHz** → 修掉開頭過長的靜音並加 15 ms 淡入。
2. **無縫循環點**：以 `librosa` 做節拍追蹤（以目標 BPM 中點當先驗，降低 2:3 倍頻誤判），取每 4 拍為一小節；在小節邊界挑 `loopStart`／`loopEnd`，成本函數綜合 chroma／MFCC 相似度、接縫前後響度差、循環長度（偏好約 95 秒）、`loopStart` 處的 50 ms 能量跳動、8／4 小節樂句整除加分。限制：循環 **60–120 秒**、`loopEnd ≥ 100 秒`（使檔案總長落在約 100–150 秒）。
3. **等功率 crossfade**：把 `loopStart` 之前 1 小節的音訊以 `sin/cos` 等功率曲線疊進 `loopEnd` 前最後 1 小節，檔案在 `loopEnd` 截斷。因此**檔案總長 ＝ `loopEnd`**；`loopEnd` 接回 `loopStart` 時波形本身是連續的。
4. 響度正規化至 **−18 LUFS**（ITU-R BS.1770，`pyloudnorm`），前視峰值限幅，編碼前 true peak 上限 −1.5 dBTP，編碼後再驗證 ≤ −1 dBTP。
5. 編碼：**44.1 kHz 立體聲 MP3 160 kbps**（`libmp3lame`），檔名 `<id>_c<n>.mp3`。
6. 另輸出「循環接縫試聽」MP3：`loopEnd` 前 4 秒＋`loopStart` 後 4 秒（`<id>_c<n>_seam.mp3`），第 4.0 秒即為接縫。
7. 波形＋梅爾頻譜 PNG（`<id>_c<n>.png`），標出 `loopStart`、`loopEnd` 與 crossfade 區間。

### 客觀 QA（對解碼後的最終 MP3 量測，不合格即捨棄並換備援 seed 重生，最多 6 次）

| 項目 | 門檻 |
| --- | --- |
| 整合響度 | −18 ± 1 LUFS |
| true peak（4× 過取樣） | ≤ −1 dBTP |
| 削波 | 0 個取樣 ≥ 0.999 |
| 靜音（50 ms 框 < −45 dBFS） | 無 > 1 秒靜音段，靜音占比 ≤ 5% |
| 接縫（loopEnd 前 50 ms ↔ loopStart 後 50 ms）能量跳動 | ≤ 3.5 dB |
| 循環長度 | 60–120 秒 |
| 檔案總長 | 約 95–155 秒 |
| 人聲殘留 | Whisper `base` 轉寫篩檢（排除常見幻聽字串） |
| 速度 | 折算（×1／×½／×2）後 BPM 落在目標區間 ±15% 內；6 次仍不合者附 `qa_warnings` 收下 |

另記錄（不作為閘門）：BPM 估計值（含原始偵測值）、LRA 近似值、峰值高於均值、頻譜質心、諧波比例。BPM 估計對鋼琴／弦樂這類打擊感弱的曲子並不可靠，只能當參考。

`candidates.json` 含每個候選的 `seed`、`prompt`、`loopStart`／`loopEnd`（`metrics.loop_start_sec`／`loop_end_sec`）、`lufs`、`true_peak_dbtp`、`bpm_*` 等欄位，以及被捨棄的嘗試（`rejected_attempts`）；`recommended_id` 僅依客觀指標排序，**不代表聽感**。

## 在遊戲中使用循環點

引擎以 Web Audio 的 `AudioBufferSourceNode` 播放：

```js
const src = ctx.createBufferSource();
src.buffer = decodedBuffer;
src.loop = true;
src.loopStart = loopStart; // 秒，取自 candidates.json
src.loopEnd = loopEnd;
src.start();
```

首次進入時會先播放 `0 → loopStart` 的前導段，之後在 `loopStart`～`loopEnd` 之間循環。MP3 編碼會在檔頭帶來少量延遲（編碼器 padding），如發現接縫有極輕微偏移，可在引擎端以實測值補償。

## 重產步驟

前置：本機已安裝並登入 Google Colab CLI（`colab`），帳號有可用的 compute units；同一帳號同時只能用一台 GPU。

```bash
# 一次完成：開 L4 session → 安裝 → 生成＋後處理 → 下載 → 停止 session → 建試聽頁
scripts/colab/bgm/run_colab.sh /tmp/seo-journey-audio
# 改用 A100：COLAB_GPU=A100 scripts/colab/bgm/run_colab.sh
```

腳本分工：

| 檔案 | 作用 |
| --- | --- |
| `tracks.json` | 5 首曲目、提示詞、seed、備援 seed、生成與後處理參數 |
| `setup_vm.py` | 在 Colab VM 安裝 ACE-Step 與依賴（保留 Colab 預裝的 CUDA PyTorch；`py3langid` 必須釘 `0.2.2`，新版移除了 `from_pickled_model`） |
| `generate_and_process.py` | 生成、循環點、響度、MP3、QA、PNG，並打包成 `bgm_bundle.tar.gz` |
| `build_audition_page.py` | 由 `candidates.json` 產生 `index.html` 試聽頁 |
| `run_colab.sh` | 串接以上流程，結束時一律 `colab stop` |

注意事項：

- `generate_and_process.py` 單次約需 20–30 分鐘（L4，每個候選約 1 分鐘，含 QA）。若直接用 `colab exec` 會超過許多工具的逾時，建議像本次這樣在 VM 上以 `nohup` 背景執行，再輪詢 `/content/gen.log`；結果在 `/content/bgm_bundle.tar.gz`。
- 腳本支援續跑：`/content/bgm_out/state.json` 記錄已完成的候選，重跑時會略過。
- 只想換某首：修改 `tracks.json` 內該首的 `seed`／`prompt`，刪掉 VM 上 `bgm_out/state.json` 中該候選的鍵再重跑。
- 結束時務必 `colab stop -s bgm-gen`，並以 `colab sessions` 確認無殘留。

### 花費紀錄

L4 約 2.3 CU／小時；單輪完整產製（15 個候選＋重試）約 1.5–2.5 CU。


## 第二輪重產紀錄（v2：12 首 BGM ＋ 5 種重製／新增 SFX）

本輪於 2026-11-28 完成全數 **12 首 BGM**（每首 3 版，共 36 檔）與 **5 種本機物理合成 SFX**（`click`、`blip`、`choice`、`fail`、`shock`，各 4 版共 20 檔）的產製、人工實聽篩選與遊戲整合；既有 `card`、`grow`、`bond`、`win` 維持不變（4 種 × 4 版 = 16 檔）。`public/audio/` 共計 **21 個 ID、72 個 MP3 檔案、36.51 MB**（符合 ≤ 45 MB 上限）。

### 1. ACE-Step 1.5 授權核實

已比對上游倉庫 [`LICENSE`](https://github.com/ace-step/ACE-Step-1.5/blob/main/LICENSE) 與 Hugging Face 模型卡 [`README.md`](https://huggingface.co/ACE-Step/Ace-Step1.5/blob/main/README.md)，確認 **ACE-Step 1.5** 採用 **MIT License**（有別於 v1 的 Apache 2.0）。因此同步將標題畫面（[`src/ui/TitleScreen.tsx`](../src/ui/TitleScreen.tsx)）、設定面板（[`src/ui/SettingsPanel.tsx`](../src/ui/SettingsPanel.tsx)）與音樂鑑賞（[`src/ui/MusicGallery.tsx`](../src/ui/MusicGallery.tsx)）的標示更新為「背景音樂：ACE-Step 1.5 生成（MIT）」，並保留沿用自 Stable Audio Open 1.0 之音效標示「音效：Stable Audio Open 生成 — Powered by Stability AI」。

### 2. BGM（ACE-Step 1.5，Colab L4）

- **模型與環境**：`ACE-Step/Ace-Step1.5`（`acestep-v15-turbo` ＋ `acestep-5Hz-lm-1.7B`，`thinking: true`、`instrumental: true`、`inference_steps: 8`、`guidance_scale: 7.0`、`shift: 3.0`、`infer_method: "ode"`、`duration: 82` 秒），於 Colab NVIDIA L4（22.03 GiB VRAM）產製，共耗費 **4 CU**。
- **後製與自動 QA 規格**：44.1 kHz 立體聲、128 kbps MP3、目標響度 `-18 ± 1 LUFS`、True Peak `≤ -1.0 dBTP`（編碼前峰值上限 `-1.5 dBTP`）、無縫循環區間 `42–68 秒`（接縫 500ms 最大音量跳動 `≤ 1.5 dB`、cosine 相似度 `≥ 0.72`）。
- **篩選結果（共 111 次生成 → 78 首過 QA → 36 首入選／42 首實聽淘汰）**：
  - 自動 QA 淘汰 **33 首**（主要觸發接縫 500ms 跳動超標、長靜音／靜音比例過高或檢出疑似人聲標籤）。
  - 人工逐首完整試聽（含正曲與 `_seam.mp3` 接縫試聽檔）共 **78 首**，依 [`docs/audio-review.md`](./audio-review.md) 硬性規則淘汰 42 首，12 首全數足額選出 `c1..c3`（無硬湊曲目）：
    - `title`：QA 通過 6 ／ QA 淘汰 5 → 入選 `c1..c3`
    - `daily`：QA 通過 7 ／ QA 淘汰 2 → 入選 `c1..c3`
    - `sim`：QA 通過 7 ／ QA 淘汰 0 → 入選 `c1..c3`
    - `minigame`：QA 通過 7 ／ QA 淘汰 1 → 入選 `c1..c3`
    - `warm`：QA 通過 5 ／ QA 淘汰 5 → 入選 `c1..c3`
    - `melancholy`：QA 通過 7 ／ QA 淘汰 2 → 入選 `c1..c3`
    - `tense`：QA 通過 5 ／ QA 淘汰 7 → 入選 `c1..c3`
    - `comedy`：QA 通過 7 ／ QA 淘汰 0 → 入選 `c1..c3`
    - `festival`：QA 通過 7 ／ QA 淘汰 1 → 入選 `c1..c3`
    - `theme_rin`：QA 通過 7 ／ QA 淘汰 2 → 入選 `c1..c3`
    - `theme_hare`：QA 通過 7 ／ QA 淘汰 2 → 入選 `c1..c3`
    - `theme_mirai`：QA 通過 6 ／ QA 淘汰 6 → 入選 `c1..c3`

### 3. SFX（本機 Python 物理／加法／FM 合成 ＋ 舊檔沿用）

為避免佔用同時段配音任務的 Colab GPU，`click`、`blip`、`choice`、`fail`、`shock` 全數於本機使用 [`scripts/colab/sfx/postprocess.py`](../scripts/colab/sfx/postprocess.py)（`numpy`／`scipy`／`pyloudnorm`）合成、後製並逐一實聽定案（0 Colab CU）：

- `click`（51.9–65.4 ms，`-25.03`～`-26.35 LKFS`）：雪松木／木魚／鍵帽／毛氈等 4 種短瞬態點擊音。
- `blip`（51.9–55.9 ms，`-26.45 LKFS`）：馬林巴／毛氈／木滴／氣泡上揚等 4 種輕巧對話氣泡音。
- `choice`（477.0–497.4 ms，`-18.70`～`-19.51 LKFS`）：經高通濾除低頻濁感的鋼片琴／八音盒／拇指琴／馬林巴上行雙音。
- `fail`（662.5–697.5 ms，`-18.71`～`-19.65 LKFS`）：校園日常感可愛兩音下行嘆氣音型（馬林巴、柔音毛氈鍵、低音木琴、巴松管＋馬林巴組合）。
- `shock`（539.8–668.5 ms，`-18.94`～`-19.58 LKFS`）：暴雨危機事件專用「驚覺一跳」懸疑張力重音（弦樂撥奏、鋼琴弱拍重音、豎琴緊弦刺音、懸疑三全音和弦，不帶恐怖感或刺耳噪音）。
- 沿用舊版 Stable Audio Open 1.0 音效：`card`、`grow`、`bond`、`win`（[`scripts/audio/default-picks.json`](../scripts/audio/default-picks.json) 維持 `sfx/win: c2`，其餘所有 BGM 與重製／新增 SFX 皆設為實聽首選 `c1`）。

### 4. 候選清單與本地試聽頁

- 所有保留候選的實聽評語、分數與淘汰摘要皆收錄於 [`scripts/audio/bgm-candidates.json`](../scripts/audio/bgm-candidates.json) 與 [`scripts/audio/sfx-candidates.json`](../scripts/audio/sfx-candidates.json)；執行 `node scripts/build-audio-manifest.mjs` 即可重建 [`public/audio/manifest.json`](../public/audio/manifest.json)。
- 本機整合與試聽頁產出位置在 `/tmp/seo-journey-audio/v2/index.html`（不進版控），透過 [`scripts/colab/bgm/build_audition_page.py`](../scripts/colab/bgm/build_audition_page.py) 生成。
