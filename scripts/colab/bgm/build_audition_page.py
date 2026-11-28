"""Build a self-contained Traditional Chinese HTML audition page from candidates.json."""

import html
import json
import sys
from pathlib import Path


def build_rationale(track: dict, cand: dict) -> str:
    m = cand["metrics"]
    t_min, t_max = track["target_bpm"]
    bpm_note = (
        f"估算節奏 {m['bpm_musical']} BPM 落在目標區間 {t_min}–{t_max} BPM 內"
        if t_min <= m["bpm_musical"] <= t_max
        else f"估算節奏 {m['bpm_musical']} BPM（原始偵測 {m['bpm_estimated']} BPM）"
    )
    return (
        f"客觀評分最高（{m['objective_score']} 分）：接縫能量差僅 {m['seam_jump_db']} dB、"
        f"整合響度 {m['lufs']} LUFS（峰值 {m['true_peak_dbtp']} dBTP）、"
        f"{bpm_note}，且無靜音段與人聲殘留。"
    )


def render_html(data: dict) -> str:
    tracks = data["tracks"]
    env = data.get("environment", {})
    model = data.get("model", {})
    pp = data.get("postprocess_defaults", {})
    note = data.get(
        "ranking_basis_note",
        "推薦首選係依據客觀聲學指標（接縫能量跳動、響度穩定度、目標 BPM 貼合度、諧波比例與對白襯底動態平穩度）"
        "及波形／頻譜圖檢視排序；本頁不進行主觀聽感臆測，最終選曲請由製作人親自試聽確認。",
    )

    nav_links = "\n".join(
        f'<a class="pill" href="#track-{html.escape(t["id"])}">{html.escape(t["id"])} · {html.escape(t["title_zh"])}</a>'
        for t in tracks
    )

    sections_html = []
    for t in tracks:
        tid = t["id"]
        rec_id = t.get("recommended_id", "")
        cards = []
        for c in t["candidates"]:
            m = c["metrics"]
            is_rec = c["id"] == rec_id
            vc = m.get("vocal_check", {})
            vocal_label = "通過（無清晰人聲）" if not vc.get("has_vocals", False) else f"異常：{vc.get('filtered_text', '')}"
            warn_html = ""
            if m.get("qa_warnings"):
                warn_html = (
                    '<p class="rationale warn">QA 警示：'
                    + html.escape("；".join(m["qa_warnings"]))
                    + "（重生 6 次仍未達標，附警示收下，請試聽判斷是否可用）</p>"
                )
            rec_badge = '<span class="badge badge-rec">客觀推薦首選</span>' if is_rec else ""
            rationale_html = (
                f'<p class="rationale">{html.escape(c.get("recommendation_reason") or build_rationale(t, c))}</p>'
                if is_rec
                else ""
            )

            cards.append(
                f"""
        <article class="card {'card-rec' if is_rec else ''}" id="cand-{html.escape(c['id'])}">
          <div class="card-head">
            <div>
              <h3>{html.escape(c['id'])}</h3>
              <span class="seed-tag">Seed {c['seed']} · 評分 {m['objective_score']}</span>
            </div>
            {rec_badge}
          </div>
          {rationale_html}
          {warn_html}
          <div class="player-box">
            <div class="player-row">
              <span class="player-label">完整曲目試聽（含前導段＋循環段）</span>
              <button type="button" class="loop-btn" data-audio="audio-{html.escape(c['id'])}"
                data-loop-start="{m['loop_start_sec']}" data-loop-end="{m['loop_end_sec']}">
                無縫循環預覽：關
              </button>
            </div>
            <audio id="audio-{html.escape(c['id'])}" controls preload="metadata" src="{html.escape(c['filename'])}"></audio>
          </div>

          <div class="player-box seam-box">
            <div class="player-row">
              <span class="player-label">循環接縫試聽（接縫前 4 秒 ＋ 接縫後 4 秒，第 4.0 秒為 loopEnd→loopStart 切換點）</span>
            </div>
            <audio controls preload="metadata" src="{html.escape(c['seam_filename'])}"></audio>
          </div>

          <dl class="metrics">
            <div><dt>總長</dt><dd>{m['duration_sec']} s</dd></div>
            <div><dt>循環區間</dt><dd>{m['loop_start_sec']:.2f}s → {m['loop_end_sec']:.2f}s ({m['loop_duration_sec']:.2f}s / {m['loop_bars']} 小節)</dd></div>
            <div><dt>Crossfade</dt><dd>{m['xfade_sec']:.2f} s（等功率 1 小節）</dd></div>
            <div><dt>整合響度 / 峰值</dt><dd>{m['lufs']} LUFS / {m['true_peak_dbtp']} dBTP</dd></div>
            <div><dt>削波取樣</dt><dd>{m['clipped_samples']}</dd></div>
            <div><dt>靜音占比 / 最長</dt><dd>{m['silence_ratio']*100:.2f}% / {m['max_silence_sec']:.2f} s（&gt;1s: {m['long_silence_count']}）</dd></div>
            <div><dt>接縫能量跳動</dt><dd>{m['seam_jump_db']} dB（±50ms）</dd></div>
            <div><dt>BPM 估計</dt><dd>{m['bpm_musical']} BPM（偵測 {m['bpm_estimated']}）</dd></div>
            <div><dt>動態平穩度</dt><dd>LRA {m['lra_approx_db']} dB / 峰值高於均值 +{m['max_1s_above_lufs_db']} dB</dd></div>
            <div><dt>頻譜質心 / 諧波比</dt><dd>{m['spectral_centroid_hz']} Hz / {m['harmonic_ratio']}</dd></div>
            <div><dt>人聲篩檢</dt><dd>{html.escape(vocal_label)}</dd></div>
          </dl>

          <details class="prompt-details">
            <summary>檢視 ACE-Step 提示詞與生成參數</summary>
            <p class="prompt-text">{html.escape(c['prompt'])}</p>
          </details>

          <figure class="spec-figure">
            <img src="{html.escape(c['plot_filename'])}" alt="{html.escape(c['id'])} 波形與頻譜圖" loading="lazy" />
          </figure>
        </article>
                """.strip()
            )

        sections_html.append(
            f"""
    <section class="track-section" id="track-{html.escape(tid)}">
      <div class="track-header">
        <div>
          <span class="track-id">{html.escape(tid)}</span>
          <h2>{html.escape(t['title_zh'])}</h2>
        </div>
        <div class="track-meta">
          <span>目標 BPM：{t['target_bpm'][0]}–{t['target_bpm'][1]}</span>
          <span>建議首選：<strong>{html.escape(rec_id)}</strong></span>
        </div>
      </div>
      <p class="track-desc"><strong>遊戲用途：</strong>{html.escape(t['usage_zh'])}</p>
      <p class="track-desc"><strong>風格設定：</strong>{html.escape(t['style_zh'])}</p>
      <div class="cards-grid">
        {''.join(cards)}
      </div>
    </section>
            """.strip()
        )

    gpu_label = html.escape(str(env.get("gpu_name", "Google Colab GPU")))
    cu_info = ""
    if "compute_units_spent" in env:
        cu_info = f" · 耗費 {env['compute_units_spent']} CU"

    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(data.get('project', 'SEO Journey'))} — ACE-Step BGM 候選試聽</title>
  <style>
    :root {{
      --bg: #fffaf5;
      --surface: #ffffff;
      --surface-soft: #fdf4f7;
      --border: #ebd9df;
      --ink: #3b3550;
      --muted: #6e6782;
      --accent: #d65b88;
      --accent-soft: #fde8ef;
      --mint: #2f856d;
      --mint-bg: #e7f7f1;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
      background: linear-gradient(180deg, #fff6f9 0%, var(--bg) 320px);
      color: var(--ink);
      line-height: 1.55;
    }}
    header {{
      max-width: 1360px;
      margin: 0 auto;
      padding: 28px 24px 16px;
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: 1.75rem;
      letter-spacing: 0.02em;
    }}
    .sub {{
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 0.95rem;
    }}
    .banner {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px 18px;
      font-size: 0.9rem;
      display: grid;
      gap: 6px;
      box-shadow: 0 4px 18px rgba(59, 53, 80, 0.04);
    }}
    nav.pills {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }}
    .pill {{
      text-decoration: none;
      color: var(--ink);
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 6px 13px;
      border-radius: 999px;
      font-size: 0.88rem;
      font-weight: 600;
      transition: all 0.15s ease;
    }}
    .pill:hover {{
      border-color: var(--accent);
      background: var(--accent-soft);
    }}
    main {{
      max-width: 1360px;
      margin: 0 auto;
      padding: 8px 24px 64px;
      display: grid;
      gap: 32px;
    }}
    .track-section {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 22px;
      box-shadow: 0 6px 24px rgba(59, 53, 80, 0.05);
    }}
    .track-header {{
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      margin-bottom: 12px;
    }}
    .track-id {{
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.8rem;
      background: var(--accent-soft);
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 6px;
      margin-right: 8px;
      vertical-align: middle;
    }}
    .track-header h2 {{
      display: inline;
      font-size: 1.3rem;
      margin: 0;
    }}
    .track-meta {{
      display: flex;
      gap: 16px;
      font-size: 0.9rem;
      color: var(--muted);
    }}
    .track-desc {{
      margin: 4px 0;
      font-size: 0.94rem;
    }}
    .cards-grid {{
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 18px;
    }}
    .card {{
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      background: #fffdfb;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }}
    .card-rec {{
      border: 2px solid var(--mint);
      background: #fbfffd;
    }}
    .card-head {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }}
    .card-head h3 {{
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 1.05rem;
    }}
    .seed-tag {{
      font-size: 0.8rem;
      color: var(--muted);
    }}
    .badge {{
      font-size: 0.78rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }}
    .badge-rec {{
      background: var(--mint-bg);
      color: var(--mint);
      border: 1px solid #9fd8c6;
    }}
    .rationale {{
      margin: 0;
      font-size: 0.85rem;
      color: var(--mint);
      background: var(--mint-bg);
      padding: 8px 10px;
      border-radius: 8px;
    }}
    .rationale.warn {{
      color: #8a4b00;
      background: #fff3e0;
    }}
    .player-box {{
      background: var(--surface-soft);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px;
      display: grid;
      gap: 6px;
    }}
    .seam-box {{
      background: #f5f7ff;
      border-color: #d9e0f5;
    }}
    .player-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }}
    .player-label {{
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--ink);
    }}
    audio {{
      width: 100%;
      height: 36px;
    }}
    .loop-btn {{
      font-size: 0.76rem;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--ink);
      border-radius: 999px;
      padding: 3px 10px;
      cursor: pointer;
      white-space: nowrap;
    }}
    .loop-btn.active {{
      background: var(--mint);
      color: #fff;
      border-color: var(--mint);
    }}
    dl.metrics {{
      margin: 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 12px;
      font-size: 0.81rem;
      background: #faf8fc;
      border: 1px solid #ece7f3;
      border-radius: 10px;
      padding: 10px;
    }}
    dl.metrics dt {{
      color: var(--muted);
      font-size: 0.74rem;
    }}
    dl.metrics dd {{
      margin: 0;
      font-weight: 600;
    }}
    details.prompt-details {{
      font-size: 0.82rem;
      color: var(--muted);
    }}
    details.prompt-details summary {{
      cursor: pointer;
      font-weight: 600;
      color: var(--ink);
    }}
    .prompt-text {{
      margin: 6px 0 0;
      padding: 8px;
      background: #f7f5fa;
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.77rem;
      word-break: break-word;
    }}
    .spec-figure {{
      margin: 0;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #2b3040;
      cursor: zoom-in;
    }}
    .spec-figure img {{
      display: block;
      width: 100%;
      height: auto;
    }}
    #lightbox {{
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(16, 18, 26, 0.88);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 24px;
      cursor: zoom-out;
    }}
    #lightbox img {{
      max-width: 96vw;
      max-height: 92vh;
      border-radius: 10px;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
    }}
  </style>
