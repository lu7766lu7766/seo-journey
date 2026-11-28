import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseManifest } from '@/audio/manifest'

const PUBLIC = join(__dirname, '..', 'public')
const raw = JSON.parse(readFileSync(join(PUBLIC, 'audio/manifest.json'), 'utf8'))
const manifest = parseManifest(raw)

describe('public/audio/manifest.json（隨遊戲出貨的音檔）', () => {
  it('12 首 BGM × 3 版、9 種 SFX × 4 版，且沒有任何條目在解析時被丟棄', () => {
    const bgm = [
      'title',
      'daily',
      'sim',
      'minigame',
      'warm',
      'melancholy',
      'tense',
      'comedy',
      'festival',
      'theme_rin',
      'theme_hare',
      'theme_mirai',
    ]
    const sfx = ['click', 'blip', 'choice', 'card', 'grow', 'bond', 'fail', 'win', 'shock']
    expect(Object.keys(manifest)).toEqual([...bgm.map((i) => `bgm/${i}`), ...sfx.map((i) => `sfx/${i}`)])
    for (const i of bgm) expect(Object.keys(manifest[`bgm/${i}`].variants)).toEqual(['c1', 'c2', 'c3'])
    for (const i of sfx) expect(Object.keys(manifest[`sfx/${i}`].variants)).toEqual(['c1', 'c2', 'c3', 'c4'])
    expect(Object.keys(raw)).toEqual(Object.keys(manifest))
    for (const [k, item] of Object.entries(raw as Record<string, { variants: Record<string, unknown> }>)) {
      expect(Object.keys(manifest[k].variants)).toEqual(Object.keys(item.variants))
    }
  })

  it('每個版本的音檔都存在；default 存在；BGM 的循環點落在檔案長度內', () => {
    for (const [key, item] of Object.entries(manifest)) {
      expect(item.variants[item.default], `${key} default`).toBeDefined()
      for (const [v, e] of Object.entries(item.variants)) {
        expect(existsSync(join(PUBLIC, e.src)), `${key}/${v} → ${e.src}`).toBe(true)
        if (key.startsWith('bgm/')) {
          expect(e.loopStart, `${key}/${v} loopStart`).toBeGreaterThanOrEqual(0)
          expect(e.loopEnd!, `${key}/${v} loopEnd`).toBeGreaterThan(e.loopStart!)
          expect(e.loopEnd!, `${key}/${v} loopEnd ≤ duration`).toBeLessThanOrEqual(e.duration! + 0.01)
        }
      }
    }
  })
})
