"""Build candidates.json and standalone index.html audition page for generated SFX candidates."""

from __future__ import annotations

import argparse
import html
import json
from datetime import datetime, timezone
from pathlib import Path


def build_html(data: dict) -> str:
    sounds = data["sounds"]
    nav_links = "\n".join(
        f'<a class="nav-pill" href="#sfx-{html.escape(s["id"])}"><code>{html.escape(s["id"])}</code> · {html.escape(s["name"])}</a>'
        for s in sounds
    )

    summary_rows = []
    sections_html = []

    for s in sounds:
        sid = s["id"]
        rec_cid = s["recommended_candidate"]
        cands = s["candidates"]
        rec = next((c for c in cands if c["candidate_id"] == rec_cid), cands[0])
        rm = rec["metrics"]
        summary_rows.append(
            f"""
            <tr>
              <td><a href="#sfx-{html.escape(sid)}"><code>{html.escape(sid)}</code></a></td>
              <td>{html.escape(s['name'])}</td>
              <td>{html.escape(s['target_duration_label'])}</td>
              <td><strong>{html.escape(rec['candidate_id'])}</strong> ({'AI' if rec['source'] == 'ai' else '合成'})</td>
              <td>{rm['duration_ms']:.1f} ms</td>
              <td>{rm['peak_dbfs']:.2f} dBFS</td>
              <td>{rm['loudness_lkfs']:.2f} LKFS</td>
              <td>{rm['pre_attack_silence_ms']:.2f} ms</td>
              <td>{'有削波' if rm['clipping'] else '無'}</td>
            </tr>
            """
        )

        cards_html = []
        for c in cands:
            m = c["metrics"]
            cid = c["candidate_id"]
            is_rec = bool(c["recommended"])
            is_synth = c["source"] == "synth"
            source_badge = (
                '<span class="badge badge-synth">Python 合成</span>'
                if is_synth
                else '<span class="badge badge-ai">AI 生成</span>'
            )
            rec_badge = '<span class="badge badge-rec">★ 建議首選</span>' if is_rec else ""

            burst_html = ""
            if sid in ("blip", "click"):
                interval_ms = 65 if sid == "blip" else 400
                label = (
                    "連續播放模擬（每 65ms 連發 10 次）"
                    if sid == "blip"
                    else "連續播放模擬（每 400ms 連發 10 次）"
                )
                burst_html = f"""
                <div class="burst-bar">
                  <button
                    type="button"
                    class="burst-btn"
                    data-src="{html.escape(c['file'])}"
                    data-interval="{interval_ms}"
                    data-count="10"
                    onclick="toggleBurst(this)"
                  >▶ {label}</button>
                  <span class="burst-status" aria-live="polite">待命中</span>
                </div>
                """

            seed_str = str(c["seed"]) if c["seed"] is not None else "N/A (程式合成)"
            lufs_label = (
                f"{m['lufs']:.2f} LUFS (整合)"
                if m["lufs_method"] == "integrated"
                else f"{m['lufs']:.2f} LKFS (短音 K 加權)"
            )
            rs = c.get("raw_stats") or {}
            raw_noise_label = (
                f"{rs['noise_floor_dbfs']:.0f} dBFS / {rs['snr_est_db']:.0f} dB"
                if rs
                else "N/A（程式合成）"
            )
            note_html = (
                f'<p class="cand-note">{html.escape(c["note"])}</p>'
                if c.get("note")
                else ""
            )

            cards_html.append(
                f"""
                <article class="cand-card {'is-recommended' if is_rec else ''}">
                  <header class="cand-header">
                    <div class="cand-title">
                      <span class="cid">{html.escape(sid)}_{html.escape(cid)}</span>
                      {source_badge}
                      {rec_badge}
                    </div>
                    <code class="filename">{html.escape(c['file'])}</code>
                  </header>

                  <audio controls preload="metadata" src="{html.escape(c['file'])}"></audio>
                  {burst_html}
                  {note_html}

                  <dl class="metrics-grid">
                    <div><dt>長度</dt><dd>{m['duration_ms']:.1f} ms</dd></div>
                    <div><dt>峰值</dt><dd>{m['peak_dbfs']:.2f} dBFS</dd></div>
                    <div><dt>感知響度</dt><dd>{lufs_label}</dd></div>
                    <div><dt>RMS</dt><dd>{m['rms_dbfs']:.2f} dBFS</dd></div>
                    <div><dt>起音前靜音</dt><dd>{m['pre_attack_silence_ms']:.2f} ms</dd></div>
                    <div><dt>尾端淡出</dt><dd>{m['fade_out_ms']:.1f} ms</dd></div>
                    <div><dt>削波</dt><dd class="{'warn' if m['clipping'] else 'ok'}">{'是 (' + str(m['clipped_samples']) + ')' if m['clipping'] else '否 (0 樣本)'}</dd></div>
                    <div><dt>估計 SNR / 質心</dt><dd>{m['snr_db']:.1f} dB / {m['spectral_centroid_hz']:.0f} Hz</dd></div>
                    <div><dt>底噪（尾端 RMS）</dt><dd>{m['tail_rms_dbfs']:.1f} dBFS</dd></div>
                    <div><dt>原始檔底噪 / SNR</dt><dd>{raw_noise_label}</dd></div>
                    <div><dt>淡出前殘餘 / 衰減</dt><dd>{m['pre_fade_level_db']:.0f} dB / {m['decay_t30_ms']:.0f} ms（-30 dB）</dd></div>
                  </dl>

                  <a href="{html.escape(c['spectrogram_png'])}" target="_blank" rel="noopener" class="spec-link" title="點擊檢視原始大小波形與頻譜圖">
                    <img src="{html.escape(c['spectrogram_png'])}" alt="{html.escape(sid)}_{html.escape(cid)} 波形與頻譜圖" loading="lazy" />
                  </a>

                  <details class="prompt-details">
                    <summary>提示詞與 Seed（{html.escape(seed_str)}）</summary>
                    <p><strong>Seed:</strong> <code>{html.escape(seed_str)}</code></p>
                    <p><strong>Prompt:</strong> {html.escape(c['prompt'])}</p>
                  </details>
                </article>
                """
            )

        sections_html.append(
            f"""
            <section class="sfx-section" id="sfx-{html.escape(sid)}">
              <div class="section-head">
                <div>
                  <span class="sfx-id-tag">{html.escape(sid)}</span>
                  <h2>{html.escape(s['name'])}</h2>
                </div>
                <span class="target-pill">目標長度：{html.escape(s['target_duration_label'])}</span>
              </div>
              <div class="section-meta">
                <p><strong>遊戲用途：</strong>{html.escape(s['usage'])}</p>
                <p><strong>觸發時機：</strong><code>{html.escape(s['trigger'])}</code></p>
                <p class="rec-reason"><strong>建議首選（<code>{html.escape(sid)}_{html.escape(rec_cid)}</code>）：</strong>{html.escape(s['recommendation_reason'])}</p>
              </div>
              <div class="cards-grid">
                {"".join(cards_html)}
              </div>
            </section>
            """
        )

    gpu_info = html.escape(str(data.get("gpu_name", "Colab GPU")))
    cu_info = html.escape(str(data.get("compute_units_used", "N/A")))
    gen_at = html.escape(str(data.get("generated_at", "")))

    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>《直到你找到我》遊戲音效候選試聽頁（Stable Audio Open 1.0）</title>
  <style>
    :root {{
      --bg: #0b1120;
      --surface: #111827;
      --card: #172033;
      --card-rec: #19263e;
      --border: #293548;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --gold: #fbbf24;
      --green: #34d399;
      --purple: #c084fc;
      --danger: #f87171;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", "PingFang TC", "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.55;
    }}
    code {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: rgba(148, 163, 184, 0.14);
      padding: 0.12em 0.4em;
      border-radius: 5px;
      font-size: 0.9em;
    }}
    .container {{
      max-width: 1320px;
      margin: 0 auto;
      padding: 24px 20px 64px;
    }}
    .hero {{
      background: linear-gradient(135deg, #162238, #0f172a);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px 28px;
      margin-bottom: 20px;
    }}
    .hero h1 {{
      margin: 0 0 8px;
      font-size: 1.55rem;
      color: #f8fafc;
    }}
    .hero p {{ margin: 6px 0; color: var(--muted); font-size: 0.95rem; }}
    .credit {{ font-size: 1.02rem; }}
    .license-note {{
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(56, 189, 248, 0.08);
      border-left: 3px solid var(--accent);
      border-radius: 6px;
      font-size: 0.88rem;
      color: #cbd5e1;
    }}
    .nav-bar {{
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 0;
      background: rgba(11, 17, 32, 0.92);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }}
    .nav-pill {{
      text-decoration: none;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 5px 12px;
      font-size: 0.84rem;
      transition: border-color 0.15s, background 0.15s;
    }}
    .nav-pill:hover {{ border-color: var(--accent); background: #1e293b; }}
    .summary-wrap {{
      overflow-x: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 28px;
    }}
    table.summary-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }}
    table.summary-table th, table.summary-table td {{
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      white-space: nowrap;
    }}
    table.summary-table th {{ color: var(--muted); font-weight: 600; background: #0f172a; }}
    table.summary-table a {{ color: var(--accent); text-decoration: none; }}
    .sfx-section {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 22px;
      margin-bottom: 28px;
    }}
    .section-head {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      margin-bottom: 14px;
    }}
    .section-head h2 {{
      display: inline;
      margin: 0 0 0 10px;
      font-size: 1.25rem;
      color: #f8fafc;
    }}
    .sfx-id-tag {{
      display: inline-block;
      background: var(--accent);
      color: #082f49;
      font-weight: 800;
      font-family: ui-monospace, monospace;
      padding: 2px 10px;
      border-radius: 6px;
      font-size: 0.92rem;
    }}
    .target-pill {{
      background: rgba(148, 163, 184, 0.12);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 0.85rem;
      color: #cbd5e1;
    }}
    .section-meta p {{ margin: 4px 0; font-size: 0.92rem; color: #cbd5e1; }}
    .rec-reason {{
      margin-top: 8px !important;
      padding: 8px 12px;
      background: rgba(251, 191, 36, 0.08);
      border-left: 3px solid var(--gold);
      border-radius: 6px;
    }}
    .cards-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }}
    .cand-card {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }}
    .cand-card.is-recommended {{
      background: var(--card-rec);
      border-color: rgba(251, 191, 36, 0.65);
      box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.25);
    }}
    .cand-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }}
    .cand-title {{ display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }}
    .cid {{ font-weight: 700; font-family: ui-monospace, monospace; font-size: 1rem; color: #f8fafc; }}
    .filename {{ font-size: 0.78rem; color: var(--muted); }}
    .badge {{
      font-size: 0.74rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
    }}
    .badge-ai {{ background: rgba(56, 189, 248, 0.16); color: #7dd3fc; }}
    .badge-synth {{ background: rgba(52, 211, 153, 0.18); color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.4); }}
    .badge-rec {{ background: rgba(251, 191, 36, 0.2); color: #fde68a; border: 1px solid rgba(251, 191, 36, 0.45); }}
    audio {{ width: 100%; height: 38px; }}
    .burst-bar {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 10px;
    }}
    .burst-btn {{
      cursor: pointer;
      border: 1px solid #0284c7;
      background: #0369a1;
      color: #f8fafc;
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 0.8rem;
      font-weight: 600;
    }}
    .burst-btn:hover {{ background: #0284c7; }}
    .burst-btn.is-playing {{ background: #b91c1c; border-color: #ef4444; }}
    .burst-status {{ font-size: 0.78rem; color: var(--muted); font-family: ui-monospace, monospace; }}
    .cand-note {{ margin: 0; font-size: 0.82rem; color: #cbd5e1; }}
    .metrics-grid {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 10px;
      margin: 0;
      padding: 8px 10px;
      background: rgba(15, 23, 42, 0.55);
      border-radius: 8px;
      font-size: 0.8rem;
    }}
    .metrics-grid dt {{ color: var(--muted); font-size: 0.72rem; }}
    .metrics-grid dd {{ margin: 0; font-family: ui-monospace, monospace; color: #e2e8f0; }}
    .metrics-grid dd.ok {{ color: var(--green); }}
    .metrics-grid dd.warn {{ color: var(--danger); font-weight: 700; }}
    .spec-link img {{
      width: 100%;
      height: auto;
      display: block;
      border-radius: 8px;
      border: 1px solid var(--border);
    }}
    .prompt-details {{
      font-size: 0.8rem;
      color: var(--muted);
      border-top: 1px solid var(--border);
      padding-top: 8px;
    }}
    .prompt-details summary {{ cursor: pointer; color: #cbd5e1; }}
    .prompt-details p {{ margin: 6px 0 0; word-break: break-word; }}
  </style>
</head>
<body>
  <div class="container">
    <header class="hero">
      <h1>《直到你找到我 ～青葉學園網站研究社～》遊戲音效候選試聽頁</h1>
      <p class="credit"><strong>音效由 Stable Audio Open 生成 — Powered by Stability AI</strong>（標示「Python 合成」的候選為程式合成，非 AI 生成）</p>
      <p>
        生成模型：<code>stabilityai/stable-audio-open-1.0</code> ｜ 輸出規格：單聲道 44.1 kHz / LAME MP3 128 kbps ｜
        運算硬體：{gpu_info} ｜ Compute Units 消耗：{cu_info} ｜ 產生時間：{gen_at}
      </p>
      <p>
        所有候選皆已完成去靜音（保留 2–5ms 起音緩衝）、20–50ms 尾端淡出、峰值正規化與響度對齊（<code>click</code> 與 <code>blip</code> 已比一般音效降低約 7–9 dB）。
      </p>
      <div class="license-note">
        <strong>授權與標示：</strong>使用 <strong>Stable Audio Open 1.0</strong>（Stability AI Community License — 非商業用途與年營收 100 萬美元以下可用）。正式採用生成音檔時請於遊戲製作人員名單或說明處標示：<code>Powered by Stability AI</code>。
      </div>
    </header>

    <nav class="nav-bar" aria-label="音效分類導覽">
      {nav_links}
    </nav>

    <div class="summary-wrap">
      <table class="summary-table">
        <thead>
          <tr>
            <th>音效 ID</th>
            <th>中文名稱</th>
            <th>目標長度</th>
            <th>建議首選</th>
            <th>實測長度</th>
            <th>峰值</th>
            <th>K 加權響度</th>
            <th>起音前靜音</th>
            <th>削波</th>
          </tr>
        </thead>
        <tbody>
          {"".join(summary_rows)}
        </tbody>
      </table>
    </div>

    {"".join(sections_html)}
  </div>

  <script>
    let activeBurst = null;

    function stopBurst() {{
      if (!activeBurst) return;
      clearInterval(activeBurst.timer);
      for (const a of activeBurst.pool) {{
        try {{ a.pause(); a.currentTime = 0; }} catch (_) {{}}
      }}
      activeBurst.btn.classList.remove("is-playing");
      activeBurst.btn.textContent = activeBurst.idleLabel;
      activeBurst.status.textContent = "已停止";
      activeBurst = null;
    }}

    function toggleBurst(btn) {{
      if (activeBurst && activeBurst.btn === btn) {{
        stopBurst();
        return;
      }}
      stopBurst();

      const src = btn.dataset.src;
      const intervalMs = Number(btn.dataset.interval || 100);
      const total = Number(btn.dataset.count || 10);
      const statusEl = btn.parentElement.querySelector(".burst-status");
      const idleLabel = btn.textContent;

      // Pool of Audio elements so rapid 65ms triggers overlap naturally without clipping tail.
      const poolSize = 6;
      const pool = Array.from({{ length: poolSize }}, () => {{
        const el = new Audio(src);
        el.preload = "auto";
        return el;
      }});

      let count = 0;
      const playOnce = () => {{
        if (!activeBurst || activeBurst.btn !== btn) return;
        const a = pool[count % poolSize];
        try {{
          a.currentTime = 0;
          const p = a.play();
          if (p && typeof p.catch === "function") p.catch(() => {{}});
        }} catch (_) {{}}
        count += 1;
        statusEl.textContent = `播放第 ${{count}} / ${{total}} 次`;
        if (count >= total) {{
          clearInterval(activeBurst.timer);
          setTimeout(() => {{
            if (activeBurst && activeBurst.btn === btn) {{
              btn.classList.remove("is-playing");
              btn.textContent = idleLabel;
              statusEl.textContent = `完成 ${{total}} 次（每 ${{intervalMs}}ms）`;
              activeBurst = null;
            }}
          }}, Math.max(200, intervalMs));
        }}
      }};

      btn.classList.add("is-playing");
      btn.textContent = "■ 停止模擬";
      const timer = setInterval(playOnce, intervalMs);
      activeBurst = {{ btn, timer, pool, status: statusEl, idleLabel }};
      playOnce();
    }}
  </script>
</body>
</html>
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Build candidates.json and index.html preview page.")
    parser.add_argument("--metrics", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--compute-units", default="N/A")
    args = parser.parse_args()

    data = json.loads(args.metrics.read_text(encoding="utf-8"))
    data["compute_units_used"] = args.compute_units
    data["generated_at"] = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M %Z")
    data["encoding"] = {
        "format": "mp3",
        "codec": "libmp3lame",
        "bitrate_kbps": 128,
        "sample_rate_hz": 44100,
        "channels": 1,
    }

    args.out_dir.mkdir(parents=True, exist_ok=True)
    candidates_path = args.out_dir / "candidates.json"
    candidates_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    html_path = args.out_dir / "index.html"
    html_path.write_text(build_html(data), encoding="utf-8")
    print(f"[preview] Wrote {candidates_path} and {html_path}", flush=True)


if __name__ == "__main__":
    main()
