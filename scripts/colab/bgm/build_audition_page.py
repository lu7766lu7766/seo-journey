"""Build a unified Traditional Chinese HTML audition page (/tmp/seo-journey-audio/v2/index.html) for BGM + SFX."""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path


def render_bgm_section(track: dict, bgm_prefix: str = "bgm/") -> str:
    tid = track["id"]
    rec_id = track.get("recommended_id", "")
    cards = []
    for c in track["candidates"]:
        m = c["metrics"]
        cid = c["id"]
        is_rec = cid == rec_id
        vc = m.get("vocal_check", {})
        vocal_label = "通過（無清晰人聲）" if not vc.get("has_vocals", False) else f"異常：{vc.get('filtered_text', '')}"
        rec_badge = '<span class="badge badge-rec">★ 推薦預設</span>' if is_rec else ""
        score_val = c.get("listening_score")
        review_txt = c.get("listening_review", "")
        review_html = (
            f'<p class="review-box"><strong>實聽評分：{score_val} / 5.0</strong> — {html.escape(str(review_txt))}</p>'
            if score_val is not None or review_txt
            else ""
        )
        warn_html = ""
        if m.get("qa_warnings"):
            warn_html = '<p class="warn-box">QA 提醒：' + html.escape("；".join(m["qa_warnings"])) + "</p>"

        src_mp3 = f"{bgm_prefix}{c['filename']}"
        seam_mp3 = f"{bgm_prefix}{c['seam_filename']}"
        plot_png = f"{bgm_prefix}{c['plot_filename']}"

        cards.append(
            f"""
        <article class="card {'card-rec' if is_rec else ''}" id="cand-{html.escape(cid)}">
          <div class="card-head">
            <div>
              <h3>{html.escape(cid)}</h3>
              <span class="seed-tag">{html.escape(str(c.get('dit_config') or c.get('engine') or ''))} · Seed {c.get('seed')}</span>
            </div>
            {rec_badge}
          </div>
          {review_html}
          {warn_html}
          <div class="player-box">
            <div class="player-row">
              <span class="player-label">完整曲目試聽（含前導段＋循環段）</span>
              <button type="button" class="loop-btn" data-audio="audio-{html.escape(cid)}"
                data-loop-start="{m['loop_start_sec']}" data-loop-end="{m['loop_end_sec']}">
                無縫循環預覽：關
              </button>
            </div>
            <audio id="audio-{html.escape(cid)}" controls preload="metadata" src="{html.escape(src_mp3)}"></audio>
          </div>
          <div class="player-box seam-box">
            <div class="player-row">
              <span class="player-label">接縫試聽（前 4s ＋ 後 4s，4.0s 為 loopEnd→loopStart）</span>
            </div>
            <audio controls preload="metadata" src="{html.escape(seam_mp3)}"></audio>
          </div>
          <dl class="metrics">
            <div><dt>總長 / 循環</dt><dd>{m['duration_sec']}s ({m['loop_start_sec']:.1f}→{m['loop_end_sec']:.1f}s, {m['loop_bars']}小節)</dd></div>
            <div><dt>響度 / True Peak</dt><dd>{m['lufs']} LUFS / {m['true_peak_dbtp']} dBTP</dd></div>
            <div><dt>接縫 ±500ms / ±50ms</dt><dd>{m.get('seam_500ms_jump_db', 0):.2f} dB / {m['seam_jump_db']:.2f} dB (cos {m.get('seam_500ms_cosine', 1):.2f})</dd></div>
            <div><dt>動態 LRA / 2s跳動</dt><dd>{m['lra_approx_db']} dB / {m.get('max_2s_jump_db', 0):.2f} dB</dd></div>
            <div><dt>BPM / 質心 / 20-120Hz</dt><dd>{m['bpm_musical']} / {m['spectral_centroid_hz']:.0f}Hz / {round(m.get('band_ratios', {}).get('20_120', 0)*100)}%</dd></div>
            <div><dt>人聲篩檢 / 大小</dt><dd>{html.escape(vocal_label)} · {round(m.get('file_size_bytes', 0)/1024)} KB</dd></div>
          </dl>
          <details class="prompt-details">
            <summary>檢視提示詞</summary>
            <p class="prompt-text">{html.escape(c['prompt'])}</p>
          </details>
          <figure class="spec-figure">
            <img src="{html.escape(plot_png)}" alt="{html.escape(cid)} 波形與頻譜圖" loading="lazy" />
          </figure>
        </article>
            """.strip()
        )

    return f"""
    <section class="track-section" id="bgm-{html.escape(tid)}">
      <div class="track-header">
        <div>
          <span class="track-id">bgm/{html.escape(tid)}</span>
          <h2>{html.escape(track['title_zh'])}</h2>
        </div>
        <div class="track-meta">
          <span>目標 BPM：{track['target_bpm'][0]}–{track['target_bpm'][1]}</span>
          <span>推薦預設：<strong>{html.escape(rec_id)}</strong></span>
        </div>
      </div>
      <p class="track-desc"><strong>用途：</strong>{html.escape(track['usage_zh'])}</p>
      <p class="track-desc"><strong>風格：</strong>{html.escape(track['style_zh'])}</p>
      <div class="cards-grid">{''.join(cards)}</div>
      {
        '<details class="track-desc" style="margin-top:10px"><summary><strong>淘汰紀錄（'
        + str(len(track.get('rejected_summary', [])))
        + ' 首：自動 QA ＋ 人工試聽）</strong></summary><ul style="margin:6px 0 0 18px;padding:0;line-height:1.55">'
        + ''.join(
            '<li><code>'
            + html.escape(str(r.get('id', '')))
            + '</code>（'
            + html.escape(str(r.get('stage', '')))
            + '）：'
            + html.escape(str(r.get('reason', '')))
            + '</li>'
            for r in track.get('rejected_summary', [])
        )
        + '</ul></details>'
        if track.get('rejected_summary')
        else ''
      }
    </section>
    """.strip()


