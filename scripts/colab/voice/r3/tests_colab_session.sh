#!/usr/bin/env bash
# session_up 的本機測試（不會真的開機）：用假的 `colab` 指令與假的 sleep，驗證換卡順序、TooManyAssignments 分支、不重複開機、總等待上限。
# 用法：bash tests_colab_session.sh
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "${T}"' EXIT
mkdir -p "${T}/bin"
cat > "${T}/bin/colab" <<'FAKE'
#!/usr/bin/env bash
# 假 colab：new 依 $FAKE_SCRIPT（每行一個結果：nocap／toomany／other／ok）依序回應；status 在 ok 之後才有 session
args=("$@"); sub=""
for ((i=0;i<${#args[@]};i++)); do case "${args[$i]}" in new|status|sessions|usage|stop) sub="${args[$i]}"; break;; esac; done
echo "$*" >> "${FAKE_LOG}"
case "${sub}" in
  new)
    gpu=""; for ((i=0;i<${#args[@]};i++)); do [ "${args[$i]}" = "--gpu" ] && gpu="${args[$((i+1))]}"; done
    n="$(cat "${FAKE_STATE}.n" 2>/dev/null || echo 0)"; echo $((n+1)) > "${FAKE_STATE}.n"
    r="$(sed -n "$((n+1))p" "${FAKE_SCRIPT}")"; r="${r:-nocap}"
    echo "NEW ${gpu} -> ${r}" >> "${FAKE_LOG}"
    case "${r}" in
      ok) echo "${gpu}" > "${FAKE_STATE}.gpu"; echo "[colab] Creating session"; exit 0 ;;
      toomany) echo "│   170 │   except TooManyAssignmentsError:"; echo "TooManyAssignmentsError: you already have an assigned GPU session"; exit 1 ;;
      other) echo "ConnectionError: Failed to resolve host"; exit 1 ;;
      *) echo "│   170 │   except TooManyAssignmentsError:   (原始碼片段，不應被誤判)"; echo "ColabRequestError: Failed to issue request POST https://colab/assign: Service Unavailable"; exit 1 ;;
    esac ;;
  status) if [ -f "${FAKE_STATE}.gpu" ]; then echo "[voice-t] gpu-x | Hardware: $(cat "${FAKE_STATE}.gpu") | Shape: Standard | Status: IDLE"; else echo "No session named voice-t"; exit 1; fi ;;
  sessions|usage) echo "(fake ${sub})"; exit 0 ;;
esac
exit 0
FAKE
chmod +x "${T}/bin/colab"
export PATH="${T}/bin:${PATH}"
fail=0
check() {  # $1 名稱 $2 預期的 NEW 序列（空白分隔 gpu:result）
  local got; got="$(grep '^NEW ' "${FAKE_LOG}" | sed 's/NEW \(.*\) -> \(.*\)/\1:\2/' | tr '\n' ' ' | sed 's/ $//')"
  if [ "${got}" = "$2" ]; then echo "PASS ${1}"; else echo "FAIL ${1}: 預期「$2」實際「${got}」"; fail=1; fi
}
run() {  # $1 FAKE_SCRIPT 內容（換行以 , 分隔）其餘為環境變數；回傳 session_up 結果碼並印 GPU_ACTUAL
  export FAKE_LOG="${T}/log" FAKE_STATE="${T}/state" FAKE_SCRIPT="${T}/script"
  rm -f "${FAKE_LOG}" "${FAKE_STATE}".*; echo "$1" | tr ',' '\n' > "${FAKE_SCRIPT}"; shift
  (
    [ $# -gt 0 ] && export "$@"
    COLAB_CFG="${T}/cfg.json" SESSION_NAME="voice-t" SLEEP_CMD="echo_sleep"
    echo_sleep() { echo "SLEEP $1" >> "${FAKE_LOG}"; }
    export -f echo_sleep 2>/dev/null
    source "${HERE}/colab_session.sh"
    session_up > "${T}/out" 2>&1; rc=$?
    echo "RC=${rc} GPU=${GPU_ACTUAL}" >> "${FAKE_LOG}"
  )
}
sleeps() { grep -c '^SLEEP' "${FAKE_LOG}"; }

# 1. L4 連續 2 次沒卡 → 換 A100 成功；兩次之間睡一次 5 分鐘
run "nocap,nocap,ok" COLAB_GPU_FALLBACK=L4,A100,T4
check "L4 兩次沒卡後換 A100" "L4:nocap L4:nocap A100:ok"; grep -q "RC=0 GPU=A100" "${FAKE_LOG}" || { echo "FAIL 1: GPU_ACTUAL"; fail=1; }
[ "$(sleeps)" = 1 ] || { echo "FAIL 1: 應睡 1 次，實際 $(sleeps)"; fail=1; }

# 2. TooManyAssignments 不算沒卡：不換卡、一直等同一張，最後 L4 成功；只會有 L4 的 new
run "toomany,toomany,toomany,ok" COLAB_GPU_FALLBACK=L4,A100,T4
check "TooManyAssignments 不換卡" "L4:toomany L4:toomany L4:toomany L4:ok"; grep -q "RC=0 GPU=L4" "${FAKE_LOG}" || { echo "FAIL 2: GPU_ACTUAL"; fail=1; }
[ "$(sleeps)" = 3 ] || { echo "FAIL 2: 應睡 3 次，實際 $(sleeps)"; fail=1; }

# 3. 自己的 session 已存在 → 不呼叫 new
run "ok"; export FAKE_STATE="${T}/state"; echo L4 > "${FAKE_STATE}.gpu"
( export FAKE_LOG="${T}/log" FAKE_STATE="${T}/state" FAKE_SCRIPT="${T}/script"; : > "${FAKE_LOG}"; COLAB_CFG=x SESSION_NAME=voice-t; source "${HERE}/colab_session.sh"; session_up > "${T}/out" 2>&1; echo "RC=$? GPU=${GPU_ACTUAL}" >> "${FAKE_LOG}" )
check "既有 session 不重複開機" ""; grep -q "RC=0 GPU=L4" "${FAKE_LOG}" || { echo "FAIL 3: 沒有沿用"; fail=1; }

# 4. 整輪都沒卡後從頭輪詢（L4→A100→T4 各 2 次，再回 L4 成功）
run "nocap,nocap,nocap,nocap,nocap,nocap,ok" COLAB_GPU_FALLBACK=L4,A100,T4
check "整輪失敗後從頭輪詢" "L4:nocap L4:nocap A100:nocap A100:nocap T4:nocap T4:nocap L4:ok"

# 5. 總等待上限：WAIT_MAX_MIN=10 → 放棄（rc=2）
run "nocap,nocap,nocap,nocap,nocap,nocap,nocap,nocap,ok" COLAB_GPU_FALLBACK=L4,A100,T4 WAIT_MAX_MIN=10
grep -q "RC=2" "${FAKE_LOG}" && echo "PASS 等待上限" || { echo "FAIL 等待上限"; cat "${FAKE_LOG}"; fail=1; }

# 6. 其他錯誤（網路）不計入沒卡、不換卡
run "other,other,ok" COLAB_GPU_FALLBACK=L4,A100
check "網路錯誤不換卡" "L4:other L4:other L4:ok"

# 7. 舊變數 COLAB_GPU 單卡
run "ok" COLAB_GPU=A100
check "COLAB_GPU 單卡" "A100:ok"
[ "${fail}" = 0 ] && echo "ALL OK" || { echo "有失敗"; exit 1; }
