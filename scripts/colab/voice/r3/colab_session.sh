#!/usr/bin/env bash
# 第三輪／量產共用的 Colab 工作階段函式（由 run_colab_r3.sh 與 produce/run_produce.sh 以 source 載入）。
# 規則：使用獨立的 --config 檔，只會 stop 自己建立的 session，不碰別人的；結束（含失敗、Ctrl-C）一定 stop 並列出剩餘 session。
#
# 需要先設定：COLAB_CFG（session 狀態檔）、SESSION_NAME、OUT_BASE
# 提供：C（colab 包裝）、session_up（等到拿到 L4 才往下）、weights_cache_*、session_cleanup（EXIT trap）

C() { colab --config "${COLAB_CFG}" "$@" </dev/null; }
# 有硬性逾時的版本（輪詢與下載用）：第三輪實測 `colab exec` 偶爾無限期不返回，會卡住整個 driver。用法：Ct <秒> <colab 子指令…>
Ct() { local t="$1"; shift; perl -e 'alarm shift @ARGV; exec @ARGV' "${t}" colab --config "${COLAB_CFG}" "$@" </dev/null; }

session_cleanup() {
  echo "[colab_session] 確保自己的 session '${SESSION_NAME}' 已停止…"
  C stop -s "${SESSION_NAME}" >/dev/null 2>&1 || true
  colab sessions || true
}

# ---- 開機與自動換卡 ---------------------------------------------------------------------------------------------
# COLAB_GPU_FALLBACK（預設 "L4,A100,T4"）：依序嘗試的卡型。
#   * 同一張卡連續 2 次「沒有卡」（Service Unavailable／503／無法分配，兩次間隔 5 分鐘，約 10 分鐘）就換下一張；整輪都失敗再從頭輪詢。
#   * TooManyAssignments（帳號同時只能一台，通常是自己或別人已有 session）不算「沒卡」：不換卡、不計次，照舊每 5 分鐘等待重試。
#   * 每次 `colab new` 之前先確認自己的 session 是否已存在（`colab status -s NAME`）；已存在就直接沿用，絕不重複開機。
#   * WAIT_MAX_MIN（預設 720）為總等待上限。COLAB_GPU（舊變數）只在沒設 COLAB_GPU_FALLBACK 時當成單一卡型。
#   * 測試用：SLEEP_CMD 可換成假的 sleep（tests_colab_session.sh 用它驗證換卡順序，不會真的開機）。
GPU_ACTUAL=""

own_session_hardware() {  # 自己的 session 存在就印出硬體（例如 L4），否則回傳 1
  local out
  out="$(C status -s "${SESSION_NAME}" 2>&1)" || return 1
  printf '%s\n' "${out}" | grep -q "^\[${SESSION_NAME}\]" || return 1
  printf '%s\n' "${out}" | sed -n 's/.*Hardware: \([A-Za-z0-9]*\).*/\1/p' | head -n 1
}

# 把 `colab new` 的輸出歸類：toomany／nocap／other。只看「最後一個 XxxError: 開頭的例外行」到結尾（訊息可能折行），
# 不看 traceback 裡的原始碼片段（片段裡就有 `except TooManyAssignmentsError`，會誤判）。
classify_new_error() {
  local last
  last="$(printf '%s\n' "$1" | awk '/^[A-Za-z_.]*(Error|Exception):/ {buf=""} {buf = buf " " $0} END {print buf}')"
  case "${last}" in
    *TooManyAssignments*|*"too many"*|*"Too many"*) echo toomany ;;
    *"Service Unavailable"*|*" 503"*|*"unavailable"*|*"No GPU"*|*"no GPU"*|*"capacity"*|*"quota"*) echo nocap ;;
    *) echo other ;;
  esac
}

session_up() {
  local list="${COLAB_GPU_FALLBACK:-${COLAB_GPU:-L4,A100,T4}}"
  local -a gpus; IFS=',' read -r -a gpus <<< "${list}"
  local waited=0 max="${WAIT_MAX_MIN:-720}" sl="${SLEEP_CMD:-sleep}" gpu fails out kind hw
  echo "=== compute units（前）==="; colab usage
  echo "=== 既有 session（不屬於本腳本的不會被動到）==="; colab sessions || true
  echo "卡型嘗試順序：${gpus[*]}（同一張卡連續 2 次沒卡就換下一張）"
  while true; do
    for gpu in "${gpus[@]}"; do
      fails=0
      while [ "${fails}" -lt 2 ]; do
        if hw="$(own_session_hardware)"; then
          GPU_ACTUAL="${hw}"; echo "自己的 session '${SESSION_NAME}' 已存在（${hw}），沿用，不重複開機"; return 0
        fi
        echo "嘗試開 ${gpu}（已等 ${waited} 分鐘）…"
        if out="$(C new -s "${SESSION_NAME}" --gpu "${gpu}" 2>&1)"; then
          hw="$(own_session_hardware || true)"; GPU_ACTUAL="${hw:-${gpu}}"
          echo "取得 ${GPU_ACTUAL}（要求 ${gpu}）"; return 0
        fi
        kind="$(classify_new_error "${out}")"
        echo "開 ${gpu} 失敗：${kind}"
        if [ "${waited}" -ge "${max}" ]; then echo "等待逾時 ${max} 分鐘，放棄"; return 2; fi
        case "${kind}" in
          toomany) echo "帳號已有其他 GPU session（不算沒卡）：不換卡，5 分鐘後重試"; "${sl}" 300; waited=$((waited + 5)) ;;
          nocap) fails=$((fails + 1)); if [ "${fails}" -lt 2 ]; then echo "${gpu} 沒卡（第 ${fails} 次），5 分鐘後再試一次"; "${sl}" 300; waited=$((waited + 5)); fi ;;
          *) echo "其他錯誤（網路等），1 分鐘後重試同一張卡"; "${sl}" 60; waited=$((waited + 1)) ;;
        esac
      done
      echo "${gpu} 連續 2 次沒卡 → 換下一張"
    done
    if [ "${waited}" -ge "${max}" ]; then echo "等待逾時 ${max} 分鐘，放棄"; return 2; fi
    echo "整輪（${gpus[*]}）都沒卡，5 分鐘後從頭輪詢（已等 ${waited} 分鐘）"; "${sl}" 300; waited=$((waited + 5))
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
# 完全脫離 kernel 的 stdout/stdin 與 process group，exec 才不會卡到背景程序結束（第三輪實測：沒脫離時 exec 一直不返回）
subprocess.Popen("cd /content &&${envs} exec python3 ${script} > ${logf} 2>&1", shell=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
print("launched ${script}")
PYEOF
  C exec -s "${SESSION_NAME}" --timeout 120 -f "${f}"; rm -f "${f}"
}