def render_sfx_section(sound: dict, sfx_prefix: str = "sfx/") -> str:
    sid = sound["id"]
    rec_cid = sound["recommended_candidate"]
    cards = []
    for c in sound["candidates"]:
        cid = c["candidate_id"]
        is_rec = cid == rec_cid
        m = c["metrics"]
        is_synth = c["source"] == "synth"
        source_badge = '<span class="badge badge-synth">Python 物理合成</span>' if is_synth else '<span class="badge badge-ai">Stable Audio Open</span>'
        rec_badge = '<span class="badge badge-rec">★ 推薦預設</span>' if is_rec else ""
        src_mp3 = f"{sfx_prefix}{c['file']}"
        png_src = f"{sfx_prefix}{c['spectrogram_png']}"
        score_val = c.get("listening_score")
        review_txt = c.get("listening_review", "")
        review_html = (
            f'<p class="review-box"><strong>實聽評分：{score_val} / 5.0</strong> — {html.escape(str(review_txt))}</p>'
            if score_val is not None or review_txt
            else ""
        )
        burst_html = ""
        if sid in ("blip", "click"):
            interval_ms = 65 if sid == "blip" else 400
            label = f"連發模擬（每 {interval_ms}ms × 10 次）"
            burst_html = f'<div class="burst-bar"><button type="button" class="burst-btn" data-src="{html.escape(src_mp3)}" data-interval="{interval_ms}" onclick="toggleBurst(this)">▶ {label}</button><span class="burst-status">待命</span></div>'

        cards.append(
            f"""
        <article class="card {'card-rec' if is_rec else ''}" id="sfx-{html.escape(sid)}-{html.escape(cid)}">
          <div class="card-head">
            <div>
              <h3>{html.escape(sid)}_{html.escape(cid)}</h3>
              <div>{source_badge}</div>
            </div>
            {rec_badge}
          </div>
          {review_html}
          <div class="player-box">
            <audio controls preload="metadata" src="{html.escape(src_mp3)}"></audio>
            {burst_html}
          </div>
          <dl class="metrics">
            <div><dt>長度 / 有效段</dt><dd>{m['duration_ms']:.1f} ms / {m['active_ms']:.1f} ms</dd></div>
            <div><dt>峰值 / 響度</dt><dd>{m['peak_dbfs']:.1f} dBFS / {m['loudness_lkfs']:.1f} LKFS</dd></div>
            <div><dt>質心 / 音高趨勢</dt><dd>{m['spectral_centroid_hz']:.0f} Hz / {m.get('f0_trend_semitones', 0.0):+.1f} st</dd></div>
            <div><dt>起音靜音 / 淡出前</dt><dd>{m['pre_attack_silence_ms']:.1f} ms / {m['pre_fade_level_db']:.0f} dB</dd></div>
          </dl>
          <details class="prompt-details">
            <summary>檢視設定／提示詞</summary>
            <p class="prompt-text">{html.escape(c['prompt'])}</p>
          </details>
          <figure class="spec-figure">
            <img src="{html.escape(png_src)}" alt="{html.escape(sid)}_{html.escape(cid)} 頻譜圖" loading="lazy" />
          </figure>
        </article>
            """.strip()
        )

    return f"""
    <section class="track-section" id="sfx-{html.escape(sid)}">
      <div class="track-header">
        <div>
          <span class="track-id">sfx/{html.escape(sid)}</span>
          <h2>{html.escape(sound['name'])}</h2>
        </div>
        <div class="track-meta">
          <span>目標長度：{html.escape(sound['target_duration_label'])}</span>
          <span>推薦預設：<strong>{html.escape(sid)}_{html.escape(rec_cid)}</strong></span>
        </div>
      </div>
      <p class="track-desc"><strong>用途：</strong>{html.escape(sound['usage'])}</p>
      <p class="track-desc"><strong>選擇理由：</strong>{html.escape(sound.get('recommendation_reason', ''))}</p>
      <div class="cards-grid">{''.join(cards)}</div>
    </section>
    """.strip()


