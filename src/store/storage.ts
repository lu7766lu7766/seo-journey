/** Every storage access goes through here: wrapped in try/catch, with an in-memory fallback. */
export interface KV {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

const mem = new Map<string, string>()
const memoryStorage: KV = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => void mem.set(k, v),
  removeItem: (k) => void mem.delete(k),
}

let override: KV | null = null
/** Tests inject a storage here. Pass null to restore default. */
export function setStorage(kv: KV | null) {
  override = kv
}

function backend(): KV {
  if (override) return override
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    /* accessing localStorage can throw (privacy mode) */
  }
  return memoryStorage
}

export function safeGet(key: string): string | null {
  try {
    return backend().getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key: string, value: string): boolean {
  try {
    backend().setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemove(key: string): void {
  try {
    backend().removeItem(key)
  } catch {
    /* ignore */
  }
}

export function safeGetJSON<T>(key: string): T | null {
  const raw = safeGet(key)
  if (raw == null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const safeSetJSON = (key: string, v: unknown) => safeSet(key, JSON.stringify(v))
export const clearMemoryStorage = () => mem.clear()
