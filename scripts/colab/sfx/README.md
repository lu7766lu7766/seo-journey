# 遊戲音效（SFX）生成與後處理

用 **Stable Audio Open 1.0** 在 Colab GPU 上生成 8 種音效的候選原始檔，再於本機後處理、依客觀指標挑選、輸出 MP3 與試聽頁。本目錄只放腳本與提示詞；產製輸出（試聽頁、PNG、原始 WAV）在 `/tmp/seo-journey-audio/sfx/`，不進 repo；挑出的成品 MP3 已放進 `public/audio/sfx/`，玩家可在「音樂鑑賞」選版本（見 [`docs/audio-requests.md`](../../../docs/audio-requests.md)）。

## 模型與授權

- 模型：`stabilityai/stable-audio-open-1.0`（gated，需於 Hugging Face 同意條款後才能下載）。
- 授權：**Stability AI Community License**。非商業用途，或組織年營收 ≤ 100 萬美元可免費使用；超過需另洽 Stability AI。
- 標示義務：產品／網站／製作人員名單需註明 **「Powered by Stability AI」**。試聽頁頁首已標「音效由 Stable Audio Open 生成 — Powered by Stability AI」；遊戲內已在音樂鑑賞、標題畫面與設定面板標示。
- 「Python 合成」候選（`click`、`blip`）由 `postprocess.py` 內的數學合成產生，非 AI 生成，不受上述授權約束。

## 8 個音效

| ID | 用途 | 目標長度 | 響度層級 |
|---|---|---|---|
| `click` | 推進對白、按鈕輕點（極頻繁，低調） | ≤ 120 ms | quiet_click（約比標準低 8 dB） |
| `blip` | 打字機逐字顯示（每 3 字一次，極頻繁） | ≤ 60 ms | quiet_blip（約比標準低 9 dB） |
| `choice` | 選擇劇情選項，清亮雙音小鈴 | 200–350 ms | standard |
| `card` | 解鎖知識卡，鐘琴琶音 | 0.6–1.0 s | standard |
| `grow` | 能力值上升，向上的「叮」 | 0.4–0.7 s | standard |
| `bond` | 好感度上升，豎琴／鈴聲滑音 | 0.6–1.0 s | standard |
| `fail` | 失誤／倒下，輕鬆帶喜感的下降「噗咚」 | 0.4–0.8 s | standard |
| `win` | 小遊戲過關，簡短歡樂小樂句 | 1.0–1.8 s | standard |

## 提示詞

完整提示詞（每個音效 3 個變體 × 4 個 seed = 12 個原始檔）、負面提示詞、`audio_end_in_s`、seed 都在 [`prompts.json`](./prompts.json)，是唯一的資料來源；檔名 `{id}_r1_p{變體}_s{seed}.wav`。共用設定：`num_inference_steps=100`、`guidance_scale=7.0`、負面提示詞為 `background noise, ambient room tone, crowd, speech, voices, harsh, distorted, clipping, long reverb, echo, muddy, low quality, loop, continuous music, drums, bassline, static hiss`。

各音效的第一個提示詞（p1）摘要：

- `click`：soft wooden click, gentle warm woodblock tap, dry tactile UI button press
- `blip`：tiny soft pitched UI text blip, gentle short sine tone pop
- `choice`：two-note ascending glockenspiel chime, crisp cheerful menu select
- `card`：sparkling ascending glockenspiel arpeggio, gentle magical card unlock
- `grow`：cheerful ascending three-note xylophone and bell chime, stat level up ding
- `bond`：warm tender ascending concert harp glissando, romantic heartwarming
- `fail`：lighthearted comedic descending two-note muted marimba and soft cartoon boing plop
- `win`：short joyful victory fanfare on bright glockenspiel, warm piano and light bells

## 流程

### 1. Colab 生成（`colab_generate.py`）

在 Colab（GPU runtime，例如 L4）執行。**Hugging Face token 只能放在 VM 暫存檔，不得寫入腳本、筆記本儲存格或命令列。**

1. 上傳 `prompts.json` 與 `colab_generate.py` 到 `/content/`。
2. 以檔案上傳（不是貼進儲存格）把 token 放到 `/content/.hf_token`。
3. 執行 `python /content/colab_generate.py`。腳本會：
   - 從 `/content/.hf_token` **讀檔**取得 token，下載模型快照；
   - 下載完成後**立刻刪除**所有 token 檔（`/content/.hf_token`、`~/.cache/huggingface/token`、`~/.huggingface/token`）並驗證確實不存在，之後的推論完全離線；
   - 依 `prompts.json` 逐一生成，做 VM 內健康檢查（峰值、底噪、有效長度），寫入 `generation_manifest.json`；
   - 打包成 `/content/sfx_raw.tar.gz`。
4. 下載 `sfx_raw.tar.gz`；用完請中斷並刪除 Colab runtime。

腳本不含任何 token 字串。如曾在其他地方貼過 token，請到 Hugging Face 撤銷後重發。

