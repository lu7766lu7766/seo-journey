#!/usr/bin/env bash
# 角色聲音試聽樣本：Colab 生成 → 下載 → 本機後處理 → 試聽頁。
# 用法：scripts/colab/voice/run_colab.sh [輸出目錄=/tmp/seo-journey-audio]
# 環境變數：COLAB_GPU（預設 L4）、VOICE_TAKES（每句 take 數，預設 3）、
#           WAIT_MAX_MIN（等不到 GPU 時最久等待分鐘，預設 30）、REUSE=1（重用已存在的 session，跳過 new）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_BASE="${1:-/tmp/seo-journey-audio}"
VOICE_DIR="${OUT_BASE}/voice"
COLAB_CFG="${OUT_BASE}/colab-voice.json"
SESSION_NAME="voice-cast"
GPU_TYPE="${COLAB_GPU:-L4}"
TAKES="${VOICE_TAKES:-3}"
WAIT_MAX_MIN="${WAIT_MAX_MIN:-30}"
mkdir -p "${VOICE_DIR}"

cleanup() {
  echo "[run_colab] 確保 session '${SESSION_NAME}' 已停止…"
  colab --config "${COLAB_CFG}" stop -s "${SESSION_NAME}" >/dev/null 2>&1 || true
  colab --config "${COLAB_CFG}" sessions || true
}
trap cleanup EXIT

echo "=== compute units（前）==="; colab usage

if [ "${REUSE:-0}" != "1" ]; then
  echo "=== 建立 ${GPU_TYPE} session（帳號同時只能一台 GPU；被占用就每 3 分鐘重試）==="
  waited=0
  until colab --config "${COLAB_CFG}" new -s "${SESSION_NAME}" --gpu "${GPU_TYPE}"; do
    if [ "${waited}" -ge "${WAIT_MAX_MIN}" ]; then echo "等待逾時 ${WAIT_MAX_MIN} 分鐘，放棄"; exit 2; fi
    echo "GPU 暫時不可用，3 分鐘後重試（已等 ${waited} 分鐘）"; sleep 180; waited=$((waited + 3))
  done
fi

echo "=== 環境準備 ==="
colab --config "${COLAB_CFG}" exec -s "${SESSION_NAME}" --timeout 2400 -f "${SCRIPT_DIR}/setup_vm.py"

echo "=== 上傳並於 VM 背景啟動生成 ==="
colab --config "${COLAB_CFG}" upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/characters.json" /content/characters.json
colab --config "${COLAB_CFG}" upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/generate.py" /content/generate.py
LAUNCH_PY="$(mktemp)"
cat > "${LAUNCH_PY}" <<PYEOF
import subprocess
subprocess.Popen("cd /content && VOICE_TAKES=${TAKES} nohup python3 generate.py > /content/gen.log 2>&1 &", shell=True)
print("launched")
PYEOF
colab --config "${COLAB_CFG}" exec -s "${SESSION_NAME}" -f "${LAUNCH_PY}"

POLL_PY="$(mktemp)"
cat > "${POLL_PY}" <<'PYEOF'
import subprocess
print(subprocess.run("grep -E '\\] PASS|DONE:|Traceback' /content/gen.log | tail -n 3; tail -n 1 /content/gen.log", shell=True, capture_output=True, text=True).stdout)
PYEOF
while true; do
  sleep 120
  STATUS="$(colab --config "${COLAB_CFG}" exec -s "${SESSION_NAME}" -f "${POLL_PY}" 2>/dev/null || true)"
  echo "${STATUS}"
  if echo "${STATUS}" | grep -q "DONE:"; then break; fi
  if echo "${STATUS}" | grep -q "Traceback"; then echo "生成失敗，見 VM 的 /content/gen.log"; exit 1; fi
done

echo "=== 下載成果 ==="
colab --config "${COLAB_CFG}" download -s "${SESSION_NAME}" /content/voice_bundle.tar.gz "${OUT_BASE}/voice_bundle.tar.gz"
rm -rf "${VOICE_DIR}/raw"; mkdir -p "${VOICE_DIR}/raw"
tar -xzf "${OUT_BASE}/voice_bundle.tar.gz" -C "${VOICE_DIR}/raw"
rm -f "${OUT_BASE}/voice_bundle.tar.gz"

echo "=== 停止 Colab VM ==="
colab --config "${COLAB_CFG}" stop -s "${SESSION_NAME}"
trap - EXIT
colab --config "${COLAB_CFG}" sessions; colab sessions; colab usage

echo "=== 本機後處理與試聽頁 ==="
python3 "${SCRIPT_DIR}/postprocess.py" "${VOICE_DIR}"
python3 "${SCRIPT_DIR}/build_page.py" "${VOICE_DIR}"
echo "完成：${VOICE_DIR}/index.html"
