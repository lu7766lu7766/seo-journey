import { describe, expect, it, vi } from 'vitest'
import type { KV } from '@/store/storage'

const KEY = 'seo-journey:settings'

function memKV(seed?: Record<string, string>): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed ?? {}))
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}

/** settings store 在載入模組時讀取儲存值，所以每次都重新載入模組 */
async function freshSettings(kv: KV) {
  vi.resetModules()
  const { setStorage } = await import('@/store/storage') // 重新載入後是新的 storage 模組，要對它注入
  setStorage(kv)
  return import('@/store/settings')
}

describe('設定：每個 BGM／SFX 採用的版本', () => {
  it('預設沒有任何選擇（audioVariants = {}）', async () => {
    const { useSettings } = await freshSettings(memKV())
    expect(useSettings.getState().audioVariants).toEqual({})
  })

  it('setAudioVariant 寫進 store 並持久化（經 storage.ts），重新載入後還在', async () => {
    const kv = memKV()
    const a = await freshSettings(kv)
    a.useSettings.getState().setAudioVariant('bgm/title', 'c3')
    a.useSettings.getState().setAudioVariant('sfx/click', 'c2')
    a.useSettings.getState().setAudioVariant('bgm/title', 'c1') // 覆蓋
    expect(a.useSettings.getState().audioVariants).toEqual({ 'bgm/title': 'c1', 'sfx/click': 'c2' })
    expect(JSON.parse(kv.data.get(KEY)!).audioVariants).toEqual({ 'bgm/title': 'c1', 'sfx/click': 'c2' })
    // 不會把動作函式寫進去
    expect(Object.keys(JSON.parse(kv.data.get(KEY)!)).sort()).toEqual(['audioVariants', 'autoDelayMs', 'bgmVolume', 'sfxVolume', 'skipUnreadAllowed', 'textSpeed'])

    const b = await freshSettings(kv)
    expect(b.useSettings.getState().audioVariants).toEqual({ 'bgm/title': 'c1', 'sfx/click': 'c2' })
  })

  it('改其他設定不會弄丟版本選擇；舊存檔（沒有 audioVariants）可以讀', async () => {
    const { useSettings } = await freshSettings(memKV({ [KEY]: JSON.stringify({ textSpeed: 80, bgmVolume: 0.5 }) }))
    expect(useSettings.getState()).toMatchObject({ textSpeed: 80, bgmVolume: 0.5, sfxVolume: 0.6, audioVariants: {} })
    useSettings.getState().setAudioVariant('bgm/daily', 'c2')
    useSettings.getState().set({ textSpeed: 60 })
    expect(useSettings.getState().audioVariants).toEqual({ 'bgm/daily': 'c2' })
  })

  it('壞掉的儲存內容被清掉；不合法的鍵或版本 id 不會寫入', async () => {
    const { useSettings, sanitizeAudioVariants } = await freshSettings(
      memKV({ [KEY]: JSON.stringify({ audioVariants: { 'bgm/title': 'c2', 'oops/x': 'c1', 'bgm/a b': 'c1', 'sfx/click': 3, 'bgm/daily': 'c 2' } }) }),
    )
    expect(useSettings.getState().audioVariants).toEqual({ 'bgm/title': 'c2' })
    useSettings.getState().setAudioVariant('nope', 'c1')
    useSettings.getState().setAudioVariant('bgm/title', '../x')
    expect(useSettings.getState().audioVariants).toEqual({ 'bgm/title': 'c2' })
    expect(sanitizeAudioVariants(null)).toEqual({})
    expect(sanitizeAudioVariants([])).toEqual({})
    expect(sanitizeAudioVariants('x')).toEqual({})

    expect((await freshSettings(memKV({ [KEY]: JSON.stringify({ audioVariants: 'zzz' }) }))).useSettings.getState().audioVariants).toEqual({})
  })

  it('恢復預設會清掉版本選擇（回到 manifest 的 default）', async () => {
    const kv = memKV()
    const { useSettings } = await freshSettings(kv)
    useSettings.getState().setAudioVariant('bgm/title', 'c3')
    useSettings.getState().reset()
    expect(useSettings.getState().audioVariants).toEqual({})
    expect(JSON.parse(kv.data.get(KEY)!).audioVariants).toEqual({})
  })
})
