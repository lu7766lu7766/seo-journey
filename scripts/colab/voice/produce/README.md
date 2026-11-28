# 量產語音（Qwen3-TTS VoiceDesign，口音 A、設計模式）

讀 `scripts/audio/voice-lines.json`（先 `node scripts/list-voice-lines.mjs`，以目前劇本為準）→ 依說話者／NPC 名牌選定案聲音 → 依表情與上下文產生情緒指令 → 12 句一批生成 → 全守門 → 失敗重抽 → 增量下載 → MP3 與 manifest。

```bash
PRODUCE_SMOKE=1 scripts/colab/voice/produce/run_produce.sh   # 煙霧測試：10 句，輸出到 /tmp/seo-journey-audio/voice-produce-smoke/public-voice
PRODUCE_VALIDATE=1 scripts/colab/voice/produce/run_produce.sh # 第四輪驗證集（validate_ids.json）：輸出到 /tmp/seo-journey-audio/voice-r4/work；之後 python3 produce/build_page_r4.py 產生單檔試聽頁
scripts/colab/voice/produce/run_produce.sh                    # 量產：輸出到 public/audio/voice/<sceneId>/<key>.mp3 並更新 manifest.json
```

| 檔案 | 作用 |
| --- | --- |
| `run_produce.sh` | 本機 driver：建 L4、環境準備、上傳、輪詢並增量下載、停 VM、呼叫 finalize |
| `produce.py` | VM 端：建 items、批次生成、守門、重抽、chunk 打包、續跑 |
| `emotion_map.json` / `emotion.py` | 表情＋上下文 → 情緒指令（可讀的對應表）；`tests_emotion.py` 檢查禁用字眼 |
| `speaker_map.json` | 說話者／NPC 名牌 → 聲音 |
| `finalize_produce.py` | 本機：WAV → MP3（−16.7 LUFS、TP ≤ −2 dBTP、淡入淡出）、重算 key 驗證、更新 manifest；第四輪起改用 `postprocess_r4.py` |
| `smoke_ids.json` / `validate_ids.json` | 煙霧測試 10 句／第四輪驗證集（`id@lowvoice` 是翔的聲音描述 A/B 變體，輸出在 `<scene>@lowvoice/`、不進 manifest） |
| `postprocess_r4.py` | 本機後處理 v4：−17.5～−16.0 LUFS（目標 −16.7）、TP ≤ −2 dBTP；短句／高峰值句先過溫和壓縮＋軟限幅 |
| `calibrate_anchors.py` / `build_page_r4.py` | 說話人錨點門檻校準（本機 CPU）／單檔內嵌音檔的試聽頁 |

共用的守門與預處理在 `../r3/r3_common.py`，聲音與門檻在 `../r3/voices_r3.json`，ASR 偏見白名單在 `../r3/asr_equiv.json`。

## 斷點續跑

- 本機 `<WORK>/raw/wav/**.json` 是「已完成」的唯一記錄；`<WORK>` 預設 `/tmp/seo-journey-audio/voice-produce`。
- 每個 chunk（72 句）完成就在 VM 打成 `packs/pack_NNNNN.tar`，driver 每分鐘輪詢並下載解壓到 `raw/`，所以 VM 被回收最多損失一個 chunk。
- 重跑 `run_produce.sh`：本機已完成的 id 以 `done.json` 上傳，VM 跳過；失敗的句子會用新的 seed 再試。
- 同一個 VM 內 `produce.py` 被中斷：state.json 記錄已完成，VM 有但本機沒有的句子會補打成 catch-up pack。

## ASR 權重快取

Paraformer／SenseVoice 第二輪從 ModelScope 下載約 16 分鐘。現在 `r3_common.Evaluator` 先走 Hugging Face（`hub="hf"`），失敗才退回 ModelScope；`setup_vm_r3.py` 另可把快取目錄打包成 `~/.cache/seo-journey-voice/asr-weights.tar`（`PACK_ASR_CACHE=1`，本機沒有快取時預設開啟），之後的 run 會自動上傳並解開。`USE_ASR_CACHE=0` 可停用。

## 失敗句與未列名 NPC

`<WORK>/report.json` 的 `failed` 列出重抽 `MAX_ATTEMPTS`（預設 6）次仍未通過的句子與原因，每個失敗句的 sidecar 在 `raw/failed/`（沒有音檔），最接近通過的 3 個 take 在 `raw/review/`（見下方「第四輪新增」；都不進 manifest，沒有語音時遊戲照常顯示文字）。新的 NPC 名牌若不在 `speaker_map.json`，暫用 `npc_fallback` 並列在 `unmapped_npc`，請人工指定。

## 第四輪新增

- **否定詞一律改正向**：`voices_r3.json`、`emotion_map.json` 不得含「不…／別…／沒有…」，`r3_common.negation_hits` 與兩個測試會掃描；`banned_hits` 不再放行「不破音」。
- **守門**：CER 改為無聲調拼音（`pypinyin`，VM 安裝清單已加；字元 CER 只記在 `cer_char`）；新增 `speaker`（與每個聲音的錨點 `anchors/<id>.mp3` 的 WavLM x-vector 相似度 ≥ `anchor_sim_min`）。量產時錨點要上傳到 VM 的 `/content/anchors/`（run_produce.sh 已處理）。
- **保留失敗 take**：每句最多 3 個「最接近通過」的失敗 take，64 kbps mp3，放 `raw/review/<scene>/<key>__f1..f3.mp3` ＋ `<key>.json`（含 ASR 轉寫與各項指標），一併隨 chunk 下載；`report.json` 的 `failed[]` 列出「全部 take 失敗」的句子、原因、每個 take 的結果與 review 檔名。
- **收斂版情緒指令**：保留表情基底與情緒、語速，只把音高壓在穩定音域（`emotion_map.json` 的 `soften`）。
- **「哎呀」開頭**：加「短促輕快、一帶而過」；英文縮寫與一般英文單字分開提示。
- 本機測試：`python3 r3/tests_r3_common.py`、`python3 produce/tests_emotion.py`、`bash r3/tests_colab_session.sh`（需要 numpy、opencc-python-reimplemented、pypinyin、soundfile）。
