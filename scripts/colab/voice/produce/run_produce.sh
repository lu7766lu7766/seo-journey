#!/usr/bin/env bash
# 量產 driver：建 L4 → 環境準備（含 ASR 權重快取）→ 上傳 → VM 背景生成（12 句一批、全守門、重抽）→ 本機增量下載 → 停 VM → 轉 MP3＋更新 manifest。
#
# 用法：scripts/colab/voice/produce/run_produce.sh [輸出根目錄=/tmp/seo-journey-audio]
# 環境變數：
#   PRODUCE_SMOKE=1     煙霧測試：只做 smoke_ids.json 的 10 句；輸出到 <WORK>/public-voice（不動 repo 的 public/audio/voice）
#   PUBLIC_VOICE_DIR    最終 MP3 與 manifest 位置（正式：<repo>/public/audio/voice）
#   REFRESH_LINES=0     不重產 scripts/audio/voice-lines.json（預設會先跑 node scripts/list-voice-lines.mjs，以目前劇本為準）
#   REUSE=1             重用已存在的 session（跳過 new 與 setup；用於同一個 VM 先跑別的再跑量產）
#   MAX_ATTEMPTS / PRODUCE_CHUNK / PRODUCE_LIMIT   傳給 produce.py
#   POLL_S              輪詢間隔秒數（預設 60；煙霧測試 30）
#   STALE_MIN           VM 端程序超過幾分鐘沒更新 progress 且已不存在 → 判定失敗（預設 10）
#   COLAB_GPU / WAIT_MAX_MIN / USE_ASR_CACHE / PACK_ASR_CACHE   見 ../r3/colab_session.sh
#
# 斷點續跑：本機 <WORK>/raw/wav/**.json 就是「已完成」的記錄。VM 被回收或中途失敗後，直接重跑本腳本：
#   已完成的句子會以 done.json 傳給 VM 跳過，只做剩下的；每個 chunk（72 句）一完成就下載，所以最多損失一個 chunk。
# 規則：只 stop 自己建立的 session（獨立 --config 檔）；結束一定 stop 並列出剩餘 session；腳本結束時沒有任何背景程序。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
R3_DIR="${SCRIPT_DIR}/../r3"
REPO="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
OUT_BASE="${1:-/tmp/seo-journey-audio}"
SMOKE="${PRODUCE_SMOKE:-0}"
WORK="${OUT_BASE}/voice-produce$([ "${SMOKE}" = 1 ] && echo -smoke)"
PUBLIC="${PUBLIC_VOICE_DIR:-$([ "${SMOKE}" = 1 ] && echo "${WORK}/public-voice" || echo "${REPO}/public/audio/voice")}"
COLAB_CFG="${COLAB_CFG:-${OUT_BASE}/colab-voice-r3.json}"
SESSION_NAME="${SESSION_NAME:-voice-r3}"
POLL_S="${POLL_S:-$([ "${SMOKE}" = 1 ] && echo 30 || echo 60)}"
STALE_MIN="${STALE_MIN:-10}"
mkdir -p "${WORK}/raw" "${WORK}/packs" "${WORK}/meta"
# shellcheck source=../r3/colab_session.sh
source "${R3_DIR}/colab_session.sh"
trap session_cleanup EXIT
[ -z "${PACK_ASR_CACHE:-}" ] && PACK_ASR_CACHE=0

if [ "${REFRESH_LINES:-1}" = "1" ]; then
  echo "=== 重產 voice-lines.json（以目前劇本為準）==="
  (cd "${REPO}" && node scripts/list-voice-lines.mjs --quiet)
fi
LINES_JSON="${REPO}/scripts/audio/voice-lines.json"

echo "=== 本機已完成清單 ==="
python3 - "${WORK}/raw" "${WORK}/meta/done.json" <<'PYEOF'
import glob, json, os, sys
raw, out = sys.argv[1:3]
ids = []
for p in glob.glob(os.path.join(raw, "wav", "*", "*.json")):
    m = json.load(open(p, encoding="utf-8"))
    if m.get("status") == "done" and os.path.exists(p[:-5] + ".wav"):
        ids.append(m["id"])
