import { beforeEach, describe, expect, it } from 'vitest'
import { clearMemoryStorage, safeGet, setStorage } from '@/store/storage'
import { defaultPersisted, latestSave, listSaves, migrate, readSave, SAVE_VERSION, writeSave } from '@/store/save'

beforeEach(() => {
  setStorage(null)
  clearMemoryStorage()
})

describe('save/load', () => {
  it('round-trips a slot', () => {
    const d = defaultPersisted('小明')
    d.week = 3
    d.flags = { blackhat: 1, ok: true }
    d.bond.rin = 12
    d.scene = { sceneId: 'demo', pc: [4, 1, 2] }
    d.backlog = [{ lineId: 'demo#0', who: 'narr', text: 'hi' }]
    expect(writeSave(2, d, 1234)).toBe(true)
    const env = readSave(2)!
    expect(env.version).toBe(SAVE_VERSION)
    expect(env.savedAt).toBe(1234)
    expect(env.label).toContain('第 3 週')
    expect(env.data).toEqual(d)
    expect(readSave(1)).toBeNull()
    expect(listSaves().map((s) => !!s.env)).toEqual([false, false, true, false])
  })
  it('latestSave picks the newest', () => {
    writeSave(1, defaultPersisted('a'), 10)
    writeSave('auto', defaultPersisted('b'), 99)
    expect(latestSave()!.slot).toBe('auto')
  })
  it('migrates v0 and fills defaults', () => {
    const env = migrate({ version: 0, name: '舊玩家', savedAt: 5, state: { week: 2, stats: { con: 33 }, bond: { rin: 4 } } })!
    expect(env.version).toBe(SAVE_VERSION)
    expect(env.data.playerName).toBe('舊玩家')
    expect(env.data.week).toBe(2)
    expect(env.data.stats).toMatchObject({ con: 33, tec: 10 })
    expect(env.data.bond).toMatchObject({ rin: 4, hare: 0 })
    expect(env.data.backlog).toEqual([])
  })
  it('rejects garbage and future versions without throwing', () => {
    expect(migrate(null)).toBeNull()
    expect(migrate('x')).toBeNull()
    expect(migrate({ version: 99, data: {} })).toBeNull()
    expect(migrate({ version: 1, data: 'bad' })!.data.playerName).toBe('葉 搜一')
  })
  it('survives corrupted JSON and throwing storage', () => {
    setStorage({ getItem: () => '{not json', setItem: () => {}, removeItem: () => {} })
    expect(readSave(1)).toBeNull()
    setStorage({
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('quota') },
      removeItem: () => { throw new Error('denied') },
    })
    expect(readSave(1)).toBeNull()
    expect(writeSave(1, defaultPersisted())).toBe(false)
    expect(safeGet('x')).toBeNull()
  })
})
