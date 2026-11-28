#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_BASE="${1:-/tmp/seo-journey-audio/v2}"
BGM_DIR="${OUT_BASE}/bgm"
COLAB_CFG="${OUT_BASE}/colab-bgm.json"
SESSION_NAME="${COLAB_SESSION:-bgm-v2-gen}"
GPU_TYPE="${COLAB_GPU:-L4}"
EXTRA_ARGS="${BGM_EXTRA_ARGS:-}"

mkdir -p "${BGM_DIR}"

cleanup() {
  echo "[run_colab] Ensuring Colab session '${SESSION_NAME}' is stopped..."
  colab --config "${COLAB_CFG}" stop -s "${SESSION_NAME}" >/dev/null 2>&1 || true
  colab --config "${COLAB_CFG}" sessions || true
}
trap cleanup EXIT

echo "=== Compute units before ==="
colab usage

echo "=== Provisioning Colab ${GPU_TYPE} (${SESSION_NAME}) ==="
colab --config "${COLAB_CFG}" new -s "${SESSION_NAME}" --gpu "${GPU_TYPE}"

echo "=== Setting up Colab VM ==="
colab --config "${COLAB_CFG}" exec -s "${SESSION_NAME}" --timeout 1800 -f "${SCRIPT_DIR}/setup_vm.py"

echo "=== Uploading scripts and starting generation in background on the VM ==="
colab --config "${COLAB_CFG}" upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/tracks.json" /content/tracks.json
colab --config "${COLAB_CFG}" upload -s "${SESSION_NAME}" "${SCRIPT_DIR}/generate_and_process.py" /content/generate_and_process.py

LAUNCH_PY="$(mktemp)"
cat > "${LAUNCH_PY}" <<PYEOF
import subprocess
cmd = "cd /content && nohup python3 generate_and_process.py ${EXTRA_ARGS} > /content/gen_v2.log 2>&1 &"
subprocess.Popen(cmd, shell=True)
print("launched:", cmd)
PYEOF
colab --config "${COLAB_CFG}" exec -s "${SESSION_NAME}" -f "${LAUNCH_PY}"
rm -f "${LAUNCH_PY}"

POLL_PY="$(mktemp)"
cat > "${POLL_PY}" <<'PYEOF'
import subprocess
out = subprocess.run("grep -E 'PASS |REJECT |DONE:|Traceback|RuntimeError' /content/gen_v2.log | tail -n 5", shell=True, capture_output=True, text=True).stdout
print(out)
PYEOF
while true; do
  sleep 120
  STATUS="$(colab --config "${COLAB_CFG}" exec -s "${SESSION_NAME}" -f "${POLL_PY}" 2>/dev/null || true)"
  echo "${STATUS}"
  if echo "${STATUS}" | grep -q "DONE:"; then break; fi
  if echo "${STATUS}" | grep -qE "Traceback|RuntimeError"; then echo "generation failed, see /content/gen_v2.log"; exit 1; fi
done
rm -f "${POLL_PY}"

echo "=== Downloading output bundle ==="
colab --config "${COLAB_CFG}" download -s "${SESSION_NAME}" /content/bgm_v2_bundle.tar.gz "${OUT_BASE}/bgm_v2_bundle.tar.gz"
tar -xzf "${OUT_BASE}/bgm_v2_bundle.tar.gz" -C "${BGM_DIR}"
rm -f "${OUT_BASE}/bgm_v2_bundle.tar.gz"

echo "=== Stopping Colab VM ==="
colab --config "${COLAB_CFG}" stop -s "${SESSION_NAME}"
trap - EXIT

echo "=== Verifying sessions & compute units after ==="
colab --config "${COLAB_CFG}" sessions
colab sessions
colab usage
