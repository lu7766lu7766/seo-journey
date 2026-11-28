#!/usr/bin/env bash
# 第三輪／量產共用的 Colab 工作階段函式（由 run_colab_r3.sh 與 produce/run_produce.sh 以 source 載入）。
# 規則：使用獨立的 --config 檔，只會 stop 自己建立的 session，不碰別人的；結束（含失敗、Ctrl-C）一定 stop 並列出剩餘 session。
#
# 需要先設定：COLAB_CFG（session 狀態檔）、SESSION_NAME、OUT_BASE
# 提供：C（colab 包裝）、session_up（等到拿到 L4 才往下）、weights_cache_*、session_cleanup（EXIT trap）

C() { colab --config "${COLAB_CFG}" "$@"; }

session_cleanup() {
  echo "[colab_session] 確保自己的 session '${SESSION_NAME}' 已停止…"
  C stop -s "${SESSION_NAME}" >/dev/null 2>&1 || true
  colab sessions || true
}

# 建 session：帳號同時只能一台，有別人的 session 就每 5 分鐘重試（最久 WAIT_MAX_MIN 分鐘）；不會 stop 不是自己建立的 session。
session_up() {
  local gpu="${COLAB_GPU:-L4}" waited=0 max="${WAIT_MAX_MIN:-720}"
  echo "=== compute units（前）==="; colab usage
  echo "=== 既有 session（不屬於本腳本的不會被動到）==="; colab sessions || true
  until C new -s "${SESSION_NAME}" --gpu "${gpu}"; do
    if [ "${waited}" -ge "${max}" ]; then echo "等待逾時 ${max} 分鐘，放棄"; return 2; fi
    echo "GPU 暫時不可用（帳號同時只能一台），5 分鐘後重試（已等 ${waited} 分鐘）"; sleep 300; waited=$((waited + 5))
  done
}

# ASR 權重快取：本機 ~/.cache/seo-journey-voice/asr-weights.tar（不進版控）。第一次由 setup 在 VM 打包後下載；之後上傳可省掉下載。
ASR_CACHE_LOCAL="${ASR_CACHE_LOCAL:-${HOME}/.cache/seo-journey-voice/asr-weights.tar}"

weights_cache_upload() {
  if [ -f "${ASR_CACHE_LOCAL}" ] && [ "${USE_ASR_CACHE:-1}" = "1" ]; then
    echo "上傳本機 ASR 權重快取（$(du -h "${ASR_CACHE_LOCAL}" | cut -f1)）…"
    C upload -s "${SESSION_NAME}" "${ASR_CACHE_LOCAL}" /content/asr-weights.tar
  fi
}

weights_cache_download() {
  if [ ! -f "${ASR_CACHE_LOCAL}" ] && [ "${PACK_ASR_CACHE:-0}" = "1" ]; then
    mkdir -p "$(dirname "${ASR_CACHE_LOCAL}")"
    C download -s "${SESSION_NAME}" /content/asr-weights.tar "${ASR_CACHE_LOCAL}" || rm -f "${ASR_CACHE_LOCAL}"
  fi
}

# 在 VM 以背景程序啟動 python 腳本；$1 腳本名（/content 下）、$2 log 檔、其餘為 KEY=VALUE 環境變數
vm_launch() {
  local script="$1" logf="$2"; shift 2
  local envs="" kv
  for kv in "$@"; do envs="${envs} ${kv}"; done
  local f; f="$(mktemp)"
  cat > "${f}" <<PYEOF
import subprocess
subprocess.Popen("cd /content &&${envs} nohup python3 ${script} > ${logf} 2>&1 &", shell=True)
print("launched ${script}")
PYEOF
  C exec -s "${SESSION_NAME}" -f "${f}"; rm -f "${f}"
}