</head>
<body>
  <header>
    <h1>《直到你找到我 ～青葉學園網站研究社～》背景音樂候選試聽頁</h1>
    <p class="sub">共 5 首遊戲情境 BGM × 3 組候選（全純器樂無人聲），已完成無縫循環點挑選、等功率 crossfade 與響度正規化。</p>
    <div class="banner">
      <div><strong>生成模型：</strong>{html.escape(model.get('huggingface_id', 'ACE-Step/ACE-Step-v1-3.5B'))}（{html.escape(model.get('license', 'Apache-2.0'))}）｜<strong>運算環境：</strong>{gpu_label}{cu_info}</div>
      <div><strong>音訊規格：</strong>44.1 kHz 立體聲 LAME MP3（{html.escape(str(pp.get('mp3_bitrate', '160k')))}bps）｜目標響度 {pp.get('target_lufs', -18.0)} LUFS｜True Peak ≤ {pp.get('max_true_peak_dbtp', -1.0)} dBTP｜循環 60–120 秒</div>
      <div><strong>評分與推薦說明：</strong>{html.escape(note)}</div>
      <div><strong>注意：</strong>BPM 為節拍追蹤的估計值（已折算 ×½／×2），對鋼琴／弦樂這類打擊感弱的曲子不可靠；ACE-Step 也不保證遵循提示詞中的速度。以人耳為準。</div>
    </div>
    <nav class="pills">
      {nav_links}
    </nav>
  </header>

  <main>
    {''.join(sections_html)}
  </main>

  <div id="lightbox" onclick="this.style.display='none'">
    <img id="lightbox-img" src="" alt="Spectrogram zoom" />
  </div>

  <script>
    const allAudios = Array.from(document.querySelectorAll('audio'));
    allAudios.forEach((audio) => {{
      audio.addEventListener('play', () => {{
        allAudios.forEach((other) => {{
          if (other !== audio && !other.paused) {{
            other.pause();
          }}
        }});
      }});
    }});

    document.querySelectorAll('.loop-btn').forEach((btn) => {{
      const audio = document.getElementById(btn.dataset.audio);
      const loopStart = parseFloat(btn.dataset.loopStart);
      const loopEnd = parseFloat(btn.dataset.loopEnd);
      let enabled = false;

      btn.addEventListener('click', () => {{
        enabled = !enabled;
        btn.classList.toggle('active', enabled);
        btn.textContent = enabled ? '無縫循環預覽：開（接近 loopEnd 自動跳回）' : '無縫循環預覽：關';
        if (enabled && audio.currentTime < loopEnd - 6) {{
          audio.currentTime = Math.max(loopStart, loopEnd - 5);
        }}
      }});

      audio.addEventListener('timeupdate', () => {{
        if (enabled && audio.currentTime >= loopEnd - 0.04) {{
          audio.currentTime = loopStart;
          if (audio.paused) audio.play().catch(() => {{}});
        }}
      }});
    }});

    document.querySelectorAll('.spec-figure img').forEach((img) => {{
      img.addEventListener('click', () => {{
        const lb = document.getElementById('lightbox');
        document.getElementById('lightbox-img').src = img.src;
        lb.style.display = 'flex';
      }});
    }});
  </script>
</body>
</html>
"""


def main():
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/seo-journey-audio/bgm")
    json_path = out_dir / "candidates.json"
    if not json_path.exists():
        raise FileNotFoundError(f"Missing {json_path}")
    data = json.loads(json_path.read_text(encoding="utf-8"))
    html_text = render_html(data)
    html_path = out_dir / "index.html"
    html_path.write_text(html_text, encoding="utf-8")
    print(f"Wrote {html_path}")


if __name__ == "__main__":
    main()
