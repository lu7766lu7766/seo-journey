/**
 * 語音 manifest：`public/audio/voice/manifest.json`。
 * 鍵為 `<sceneId>/<key>`（key 見 `voiceKey.ts`），值為 `{ "src": "/audio/voice/<sceneId>/<key>.mp3", "duration": 秒 }`。
 * 沒有條目（或載入失敗、壞掉的條目）的台詞就是沒有語音，行為與沒有這套機制時完全相同。
 */
export interface VoiceEntry {
  src: string
  /** 音檔長度（秒）；選填，僅供參考 */
  duration?: number
}

export type VoiceManifest = Record<string, VoiceEntry>

export const VOICE_MANIFEST_URL = '/audio/voice/manifest.json'

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const KEY_RE = /^[A-Za-z0-9_-]+\/[0-9a-f]{12}$/

export const voiceManifestKey = (sceneId: string, key: string) => `${sceneId}/${key}`

/** 寬鬆解析：壞掉的條目直接丟棄，整份壞掉回傳 {}（絕不丟例外）。 */
export function parseVoiceManifest(raw: unknown): VoiceManifest {
  const out: VoiceManifest = {}
  if (!isObj(raw)) return out
  for (const [k, v] of Object.entries(raw)) {
    if (!KEY_RE.test(k) || !isObj(v) || typeof v.src !== 'string' || v.src.trim() === '') continue
    const entry: VoiceEntry = { src: v.src.trim() }
    if (typeof v.duration === 'number' && Number.isFinite(v.duration) && v.duration > 0) entry.duration = v.duration
    out[k] = entry
  }
  return out
}

/** 查某場景某行的語音；沒有（含 key 為空）回傳 undefined。 */
export function lookupVoice(manifest: VoiceManifest | null | undefined, sceneId: string, key: string | undefined): VoiceEntry | undefined {
  if (!manifest || !key) return undefined
  return manifest[voiceManifestKey(sceneId, key)]
}

/** lineId（`<sceneId>#<pc>`）的場景 id */
export const sceneOfLine = (lineId: string) => lineId.split('#')[0]
