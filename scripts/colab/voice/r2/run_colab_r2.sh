#!/usr/bin/env bash
# 第二輪角色聲音：Colab 生成（設計模式＋守門＋重抽＋複製＋口頭禪，可選 VoxCPM2）→ 下載 → 本機後處理 → 試聽頁。
# 用法：scripts/colab/voice/r2/run_colab_r2.sh [輸出根目錄=/tmp/seo-journey-audio]
# 環境變數：COLAB_GPU（預設 L4）、WAIT_MAX_MIN（等不到 GPU 時最久等待分鐘，預設 720，每 5 分鐘重試）、
#           R2_SMOKE=1（只跑 2 個聲音×2 句，驗證環境）、RUN_VOX=1（Qwen 階段後在同一 VM 接著跑 VoxCPM2 對照）、
#           REUSE=1（重用已存在的 session，跳過 new 與 setup）
# 規則：只會 stop 本腳本自己建立的 session（使用獨立的 --config 檔，不碰別人的 session）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_BASE="${1:-/tmp/seo-journey-audio}"
R2_DIR="${OUT_BASE}/voice-r2"
COLAB_CFG="${OUT_BASE}/colab-voice-r2.json"
SESSION_NAME="voice-r2"
GPU_TYPE="${COLAB_GPU:-L4}"
WAIT_MAX_MIN="${WAIT_MAX_MIN:-720}"
mkdir -p "${R2_DIR}"
C() { colab --config "${COLAB_CFG}" "$@"; }

cleanup() {
  echo "[run_colab_r2] 確保自己的 session '${SESSION_NAME}' 已停止…"
  C stop -s "${SESSION_NAME}" >/dev/null 2>&1 || true
  C sessions || true
}
trap cleanup EXIT

echo "=== compute units（前）==="; colab usage
echo "=== 既有 session（不屬於本腳本的不會被動到）==="; colab sessions || true

if [ "${REUSE:-0}" != "1" ]; then
  waited=0
  until C new -s "${SESSION_NAME}" --gpu "${GPU_TYPE}"; do
    if [ "${waited}" -ge "${WAIT_MAX_MIN}" ]; then echo "等待逾時 ${WAIT_MAX_MIN} 分鐘，放棄"; exit 2; fi
    echo "GPU 暫時不可用（帳號同時只能一台），5 分鐘後重試（已等 ${waited} 分鐘）"; sleep 300; waited=$((waited + 5))
  done
  echo "=== 環境準備 ==="
  C exec -s "${SESSION_NAME}" --timeout 2400 -f "${SCRIPT_DIR}/setup_vm_r2.py"
fi

echo "=== 上傳並於 VM 背景啟動生成 ==="
C upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/voices_r2.json" /content/voices_r2.json
C upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/../characters.json" /content/characters.json
C upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/r2_common.py" /content/r2_common.py
C upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/generate_r2.py" /content/generate_r2.py
C upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/generate_voxcpm.py" /content/generate_voxcpm.py
LAUNCH_PY="$(mktemp)"
cat > "${LAUNCH_PY}" <<PYEOF
import subprocess
subprocess.Popen("cd /content && R2_SMOKE=${R2_SMOKE:-0} nohup python3 generate_r2.py > /content/gen_r2.log 2>&1 &", shell=True)
print("launched")
PYEOF
C exec -s "${SESSION_NAME}" -f "${LAUNCH_PY}"

POLL_PY="$(mktemp)"
cat > "${POLL_PY}" <<'PYEOF'
import subprocess
print(subprocess.run("grep -E '== 第|PASS .* done|DONE:|Traceback' /content/gen_r2.log | tail -n 3; tail -n 1 /content/gen_r2.log", shell=True, capture_output=True, text=True).stdout)
PYEOF
while true; do
  sleep 180
  STATUS="$(C exec -s "${SESSION_NAME}" -f "${POLL_PY}" 2>/dev/null || true)"
  echo "${STATUS}"
  if echo "${STATUS}" | grep -q "DONE:"; then break; fi
  if echo "${STATUS}" | grep -q "Traceback"; then echo "生成失敗，見 VM 的 /content/gen_r2.log"; exit 1; fi
done

echo "=== 下載成果 ==="
C download -s "${SESSION_NAME}" /content/r2_bundle.tar.gz "${OUT_BASE}/r2_bundle.tar.gz"
rm -rf "${R2_DIR}/raw"; mkdir -p "${R2_DIR}/raw"
tar -xzf "${OUT_BASE}/r2_bundle.tar.gz" -C "${R2_DIR}/raw"; rm -f "${OUT_BASE}/r2_bundle.tar.gz"

if [ "${RUN_VOX:-0}" = "1" ]; then
  echo "=== VoxCPM2 備案對照（同一 VM）==="
  SETUP_ENV="$(mktemp)"; { echo "import os,runpy"; echo "os.environ['SETUP_VOX']='1'"; echo "runpy.run_path('/content/setup_vm_r2.py')"; } > "${SETUP_ENV}"
  C upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/setup_vm_r2.py" /content/setup_vm_r2.py
  C exec -s "${SESSION_NAME}" --timeout 2400 -f "${SETUP_ENV}"
  VLAUNCH="$(mktemp)"
  cat > "${VLAUNCH}" <<PYEOF
import subprocess
subprocess.Popen("cd /content && R2_SMOKE=${R2_SMOKE:-0} nohup python3 generate_voxcpm.py > /content/gen_vox.log 2>&1 &", shell=True)
print("launched")
PYEOF
  C exec -s "${SESSION_NAME}" -f "${VLAUNCH}"
  VPOLL="$(mktemp)"
  cat > "${VPOLL}" <<'PYEOF'
import subprocess
print(subprocess.run("grep -E 'PASS vox|DONE:|Traceback' /content/gen_vox.log | tail -n 3; tail -n 1 /content/gen_vox.log", shell=True, capture_output=True, text=True).stdout)
PYEOF
  while true; do
    sleep 180
    STATUS="$(C exec -s "${SESSION_NAME}" -f "${VPOLL}" 2>/dev/null || true)"; echo "${STATUS}"
    if echo "${STATUS}" | grep -q "DONE:"; then break; fi
    if echo "${STATUS}" | grep -q "Traceback"; then echo "VoxCPM 失敗，見 VM 的 /content/gen_vox.log"; break; fi
  done
  C download -s "${SESSION_NAME}" /content/vox_bundle.tar.gz "${OUT_BASE}/vox_bundle.tar.gz" || true
  rm -rf "${R2_DIR}/vox_raw"; mkdir -p "${R2_DIR}/vox_raw"
  tar -xzf "${OUT_BASE}/vox_bundle.tar.gz" -C "${R2_DIR}/vox_raw" || true; rm -f "${OUT_BASE}/vox_bundle.tar.gz"
fi

echo "=== 停止自己的 Colab VM ==="
C stop -s "${SESSION_NAME}"
trap - EXIT
C sessions; colab usage

echo "=== 本機後處理與試聽頁 ==="
python3 "${SCRIPT_DIR}/postprocess_r2.py" "${R2_DIR}"
python3 "${SCRIPT_DIR}/build_page_r2.py" "${R2_DIR}"
echo "完成：${R2_DIR}/index.html"
