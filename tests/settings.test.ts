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
    expect(Object.keys(JSON.parse(kv.data.get(KEY)!)).sort()).toEqual(['audioVariants', 'autoDelayMs', 'musicOn', 'sfxOn', 'skipUnreadAllowed', 'textSpeed', 'voiceOn'])

    const b = await freshSettings(kv)
    expect(b.useSettings.getState().audioVariants).toEqual({ 'bgm/title': 'c1', 'sfx/click': 'c2' })
  })

  it('改其他設定不會弄丟版本選擇；舊存檔（沒有 audioVariants）可以讀', async () => {
    const { useSettings } = await freshSettings(memKV({ [KEY]: JSON.stringify({ textSpeed: 80, bgmVolume: 0.5 }) }))
    expect(useSettings.getState()).toMatchObject({ textSpeed: 80, musicOn: true, sfxOn: true, voiceOn: true, audioVariants: {} })
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

describe('設定：音樂／音效／語音開關', () => {
  it('預設全開', async () => {
    const { useSettings } = await freshSettings(memKV())
    expect(useSettings.getState()).toMatchObject({ musicOn: true, sfxOn: true, voiceOn: true })
  })

  it('開關持久化（經 storage.ts），重新載入後還在；「恢復預設」全部打開', async () => {
    const kv = memKV()
    const a = await freshSettings(kv)
    a.useSettings.getState().set({ musicOn: false, voiceOn: false })
    expect(JSON.parse(kv.data.get(KEY)!)).toMatchObject({ musicOn: false, sfxOn: true, voiceOn: false })
    const b = await freshSettings(kv)
    expect(b.useSettings.getState()).toMatchObject({ musicOn: false, sfxOn: true, voiceOn: false })
    b.useSettings.getState().reset()
    expect(b.useSettings.getState()).toMatchObject({ musicOn: true, sfxOn: true, voiceOn: true })
  })

  it('舊設定（bgmVolume／sfxVolume 數值）遷移：> 0 視為開、0 視為關', async () => {
    const on = await freshSettings(memKV({ [KEY]: JSON.stringify({ bgmVolume: 0.05, sfxVolume: 1 }) }))
    expect(on.useSettings.getState()).toMatchObject({ musicOn: true, sfxOn: true, voiceOn: true })
    const off = await freshSettings(memKV({ [KEY]: JSON.stringify({ bgmVolume: 0, sfxVolume: 0 }) }))
    expect(off.useSettings.getState()).toMatchObject({ musicOn: false, sfxOn: false, voiceOn: true })
    const mixed = await freshSettings(memKV({ [KEY]: JSON.stringify({ bgmVolume: 0.3, sfxVolume: 0, textSpeed: 90 }) }))
    expect(mixed.useSettings.getState()).toMatchObject({ musicOn: true, sfxOn: false, textSpeed: 90 })
  })

  it('遷移後下次寫入只留新欄位，舊的音量欄位消失；新欄位優先於舊欄位', async () => {
    const kv = memKV({ [KEY]: JSON.stringify({ bgmVolume: 0, sfxVolume: 0.6, musicOn: true }) })
    const { useSettings } = await freshSettings(kv)
    expect(useSettings.getState().musicOn).toBe(true)
    useSettings.getState().set({ textSpeed: 50 })
    const saved = JSON.parse(kv.data.get(KEY)!)
    expect(saved).not.toHaveProperty('bgmVolume')
    expect(saved).not.toHaveProperty('sfxVolume')
    expect(saved).toMatchObject({ musicOn: true, sfxOn: true, textSpeed: 50 })
  })

  it('壞掉的值退回預設（normalizeSettings）', async () => {
    const { normalizeSettings, DEFAULT_SETTINGS } = await freshSettings(memKV())
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings('x')).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings({ musicOn: 'yes', sfxOn: 1, voiceOn: null, textSpeed: 'fast', bgmVolume: 'loud' })).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings({ bgmVolume: NaN, sfxVolume: -1 })).toMatchObject({ musicOn: true, sfxOn: false })
  })
})