json.dump(sorted(ids), open(out, "w"))
print(f"本機已有 {len(ids)} 句完成（續跑時會跳過）")
PYEOF

if [ "${REUSE:-0}" != "1" ]; then
  session_up
  echo "實際取得的卡型：${GPU_ACTUAL}"; echo "${GPU_ACTUAL}" > "${WORK}/meta/hardware.txt"
  weights_cache_upload
  echo "=== 環境準備 ==="
  C upload -s "${SESSION_NAME}" "${R3_DIR}/setup_vm_r3.py" /content/setup_vm_r3.py
  C exec -s "${SESSION_NAME}" --timeout 2400 --env "PACK_ASR_CACHE=${PACK_ASR_CACHE}" -f "${R3_DIR}/setup_vm_r3.py"
  weights_cache_download
fi

echo "=== 上傳並於 VM 背景啟動量產 ==="
RESET_PY="$(mktemp)"
cat > "${RESET_PY}" <<'PYEOF'
# 新一輪啟動前清掉舊的 progress／packs／ids（state.json 與 wav 保留，供同一個 VM 續跑；produce.py 會把「VM 有、本機沒有」的句子補打成 catch-up pack）
import glob, os
os.makedirs("/content/produce_out/packs", exist_ok=True)
for p in glob.glob("/content/produce_out/packs/*") + ["/content/produce_out/progress.json", "/content/produce_out/report.json", "/content/ids.json"]:
    if os.path.exists(p): os.remove(p)
print("reset ok")
PYEOF
C exec -s "${SESSION_NAME}" -f "${RESET_PY}"; rm -f "${RESET_PY}"
for f in "${R3_DIR}/r3_common.py" "${R3_DIR}/voices_r3.json" "${R3_DIR}/asr_equiv.json" "${SCRIPT_DIR}/emotion.py" "${SCRIPT_DIR}/emotion_map.json" "${SCRIPT_DIR}/speaker_map.json" "${SCRIPT_DIR}/produce.py"; do
  C upload -s "${SESSION_NAME}" "${f}" "/content/$(basename "${f}")"
done
C upload -s "${SESSION_NAME}" "${LINES_JSON}" /content/voice-lines.json
C upload -s "${SESSION_NAME}" "${WORK}/meta/done.json" /content/done.json
if [ "${SMOKE}" = 1 ]; then C upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/smoke_ids.json" /content/ids.json; fi
extra=()
for v in MAX_ATTEMPTS PRODUCE_CHUNK PRODUCE_LIMIT; do [ -n "${!v:-}" ] && extra+=("${v}=${!v}"); done
vm_launch produce.py /content/produce.log "${extra[@]+"${extra[@]}"}"

POLL_PY="$(mktemp)"
cat > "${POLL_PY}" <<'PYEOF'
import json, os, subprocess, time
p = "/content/produce_out/progress.json"
d = json.load(open(p)) if os.path.exists(p) else {}
d["age_s"] = round(time.time() - d["updated"], 1) if d.get("updated") else None
d["alive"] = subprocess.run("pgrep -f '[p]ython3 produce.py' >/dev/null", shell=True).returncode == 0
d["log_tail"] = subprocess.run("tail -n 2 /content/produce.log", shell=True, capture_output=True, text=True).stdout.strip()[-300:]
print("PROGRESS_JSON " + json.dumps(d, ensure_ascii=False))
PYEOF
PARSE_PY="$(mktemp)"
cat > "${PARSE_PY}" <<'PYEOF'
# 讀 PROGRESS_JSON 行，印出一行摘要與需要下載的新 pack（stdout：第一行 STATUS，其餘每行一個 pack 名）
import json, sys
done = set(open(sys.argv[1]).read().split()) if len(sys.argv) > 1 else set()
line = next((l for l in sys.stdin.read().splitlines() if l.startswith("PROGRESS_JSON ")), None)
if not line:
    print("STATUS unknown"); sys.exit(0)
