#!/usr/bin/env bash
# 第三輪：晴 hare_D、翔 kuro_A、成年女性 npc_woman_A 重跑（口音 A、設計模式、新守門）→ 下載 → 本機後處理。
# 用法：scripts/colab/voice/r3/run_colab_r3.sh [輸出根目錄=/tmp/seo-journey-audio]
# 環境變數：
#   KEEP_SESSION=1   跑完不 stop VM，讓同一台 VM 接著跑量產煙霧測試（之後由 produce/run_produce.sh 以 REUSE=1 接手並負責 stop）
#   REUSE=1          重用已存在的 session（跳過 new 與 setup；腳本修正後重傳重跑用）
#   KEEP_ON_FAIL=1   失敗時不 stop VM（開發除錯用；用完務必手動 colab stop 並確認 colab sessions 為空）
#   R3_SMOKE=1       只跑每個聲音 1 句、每句 2 個 take（驗證環境）
#   R3_FIRST_TAKES   首輪每句 take 數（預設 4）
#   其餘見 colab_session.sh（COLAB_GPU、WAIT_MAX_MIN、USE_ASR_CACHE、PACK_ASR_CACHE）
# 規則：只 stop 自己建立的 session（獨立 --config 檔）；失敗一定 stop。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_BASE="${1:-/tmp/seo-journey-audio}"
R3_DIR="${OUT_BASE}/voice-r3"
COLAB_CFG="${COLAB_CFG:-${OUT_BASE}/colab-voice-r3.json}"
SESSION_NAME="${SESSION_NAME:-voice-r3}"
mkdir -p "${R3_DIR}"
# shellcheck source=colab_session.sh
source "${SCRIPT_DIR}/colab_session.sh"
[ "${KEEP_ON_FAIL:-0}" = "1" ] || trap session_cleanup EXIT
[ -z "${PACK_ASR_CACHE:-}" ] && { [ -f "${ASR_CACHE_LOCAL}" ] && PACK_ASR_CACHE=0 || PACK_ASR_CACHE=1; }

if [ "${REUSE:-0}" != "1" ]; then
  session_up
  weights_cache_upload
  echo "=== 環境準備 ==="
  C exec -s "${SESSION_NAME}" --timeout 2400 --env "PACK_ASR_CACHE=${PACK_ASR_CACHE}" -f "${SCRIPT_DIR}/setup_vm_r3.py"
  weights_cache_download
fi

echo "=== 上傳並於 VM 背景啟動生成 ==="
for f in r3_common.py voices_r3.json asr_equiv.json generate_r3.py; do
  C upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/${f}" "/content/${f}"
done
extra=()
for v in R3_SMOKE R3_FIRST_TAKES R3_ONLY; do [ -n "${!v:-}" ] && extra+=("${v}=${!v}"); done
vm_launch generate_r3.py /content/gen_r3.log "${extra[@]+"${extra[@]}"}"

POLL_PY="$(mktemp)"
cat > "${POLL_PY}" <<'PYEOF'
import subprocess
print(subprocess.run("grep -E '== 第|DONE:|Traceback' /content/gen_r3.log | tail -n 3; tail -n 1 /content/gen_r3.log", shell=True, capture_output=True, text=True).stdout)
PYEOF
while true; do
  sleep 60
  STATUS="$(C exec -s "${SESSION_NAME}" -f "${POLL_PY}" 2>/dev/null || true)"
  echo "$(date +%H:%M:%S) ${STATUS}" | tail -n 3
  if echo "${STATUS}" | grep -q "DONE:"; then break; fi
  if echo "${STATUS}" | grep -q "Traceback"; then echo "生成失敗，見 VM 的 /content/gen_r3.log"; C download -s "${SESSION_NAME}" /content/gen_r3.log "${R3_DIR}/gen_r3.log" || true; exit 1; fi
done
rm -f "${POLL_PY}"

echo "=== 下載成果 ==="
C download -s "${SESSION_NAME}" /content/r3_bundle.tar.gz "${OUT_BASE}/r3_bundle.tar.gz"
C download -s "${SESSION_NAME}" /content/gen_r3.log "${R3_DIR}/gen_r3.log" || true
C download -s "${SESSION_NAME}" /content/setup_report.json "${R3_DIR}/setup_report.json" || true
rm -rf "${R3_DIR}/raw"; mkdir -p "${R3_DIR}/raw"
tar -xzf "${OUT_BASE}/r3_bundle.tar.gz" -C "${R3_DIR}/raw"; rm -f "${OUT_BASE}/r3_bundle.tar.gz"

if [ "${KEEP_SESSION:-0}" = "1" ]; then
  trap - EXIT
  echo "KEEP_SESSION=1：VM 保留給下一步（produce/run_produce.sh，REUSE=1）；請務必由該步驟或手動 colab stop。"
else
  echo "=== 停止自己的 Colab VM ==="
  C stop -s "${SESSION_NAME}"
  trap - EXIT
  colab sessions; colab usage
fi

echo "=== 本機後處理 ==="
python3 "${SCRIPT_DIR}/postprocess_r3.py" "${R3_DIR}"
echo "完成：${R3_DIR}/candidates_r3.json（試聽頁用 build_page_r3.py 另外產生）"