def build_unified_html(bgm_data: dict, sfx_data: dict | None = None, bgm_prefix: str = "bgm/", sfx_prefix: str = "sfx/") -> str:
    bgm_tracks = bgm_data["tracks"]
    sfx_sounds = sfx_data["sounds"] if sfx_data else []

    bgm_pills = "\n".join(
        f'<a class="pill" href="#bgm-{html.escape(t["id"])}">🎵 {html.escape(t["id"])}</a>' for t in bgm_tracks
    )
    sfx_pills = "\n".join(
        f'<a class="pill pill-sfx" href="#sfx-{html.escape(s["id"])}">🔊 {html.escape(s["id"])}</a>' for s in sfx_sounds
    )

    bgm_sections = "\n".join(render_bgm_section(t, bgm_prefix=bgm_prefix) for t in bgm_tracks)
    sfx_sections = "\n".join(render_sfx_section(s, sfx_prefix=sfx_prefix) for s in sfx_sounds)

    model = bgm_data.get("model", {})
    env = bgm_data.get("environment", {})
    total_size_mb = bgm_data.get("total_public_audio_mb", "N/A")
    cu_spent = env.get("compute_units_spent", bgm_data.get("compute_units_spent", "N/A"))

    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>《直到你找到我》v2 全套音訊實聽審核試聽頁（12 BGM + 9 SFX）</title>
  <style>
    :root {{
      --bg: #fffaf5; --surface: #ffffff; --surface-soft: #fdf4f7;
      --border: #ebd9df; --ink: #3b3550; --muted: #6e6782;
      --accent: #d65b88; --accent-soft: #fde8ef;
      --mint: #1f7a62; --mint-bg: #e7f7f1;
      --gold-bg: #fff8e1; --gold-ink: #7c4d00;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", "PingFang TC", sans-serif; background: linear-gradient(180deg, #fff6f9 0%, var(--bg) 320px); color: var(--ink); line-height: 1.55; }}
    header {{ max-width: 1400px; margin: 0 auto; padding: 26px 24px 14px; }}
    h1 {{ margin: 0 0 8px; font-size: 1.7rem; }}
    .sub {{ margin: 0 0 12px; color: var(--muted); font-size: 0.95rem; }}
    .banner {{ background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px 18px; font-size: 0.9rem; display: grid; gap: 6px; }}
    nav.pills {{ display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; position: sticky; top: 0; background: rgba(255,250,245,0.92); backdrop-filter: blur(8px); padding: 10px 0; z-index: 20; border-bottom: 1px solid var(--border); }}
    .pill {{ text-decoration: none; color: var(--ink); background: var(--surface); border: 1px solid var(--border); padding: 5px 11px; border-radius: 999px; font-size: 0.84rem; font-weight: 600; }}
    .pill:hover {{ border-color: var(--accent); background: var(--accent-soft); }}
    .pill-sfx {{ background: #f2f7ff; border-color: #d0dff5; }}
    main {{ max-width: 1400px; margin: 0 auto; padding: 12px 24px 64px; display: grid; gap: 28px; }}
    .group-title {{ font-size: 1.35rem; margin: 12px 0 0; padding-bottom: 6px; border-bottom: 2px solid var(--accent); }}
    .track-section {{ background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: 0 6px 24px rgba(59,53,80,0.04); }}
    .track-header {{ display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 10px; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 10px; }}
    .track-id {{ font-family: ui-monospace, Menlo, monospace; font-size: 0.8rem; background: var(--accent-soft); color: var(--accent); padding: 2px 8px; border-radius: 6px; margin-right: 8px; }}
    .track-header h2 {{ display: inline; font-size: 1.25rem; margin: 0; }}
    .track-meta {{ display: flex; gap: 16px; font-size: 0.9rem; color: var(--muted); }}
    .track-desc {{ margin: 4px 0; font-size: 0.92rem; }}
    .cards-grid {{ margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 16px; }}
    .card {{ border: 1px solid var(--border); border-radius: 14px; padding: 14px; background: #fffdfb; display: flex; flex-direction: column; gap: 10px; }}
    .card-rec {{ border: 2px solid var(--mint); background: #f9fffc; }}
    .card-head {{ display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }}
    .card-head h3 {{ margin: 0; font-family: ui-monospace, Menlo, monospace; font-size: 1.02rem; }}
    .seed-tag {{ font-size: 0.78rem; color: var(--muted); }}
    .badge {{ font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; display: inline-block; }}
    .badge-rec {{ background: var(--mint-bg); color: var(--mint); border: 1px solid #9fd8c6; }}
    .badge-ai {{ background: #e0f2fe; color: #0369a1; }}
    .badge-synth {{ background: #dcfce7; color: #15803d; }}
    .review-box {{ margin: 0; font-size: 0.85rem; background: var(--gold-bg); color: var(--gold-ink); border-left: 3px solid #f59e0b; padding: 7px 10px; border-radius: 6px; }}
    .warn-box {{ margin: 0; font-size: 0.8rem; background: #fff1f2; color: #9f1239; padding: 6px 9px; border-radius: 6px; }}
    .player-box {{ background: var(--surface-soft); border: 1px solid var(--border); border-radius: 10px; padding: 9px; display: grid; gap: 6px; }}
    .seam-box {{ background: #f5f7ff; border-color: #d9e0f5; }}
    .player-row {{ display: flex; justify-content: space-between; align-items: center; gap: 8px; }}
    .player-label {{ font-size: 0.78rem; font-weight: 600; }}
    audio {{ width: 100%; height: 34px; }}
    .loop-btn, .burst-btn {{ font-size: 0.75rem; border: 1px solid var(--border); background: var(--surface); color: var(--ink); border-radius: 999px; padding: 3px 9px; cursor: pointer; }}
    .loop-btn.active, .burst-btn.is-playing {{ background: var(--mint); color: #fff; border-color: var(--mint); }}
    .burst-bar {{ display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--muted); }}
    dl.metrics {{ margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px 10px; font-size: 0.78rem; background: #faf8fc; border: 1px solid #ece7f3; border-radius: 9px; padding: 8px; }}
    dl.metrics dt {{ color: var(--muted); font-size: 0.72rem; }}
    dl.metrics dd {{ margin: 0; font-weight: 600; }}
    details.prompt-details {{ font-size: 0.8rem; color: var(--muted); }}
    .prompt-text {{ margin: 6px 0 0; padding: 7px; background: #f7f5fa; border-radius: 6px; font-family: ui-monospace, Menlo, monospace; font-size: 0.74rem; word-break: break-word; }}
    .spec-figure {{ margin: 0; border-radius: 9px; overflow: hidden; border: 1px solid #2b3040; cursor: zoom-in; }}
    .spec-figure img {{ display: block; width: 100%; height: auto; }}
    #lightbox {{ display: none; position: fixed; inset: 0; background: rgba(16,18,26,0.88); z-index: 1000; align-items: center; justify-content: center; padding: 24px; cursor: zoom-out; }}
    #lightbox img {{ max-width: 96vw; max-height: 92vh; border-radius: 10px; }}
  </style>
</head>
<body>
  <header>
    <h1>《直到你找到我 ～青葉學園網站研究社～》v2 音訊重產與實聽審核試聽頁</h1>
    <p class="sub">12 首情境 BGM × 3 候選（36 檔）＋ 9 種遊戲 SFX × 4 候選（36 檔）— 全部候選皆經人耳完整聆聽確認、−18 LUFS（BGM）對齊、接縫 ±500 ms ≤ 1.5 dB。</p>
    <div class="banner">
      <div><strong>BGM 模型：</strong>{html.escape(str(model.get('name', 'ACE-Step 1.5')))}（{html.escape(str(model.get('huggingface_id', 'ACE-Step/Ace-Step1.5')))}，{html.escape(str(model.get('license', 'MIT')))}）｜<strong>SFX 模型：</strong>Stable Audio Open 1.0（card／grow／bond／win，Stability AI Community License — Powered by Stability AI）＋ Python 本機物理／FM 合成（click／blip／choice／fail／shock）</div>
      <div><strong>環境與產量：</strong>{html.escape(str(env.get('gpu_name', 'Colab L4')))} ｜ 總耗費 CU：{html.escape(str(cu_spent))} ｜ <code>public/audio/</code> 總大小：{html.escape(str(total_size_mb))} MB</div>
    </div>
    <nav class="pills">
      {bgm_pills}
      {sfx_pills}
    </nav>
  </header>
  <main>
    <h2 class="group-title">背景音樂（BGM · 12 首 × 3 候選）</h2>
    {bgm_sections}
    <h2 class="group-title">遊戲音效（SFX · 9 種 × 4 候選）</h2>
    {sfx_sections}
  </main>
  <div id="lightbox" onclick="this.style.display='none'"><img id="lightbox-img" src="" alt="zoom" /></div>
  <script>
    const allAudios = Array.from(document.querySelectorAll('audio'));
    allAudios.forEach((audio) => {{
      audio.addEventListener('play', () => {{
        allAudios.forEach((other) => {{ if (other !== audio && !other.paused) other.pause(); }});
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
        btn.textContent = enabled ? '無縫循環預覽：開' : '無縫循環預覽：關';
        if (enabled && audio.currentTime < loopEnd - 6) audio.currentTime = Math.max(loopStart, loopEnd - 5);
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
        document.getElementById('lightbox-img').src = img.src;
        document.getElementById('lightbox').style.display = 'flex';
      }});
    }});
    let activeBurst = null;
    function stopBurst() {{
      if (!activeBurst) return;
      clearInterval(activeBurst.timer);
      activeBurst.btn.classList.remove('is-playing');
      activeBurst.status.textContent = '已停止';
      activeBurst = null;
    }}
    function toggleBurst(btn) {{
      if (activeBurst && activeBurst.btn === btn) {{ stopBurst(); return; }}
      stopBurst();
      const src = btn.dataset.src, intervalMs = Number(btn.dataset.interval || 100);
      const statusEl = btn.parentElement.querySelector('.burst-status');
      const pool = Array.from({{ length: 6 }}, () => new Audio(src));
      let count = 0;
      const playOnce = () => {{
        if (!activeBurst || activeBurst.btn !== btn) return;
        const a = pool[count % 6];
        a.currentTime = 0; a.play().catch(() => {{}});
        count += 1; statusEl.textContent = `${{count}}/10`;
        if (count >= 10) {{ clearInterval(activeBurst.timer); btn.classList.remove('is-playing'); activeBurst = null; }}
      }};
      btn.classList.add('is-playing');
      activeBurst = {{ btn, timer: setInterval(playOnce, intervalMs), status: statusEl }};
      playOnce();
    }}
  </script>
</body>
</html>
"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bgm-json", type=Path, required=True)
    ap.add_argument("--sfx-json", type=Path, default=None)
    ap.add_argument("--out-html", type=Path, required=True)
    ap.add_argument("--bgm-prefix", default="bgm/")
    ap.add_argument("--sfx-prefix", default="sfx/")
    args = ap.parse_args()

    bgm_data = json.loads(args.bgm_json.read_text(encoding="utf-8"))
    sfx_data = json.loads(args.sfx_json.read_text(encoding="utf-8")) if args.sfx_json and args.sfx_json.exists() else None
    args.out_html.parent.mkdir(parents=True, exist_ok=True)
    args.out_html.write_text(
        build_unified_html(bgm_data, sfx_data, bgm_prefix=args.bgm_prefix, sfx_prefix=args.sfx_prefix),
        encoding="utf-8",
    )
    print(f"Wrote {args.out_html}")


if __name__ == "__main__":
    main()