d = json.loads(line[len("PROGRESS_JSON "):])
state = "error" if d.get("error") else "finished" if d.get("finished") else "dead" if (not d.get("alive") and (d.get("age_s") or 0) > float(sys.argv[2]) * 60) else "running"
print(f"STATUS {state} | {d.get('phase')} chunk {d.get('chunks_done')}/{d.get('chunks_total')} 通過 {d.get('done_this_run')} 失敗 {d.get('failed_this_run')} take {d.get('takes')} 距上次更新 {d.get('age_s')}s | {d.get('log_tail', '').splitlines()[-1] if d.get('log_tail') else ''}"[:260])
for p in d.get("packs", []):
    if p not in done: print(p)
PYEOF
RUN_ID="$(date +%Y%m%d-%H%M%S)"
PACK_DIR="${WORK}/packs/${RUN_ID}"; mkdir -p "${PACK_DIR}"
GOT="${WORK}/meta/got-${RUN_ID}.txt"; : > "${GOT}"

fetch_packs() {  # $1 = 輪詢輸出；下載尚未取得的 pack 並解壓到 raw/
  local out="$1" status
  status="$(printf '%s\n' "${out}" | python3 "${PARSE_PY}" "${GOT}" "${STALE_MIN}")"
  echo "$(date +%H:%M:%S) $(printf '%s\n' "${status}" | head -n 1)"
  printf '%s\n' "${status}" | tail -n +2 | while read -r pk; do
    [ -z "${pk}" ] && continue
    Ct 600 download -s "${SESSION_NAME}" "/content/produce_out/packs/${pk}" "${PACK_DIR}/${pk}" || continue
    tar -xf "${PACK_DIR}/${pk}" -C "${WORK}/raw" && echo "${pk}" >> "${GOT}"
    echo "  已下載並解壓 ${pk}"
  done
  printf '%s\n' "${status}" | head -n 1 | awk '{print $2}'
}

echo "=== 輪詢並增量下載（每 ${POLL_S} 秒）==="
FINAL=""
while true; do
  sleep "${POLL_S}"
  OUT_TXT="$(Ct 90 exec -s "${SESSION_NAME}" --timeout 60 -f "${POLL_PY}" 2>&1 || true)"
  state="$(fetch_packs "${OUT_TXT}" | tee /dev/stderr | tail -n 1)"
  case "${state}" in
    finished) FINAL=ok; break ;;
    error|dead) FINAL="${state}"; break ;;
  esac
done

echo "=== 取回報告與 log ==="
Ct 300 download -s "${SESSION_NAME}" /content/produce_out/report.json "${WORK}/report.json" || true
Ct 300 download -s "${SESSION_NAME}" /content/produce_out/progress.json "${WORK}/progress.json" || true
Ct 300 download -s "${SESSION_NAME}" /content/produce.log "${WORK}/produce.log" || true
Ct 300 download -s "${SESSION_NAME}" /content/setup_report.json "${WORK}/setup_report.json" || true
# 失敗時再補抓一次 pack（可能剛好在最後寫入）
OUT_TXT="$(Ct 90 exec -s "${SESSION_NAME}" --timeout 60 -f "${POLL_PY}" 2>&1 || true)"; fetch_packs "${OUT_TXT}" >/dev/null || true
rm -f "${POLL_PY}" "${PARSE_PY}"

echo "=== 停止自己的 Colab VM ==="
C stop -s "${SESSION_NAME}"
trap - EXIT
colab sessions; colab usage
if [ "${FINAL}" != "ok" ]; then echo "VM 端生成未正常結束（${FINAL}），見 ${WORK}/produce.log；已完成的句子已下載，修好後重跑即可續跑"; fi

echo "=== 本機：MP3 後處理與 manifest ==="
python3 "${SCRIPT_DIR}/finalize_produce.py" --hardware "$(cat "${WORK}/meta/hardware.txt" 2>/dev/null || true)" --raw "${WORK}/raw" --public "${PUBLIC}" --lines "${LINES_JSON}" --summary "${WORK}/finalize_summary.json"
echo "完成：${PUBLIC}（報告 ${WORK}/report.json、${WORK}/finalize_summary.json）"
[ "${FINAL}" = "ok" ]
