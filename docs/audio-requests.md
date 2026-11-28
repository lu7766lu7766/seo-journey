# 音訊產製紀錄與重產流程

本文件記錄遊戲背景音樂（BGM）候選的產製方式。音檔本身**不進版控**，輸出在 `/tmp/seo-journey-audio/bgm/`（MP3、波形＋頻譜 PNG、`candidates.json`、`index.html` 試聽頁）。腳本在 [`scripts/colab/bgm/`](../scripts/colab/bgm/)。

> 本輪只產生候選並提供試聽頁，尚未放進遊戲；由製作人試聽後挑選，再另開工作接入音訊引擎。

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
