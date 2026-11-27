import { beforeEach, describe, expect, it } from 'vitest'
import { clearMemoryStorage, safeGet, setStorage } from '@/store/storage'
import { defaultPersisted, exportSaveCode, importSaveCode, latestSave, listSaves, migrate, readSave, SAVE_VERSION, writeSave } from '@/store/save'

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
    expect(listSaves().map((s) => !!s.env)).toEqual([false, false, true, false, false, false, false])
  })
  it('latestSave picks the newest', () => {
    writeSave(1, defaultPersisted('a'), 10)
    writeSave('auto', defaultPersisted('b'), 99)
    expect(latestSave()!.slot).toBe('auto')
  })
  it('migrates v0 and v1 and fills defaults', () => {
    const env0 = migrate({ version: 0, name: '舊玩家', savedAt: 5, state: { week: 2, stats: { con: 33 }, bond: { rin: 4 } } })!
    expect(env0.version).toBe(SAVE_VERSION)
    expect(env0.data.playerName).toBe('舊玩家')
    expect(env0.data.week).toBe(2)
    expect(env0.data.stats).toMatchObject({ con: 33, tec: 10 })
    expect(env0.data.bond).toMatchObject({ rin: 4, hare: 0 })
    expect(env0.data.backlog).toEqual([])
    expect(env0.data.questsDoneThisWeek).toBe(0)
    expect(env0.data.prevScores).toEqual({ rin: 10, hare: 10, mirai: 10 })

    const env1 = migrate({ version: 1, savedAt: 99, label: 'v1', data: { playerName: '測試者', week: 4 } })!
    expect(env1.version).toBe(SAVE_VERSION)
    expect(env1.data.playerName).toBe('測試者')
    expect(env1.data.week).toBe(4)
    expect(env1.data.activeQuestId).toBeNull()
    expect(env1.data.activeDateHeroine).toBeNull()
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
  it('exports and imports portable save codes with Unicode names safely', () => {
    const d = defaultPersisted('青葉新生')
    d.week = 4
    d.stats.tec = 42
    d.flags = { 'mg.played': 3, 'mg.won': 2 }
    d.unlockedCards = ['what-is-seo-aeo-geo', 'json-ld']
    const code = exportSaveCode(d, 5555)
    expect(code.startsWith('SEOJ1:')).toBe(true)
    const restored = importSaveCode(`  ${code}  `)!
    expect(restored.version).toBe(SAVE_VERSION)
    expect(restored.savedAt).toBe(5555)
    expect(restored.data.playerName).toBe('青葉新生')
    expect(restored.data.stats.tec).toBe(42)
    expect(restored.data.flags).toEqual({ 'mg.played': 3, 'mg.won': 2 })
    expect(restored.data.unlockedCards).toEqual(['what-is-seo-aeo-geo', 'json-ld'])
    expect(importSaveCode('')).toBeNull()
    expect(importSaveCode('SEOJ1:!!!not-base64!!!')).toBeNull()
  })
})
