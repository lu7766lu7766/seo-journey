/**
 * 音訊 manifest：`public/audio/manifest.json`（由 `scripts/build-audio-manifest.mjs` 產生）。
 * 鍵為 `bgm/<id>` 或 `sfx/<id>`；沒有條目（或載入失敗）的 id 一律沿用合成聲備援。
 *
 * 兩種寫法都能讀：
 * - 多版本：`{ "default": "c2", "variants": { "c1": { "src": ..., "loopStart": ..., "loopEnd": ... }, "c2": {...} } }`
 * - 舊的單一版本：`{ "src": ..., "loopStart": ..., "loopEnd": ..., "gainDb": ... }`（視為只有一個版本 `default`）
 * 解析後一律是多版本形狀（`ManifestItem`）。
 */
export interface ManifestEntry {
  src: string
  /** 循環起點（秒）；省略＝從頭 */
  loopStart?: number
  /** 循環終點（秒）；省略＝到檔尾 */
  loopEnd?: number
  /** 疊加增益（dB），預設 0 */
  gainDb: number
  /** 程式合成（非 AI 生成）的版本，鑑賞畫面會標註「合成」 */
  synth?: boolean
  /** 檔案總長（秒）；只用於鑑賞畫面在尚未下載時顯示時間，省略也能正常播放 */
  duration?: number
}

export interface ManifestItem {
  /** 未在設定中選過版本時使用的版本 id（一定存在於 `variants`） */
  default: string
  /** 版本 id → 音檔；保留 JSON 裡的順序（至少一個） */
  variants: Record<string, ManifestEntry>
}

export type AudioManifest = Record<string, ManifestItem>

/** 舊格式（單一版本）解析後使用的版本 id */
export const LEGACY_VARIANT = 'default'

export const GAIN_DB_MIN = -60
export const GAIN_DB_MAX = 12

const KEY_RE = /^(bgm|sfx)\/[A-Za-z0-9_-]+$/
const VARIANT_RE = /^[A-Za-z0-9_-]+$/

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** dB → 線性增益；非有限值視為 0 dB，並限制在 [-60, +12] dB。 */
export function dbToGain(db: number | undefined): number {
  if (db === undefined || !Number.isFinite(db)) return 1
  const clamped = Math.min(GAIN_DB_MAX, Math.max(GAIN_DB_MIN, db))
  return Math.pow(10, clamped / 20)
}

function parseEntry(isBgm: boolean, v: unknown): ManifestEntry | null {
  if (!isObj(v) || typeof v.src !== 'string' || v.src.trim() === '') return null
  const entry: ManifestEntry = {
    src: v.src.trim(),
    gainDb: isNum(v.gainDb) ? Math.min(GAIN_DB_MAX, Math.max(GAIN_DB_MIN, v.gainDb)) : 0,
  }
  if (isBgm) {
    const ls = isNum(v.loopStart) && v.loopStart >= 0 ? v.loopStart : undefined
    const le = isNum(v.loopEnd) && v.loopEnd > 0 ? v.loopEnd : undefined
    if (ls !== undefined && le !== undefined && le <= ls) {
      // 區間無效：整首循環
    } else {
      if (ls !== undefined) entry.loopStart = ls
      if (le !== undefined) entry.loopEnd = le
    }
  }
  if (v.synth === true) entry.synth = true
  if (isNum(v.duration) && v.duration > 0) entry.duration = v.duration
  return entry
}

/** 寬鬆解析 manifest：壞掉的條目／版本直接丟棄，整份壞掉回傳 {}（絕不丟例外）。 */
export function parseManifest(raw: unknown): AudioManifest {
  const out: AudioManifest = {}
  if (!isObj(raw)) return out
  for (const [key, v] of Object.entries(raw)) {
    if (!KEY_RE.test(key) || !isObj(v)) continue
    const isBgm = key.startsWith('bgm/')
    if (isObj(v.variants)) {
      const variants: Record<string, ManifestEntry> = {}
      for (const [vid, ve] of Object.entries(v.variants)) {
        if (!VARIANT_RE.test(vid)) continue
        const entry = parseEntry(isBgm, ve)
        if (entry) variants[vid] = entry
      }
      const ids = Object.keys(variants)
      if (ids.length === 0) continue
      const def = typeof v.default === 'string' && v.default in variants ? v.default : ids[0]
      out[key] = { default: def, variants }
    } else {
      const entry = parseEntry(isBgm, v)
      if (entry) out[key] = { default: LEGACY_VARIANT, variants: { [LEGACY_VARIANT]: entry } }
    }
  }
  return out
}

/**
 * 決定採用哪個版本：設定值（存在於 variants）→ manifest 的 default → 第一個版本。
 * 設定值指到已不存在的版本（例如音檔被換掉）時自動退回 default。
 */
export function resolveVariant(item: ManifestItem, chosen?: string | null): string {
  if (chosen && Object.prototype.hasOwnProperty.call(item.variants, chosen)) return chosen
  if (Object.prototype.hasOwnProperty.call(item.variants, item.default)) return item.default
  return Object.keys(item.variants)[0]
}

export type SourcePick = { kind: 'file'; variant: string; entry: ManifestEntry } | { kind: 'synth' }

/** 依 manifest 與使用者選的版本決定這個 id 該播檔案還是合成聲。 */
export function pickSource(manifest: AudioManifest | null, type: 'bgm' | 'sfx', id: string, chosen?: string | null): SourcePick {
  const item = manifest?.[`${type}/${id}`]
  if (!item) return { kind: 'synth' }
  const variant = resolveVariant(item, chosen)
  return { kind: 'file', variant, entry: item.variants[variant] }
}

/**
 * 循環播放時的「檔案內位置」（秒）：從 0 起播，跑到 loopEnd 後回到 loopStart 再循環。
 * `elapsed` 是自起播起經過的秒數；`duration` 是檔案總長（沒給 loopEnd 時循環到檔尾）。
 */
export function loopPosition(elapsed: number, duration: number, loopStart?: number, loopEnd?: number): number {
  const e = Math.max(0, elapsed)
  const end = Math.min(loopEnd ?? duration, duration)
  const start = Math.min(Math.max(0, loopStart ?? 0), end)
  const len = end - start
  if (e < end || len <= 0) return Math.min(e, duration)
  return start + ((e - start) % len)
}
