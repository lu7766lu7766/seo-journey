/**
 * 「配音用文字」：把劇本台詞整理成語音產生流程要唸的文字。
 * - 去掉 `{name}`（主角名字可自訂，語音唸不出來），並把因此多出的標點收乾淨：
 *   「{name}，謝謝你」→「謝謝你」、「謝謝你，{name}。」→「謝謝你。」、「！{name}！這是……」→「！這是……」
 * - 去掉括號內的舞台指示：「（小聲）謝謝你」→「謝謝你」
 * - 處理後為空字串或只剩標點 → 回傳 null（該行不配音）
 * 純函式；`scripts/list-voice-lines.mjs` 使用，並有單元測試（tests/voiceText.test.ts）。
 */

/** 逗號類（句中停頓）與句末類標點、刪節號、破折號等；用來辨識「名字旁邊的標點」 */
const PUNCT = '，、；：,;:。！？!?.…—～~·・'
const COMMA = '，、；：,;:'
const isPunct = (ch: string) => PUNCT.includes(ch)

const BRACKETS = /（[^（）]*）|\([^()]*\)/g

function stripDirections(text: string): string {
  let prev: string
  let cur = text
  do {
    prev = cur
    cur = cur.replace(BRACKETS, '')
  } while (cur !== prev)
  return cur
}

/** 名字兩側的標點合併成一個：兩側都有時取較「強」的（句末 > 逗號類）；開頭的名字不留下標點（刪節號除外）。 */
function mergePunct(left: string, right: string, atStart: boolean): string {
  const isComma = (s: string) => [...s].every((c) => COMMA.includes(c))
  if (left === '') {
    if (right === '') return ''
    if (atStart) return right.includes('…') ? right : ''
    return right
  }
  if (right === '' || isComma(right)) return left
  return right
}

/** 去掉所有 `{name}` 並收乾淨兩側標點 */
function removeName(text: string): string {
  const parts = text.split('{name}')
  let acc = parts[0]
  for (let i = 1; i < parts.length; i++) {
    let l = acc.length
    while (l > 0 && (isPunct(acc[l - 1]) || acc[l - 1] === ' ')) l--
    const left = acc.slice(l).replace(/ /g, '')
    const base = acc.slice(0, l)
    const next = parts[i]
    let r = 0
    while (r < next.length && (isPunct(next[r]) || next[r] === ' ')) r++
    const right = next.slice(0, r).replace(/ /g, '')
    acc = base + mergePunct(left, right, base.trim() === '') + next.slice(r)
  }
  return acc
}

/** 台詞 → 配音用文字；不需要配音（空字串或只剩標點）回傳 null。 */
export function voiceText(text: string): string | null {
  let t = removeName(stripDirections(text))
  t = t.replace(/[\s　]+/g, ' ').trim()
  // 收尾：句首不該以逗號類標點開頭，句尾不該以逗號類標點結束
  let s = 0
  while (s < t.length && COMMA.includes(t[s])) s++
  let e = t.length
  while (e > s && COMMA.includes(t[e - 1])) e--
  t = t.slice(s, e).trim()
  return /[\p{L}\p{N}]/u.test(t) ? t : null
}
