# 遊戲音效（SFX）生成與後處理（v2）

v2 採用雙軌策略：
- **`click`、`blip`（≤ 95ms / ≤ 60ms 極短 UI 音）**：全面採用本機 Python 物理建模雙極點阻尼共振合成＋**4 kHz 零相位四階 Butterworth 低通濾波**，消除擴散模型常見的 4–6 kHz 靜電毛刺（非 AI 生成，無外部授權限制）。
- **`choice`（320–550 ms 上行雙音）、`fail`（500–750 ms 可愛兩音下行）、`shock`（500–800 ms 校園危機驚訝重音）**：以 **Stable Audio Open 1.0** 在 Colab GPU 上重新抽卡（各 16 候選）並經人耳親自完整聆聽挑選 4 版。
- **`card`、`grow`、`bond`、`win`**：保留 v1 經實聽驗證優質的 Stable Audio Open 1.0 音檔，僅調整推薦預設並補上實聽評語。

## 模型與授權

- 模型：`stabilityai/stable-audio-open-1.0`（gated，需於 Hugging Face 同意條款後才能下載）。
- 授權：**Stability AI Community License**（非商業用途或年營收 ≤ 100 萬美元免費使用）。
- 標示義務：遊戲內音樂鑑賞、標題畫面與設定面板必須保留 **「Powered by Stability AI」**。
- 「Python 合成」候選（`click`、`blip`）由 `postprocess.py` 內的數學物理建模合成產生，非 AI 生成，不受上述授權約束。

## 9 個音效（v2 規格）

| ID | 用途 | 來源 | 目標長度 | 響度層級 |
|---|---|---|---|---|
| `click` | 推進對白、按鈕輕點（極頻繁） | 本機物理合成（4 kHz 低通） | 45–95 ms | quiet_click（−24.5 LKFS） |
| `blip` | 打字機逐字「嘀」（每 3 字一次） | 本機物理合成（4 kHz 低通） | ≤ 60 ms | quiet_blip（−26.0 LKFS） |
| `choice` | 選擇劇情選項（清亮上行雙音） | Stable Audio Open 1.0 | 320–550 ms | standard（−17 LKFS） |
| `card` | 解鎖知識卡（鐘琴琶音） | Stable Audio Open 1.0（沿用 v1） | 0.6–1.0 s | standard |
| `grow` | 能力值上升（向上三音叮） | Stable Audio Open 1.0（沿用 v1） | 0.4–0.7 s | standard |
| `bond` | 好感度上升（豎琴／鈴聲滑音） | Stable Audio Open 1.0（沿用 v1） | 0.6–1.2 s | standard |
| `fail` | 失誤／倒下（可愛兩音下行噗咚） | Stable Audio Open 1.0 | 500–750 ms | standard（−17 LKFS） |
| `win` | 小遊戲過關（歡樂小樂句） | Stable Audio Open 1.0（沿用 v1） | 1.0–1.8 s | standard |
| `shock` | 演算法暴雨危機驚訝重音（不恐怖） | Stable Audio Open 1.0 | 500–800 ms | standard（−17 LKFS） |

## 本機執行 `click` / `blip` 物理合成與連發預覽

```bash
python3 scripts/colab/sfx/postprocess.py --mode synth-local \
  --prompts scripts/colab/sfx/prompts.json \
  --out-dir /tmp/seo-journey-audio/v2/sfx_local
```

## Colab 生成（`choice` / `fail` / `shock`）

**Hugging Face token 只能上傳到 VM `/content/.hf_token`，下載後由 `colab_generate.py` 立即刪除，不得寫入腳本或 log。**

```bash
SFX_ONLY=choice,fail,shock ROUND_TAG=r2 python3 /content/colab_generate.py
```

本機後處理＋輸出試聽 MP3：

```bash
python3 scripts/colab/sfx/postprocess.py --mode triage --export-mp3 --sfx-only choice,fail,shock \
  --raw-dir /tmp/seo-journey-audio/v2/sfx_raw/sfx_raw \
  --prompts scripts/colab/sfx/prompts.json \
  --out-dir /tmp/seo-journey-audio/v2/sfx_triage
```
