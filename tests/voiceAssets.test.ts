import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseVoiceManifest } from '@/audio/voiceManifest'

const PUBLIC = join(__dirname, '..', 'public')
const raw = JSON.parse(readFileSync(join(PUBLIC, 'audio/voice/manifest.json'), 'utf8'))
const manifest = parseVoiceManifest(raw)

describe('public/audio/voice/manifest.json（隨遊戲出貨的語音）', () => {
  it('沒有任何條目在解析時被丟棄（本輪語音尚未產生時為 {}）', () => {
    expect(Object.keys(manifest)).toEqual(Object.keys(raw))
  })

  it('每個條目的音檔都存在，且放在 public/audio/voice/<sceneId>/<key>.mp3', () => {
    for (const [k, e] of Object.entries(manifest)) {
      expect(e.src, k).toBe(`/audio/voice/${k}.mp3`)
      expect(existsSync(join(PUBLIC, e.src)), `${k} → ${e.src}`).toBe(true)
    }
  })
})
