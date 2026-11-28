/**
 * 音訊 manifest：`public/audio/manifest.json`。
 * 鍵為 `bgm/<id>` 或 `sfx/<id>`；沒有條目（或載入失敗）的 id 一律沿用合成聲備援。
 */
export interface ManifestEntry {
  src: string
  /** 循環起點（秒）；省略＝從頭 */
  loopStart?: number
  /** 循環終點（秒）；省略＝到檔尾 */
  loopEnd?: number
  /** 疊加增益（dB），預設 0 */
  gainDb: number
}

export type AudioManifest = Record<string, ManifestEntry>

export const GAIN_DB_MIN = -60
export const GAIN_DB_MAX = 12

const KEY_RE = /^(bgm|sfx)\/[A-Za-z0-9_-]+$/

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** dB → 線性增益；非有限值視為 0 dB，並限制在 [-60, +12] dB。 */
export function dbToGain(db: number | undefined): number {
  if (db === undefined || !Number.isFinite(db)) return 1
  const clamped = Math.min(GAIN_DB_MAX, Math.max(GAIN_DB_MIN, db))
  return Math.pow(10, clamped / 20)
}

/** 寬鬆解析 manifest：壞掉的條目直接丟棄，整份壞掉回傳 {}（絕不丟例外）。 */
export function parseManifest(raw: unknown): AudioManifest {
  const out: AudioManifest = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!KEY_RE.test(key) || !v || typeof v !== 'object') continue
    const e = v as Record<string, unknown>
    if (typeof e.src !== 'string' || e.src.trim() === '') continue
    const entry: ManifestEntry = {
      src: e.src.trim(),
      gainDb: isNum(e.gainDb) ? Math.min(GAIN_DB_MAX, Math.max(GAIN_DB_MIN, e.gainDb)) : 0,
    }
    if (key.startsWith('bgm/')) {
      const ls = isNum(e.loopStart) && e.loopStart >= 0 ? e.loopStart : undefined
      const le = isNum(e.loopEnd) && e.loopEnd > 0 ? e.loopEnd : undefined
      if (ls !== undefined && le !== undefined && le <= ls) {
        // 區間無效：整首循環
      } else {
        if (ls !== undefined) entry.loopStart = ls
        if (le !== undefined) entry.loopEnd = le
      }
    }
    out[key] = entry
  }
  return out
}

export type SourcePick = { kind: 'file'; entry: ManifestEntry } | { kind: 'synth' }

/** 依 manifest 決定這個 id 該播檔案還是合成聲。 */
export function pickSource(manifest: AudioManifest | null, type: 'bgm' | 'sfx', id: string): SourcePick {
  const entry = manifest?.[`${type}/${id}`]
  return entry ? { kind: 'file', entry } : { kind: 'synth' }
}