### 2. 本機後處理

需求：Python 3.9+、`numpy soundfile pyloudnorm scipy matplotlib`，以及 `ffmpeg`（含 libmp3lame）。

```bash
python3 -m venv venv && venv/bin/pip install numpy soundfile pyloudnorm scipy matplotlib
mkdir raw && tar xzf sfx_raw.tar.gz -C raw     # 得到 raw/sfx_raw/{id}/*.wav 與 generation_manifest.json
S=scripts/colab/sfx

# (a) 分流：處理全部候選（含 click/blip 的程式合成備案），輸出接觸表與 triage_summary.json
venv/bin/python -I $S/postprocess.py --mode triage \
  --raw-dir raw/sfx_raw --prompts $S/prompts.json --out-dir out/triage

# (b) 依客觀指標每個音效挑 4 個 → selection.json（c1 = 建議首選）
venv/bin/python -I $S/select_candidates.py \
  --triage out/triage/triage_summary.json --raw-dir raw/sfx_raw \
  --prompts $S/prompts.json --out out/selection.json

# (c) 輸出 MP3 + 波形/頻譜 PNG + 重新量測 final_metrics.json
venv/bin/python -I $S/postprocess.py --mode finalize \
  --raw-dir raw/sfx_raw --prompts $S/prompts.json \
  --selection out/selection.json --out-dir /tmp/seo-journey-audio/sfx \
  --metrics-out out/final_metrics.json

# (d) candidates.json 與試聽頁 index.html
venv/bin/python -I $S/build_preview.py --metrics out/final_metrics.json \
  --out-dir /tmp/seo-journey-audio/sfx
```

### 後處理參數

- 轉單聲道 44.1 kHz（左右聲道相消時取能量較大一側），40 Hz 二階高通去直流／低頻隆隆聲。
- `click`／`blip`：若原檔含多個擊發，先挑出峰值最強且最緊湊的單一事件。
- 起音偵測：1.5–4 ms RMS 包絡 −30 dB 後，再在取樣點精修（−36 dB re peak），**保留 3.5 ms 起音前緩衝**（輸出量測落在 2–5 ms）；前 2.2 ms 做升餘弦漸入，避免爆音。
- 結尾：偵測 −45 dB 自然收尾點＋小緩衝，並裁在目標長度上限內（不足下限則補靜音到下限）；升餘弦淡出——`click` 24、`blip` 20.5、`choice` 50、`card` 45、`grow` 40、`bond` 45、`fail` 40、`win` 45（ms）。
- 響度（ITU-R BS.1770 K 加權，全片）：
  - standard：峰值 −3 dBFS、目標約 −17 LKFS（容許 −19.5 ~ −15.5；過安靜才用輕度 tanh 軟限幅補足，過響則降增益）；
  - quiet_click：峰值約 −9.5 dBFS、目標約 −24.5 LKFS；quiet_blip：峰值約 −10.5 dBFS、目標約 −26 LKFS。
  - 最後以 −0.5 dBFS 為硬上限，確保無削波。
- 編碼：`ffmpeg -c:a libmp3lame -b:a 128k -ac 1 -ar 44100`，再**解碼 MP3 回來重新量測**，所有數據都是 MP3 解碼後的實際值；若長度超出上限會自動調整裁切重做。

### 客觀挑選（`select_candidates.py`）

只用可量測指標打分，不聽聲音；分數越高越好：

- 乾淨度：處理後 SNR、原始檔 SNR（來自 `generation_manifest.json`）、結尾底噪；
- 起音：起音前靜音偏離 2–5 ms 的程度；
- 自然收尾：淡出開始前的殘餘電平（越低代表不是在還在響的時候被硬裁）；
- 長度：落在目標範圍內；`click`／`blip` 另外偏好更短、衰減更快、頻譜質心不過亮（避免嘶聲）；非 click/blip 的音效若大半是補出來的靜音則扣分；
- 響度貼近該層級目標；削波直接重扣。
- 每個音效取 4 個，同一提示詞變體最多 2 個以保留差異；`click`／`blip` 至少 2 個 AI 候選、最多 2 個程式合成。排名第 1 者為 `c1`（建議首選）。

> 這是**依數據**的建議，未經人耳確認；請實際試聽 `index.html` 後再定案。已知限制：數據分不出「旋律好不好聽」「下降音感有沒有」，這些需要人耳判斷。

## 檔案

| 檔案 | 用途 |
|---|---|
| `prompts.json` | 8 種音效的提示詞、seed、目標長度、響度層級 |
| `colab_generate.py` | Colab 端生成（token 讀檔後立刻刪除） |
| `postprocess.py` | 本機分流／輸出 MP3、量測、波形頻譜圖、程式合成備案 |
| `select_candidates.py` | 客觀評分與挑選 |
| `build_preview.py` | 產生 `candidates.json` 與試聽頁 `index.html` |
