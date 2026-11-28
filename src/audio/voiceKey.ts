/**
 * 語音檔的穩定鍵：`<說話者> ＋ 台詞原文（含 {name} 佔位符）` 的 SHA-1 前 12 碼。
 * 台詞順序調整時鍵不變、語音仍對得上；台詞文字一改鍵就變，語音自然失效（退回無語音）。
 * 純函式、無相依，瀏覽器（執行期查找）與 Node（`scripts/list-voice-lines.mjs`）共用。
 */

/** 有語音的說話者。主角（me）與旁白（narr）沒有語音。 */
export const VOICED_SPEAKERS = ['rin', 'hare', 'mirai', 'sensei', 'kuro', 'npc'] as const

export const isVoicedSpeaker = (who: string): boolean => (VOICED_SPEAKERS as readonly string[]).includes(who)

const rol = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0

/** 同步 SHA-1（UTF-8），回傳 40 碼十六進位。Web Crypto 只有非同步版本，而劇本推進需要同步取得鍵。 */
export function sha1Hex(input: string): string {
  const bytes = new TextEncoder().encode(input)
  const len = bytes.length
  const total = ((len + 9 + 63) >> 6) << 6
  const buf = new Uint8Array(total)
  buf.set(bytes)
  buf[len] = 0x80
  const dv = new DataView(buf.buffer)
  dv.setUint32(total - 8, Math.floor((len * 8) / 2 ** 32))
  dv.setUint32(total - 4, (len * 8) >>> 0)
  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0
  const w = new Uint32Array(80)
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4)
    for (let i = 16; i < 80; i++) w[i] = rol(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1)
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    for (let i = 0; i < 80; i++) {
      let f: number
      let k: number
      if (i < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (i < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const t = (rol(a, 5) + (f >>> 0) + e + k + w[i]) >>> 0
      e = d
      d = c
      c = rol(b, 30)
      b = a
      a = t
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }
  return [h0, h1, h2, h3, h4].map((x) => x.toString(16).padStart(8, '0')).join('')
}

/**
 * 語音鍵。`text` 是劇本裡的原文（保留 `{name}`，不要代入玩家名字）。
 * 無立繪 NPC（`npc`）的說話者部分連同名牌一起算（`npc:<名牌>`），不同 NPC 說同一句話可以配不同的聲音。
 */
export function voiceKey(who: string, text: string, npcName?: string): string {
  const speaker = who === 'npc' ? `npc:${npcName ?? ''}` : who
  return sha1Hex(`${speaker}\n${text}`).slice(0, 12)
}
