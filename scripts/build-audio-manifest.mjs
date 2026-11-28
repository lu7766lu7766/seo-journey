#!/usr/bin/env node
/**
 * 產生 `public/audio/manifest.json`（多版本格式）。
 *
 * 資料來源是產製流程輸出的兩份 candidates.json（已複製進版控）：
 *   scripts/audio/bgm-candidates.json   — 背景音樂（loop 點、總長、建議首選 recommended_id）
 *   scripts/audio/sfx-candidates.json   — 音效（是否程式合成、建議首選 recommended_candidate）
 * 並檢查 `public/audio/{bgm,sfx}/` 的 mp3 都在、沒有多餘檔案。
 *
 * 用法：node scripts/build-audio-manifest.mjs [--check] [--bgm <candidates.json>] [--sfx <candidates.json>]
 *   --check  只比對、不寫檔（現有 manifest 與重新產生的內容不同就以非 0 結束）
 *   重產音檔後：把新的 candidates.json 複製到 scripts/audio/（或用 --bgm／--sfx 指過去），再執行本腳本。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(name)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}
const check = args.includes('--check')
const bgmMeta = JSON.parse(readFileSync(opt('--bgm', join(root, 'scripts/audio/bgm-candidates.json')), 'utf8'))
const sfxMeta = JSON.parse(readFileSync(opt('--sfx', join(root, 'scripts/audio/sfx-candidates.json')), 'utf8'))
const pubAudio = join(root, 'public/audio')
const manifestPath = join(pubAudio, 'manifest.json')

const r3 = (n) => Math.round(n * 1000) / 1000
const problems = []
const used = { bgm: new Set(), sfx: new Set() }
const needFile = (type, file) => {
  used[type].add(file)
  if (!existsSync(join(pubAudio, type, file))) problems.push(`缺檔：public/audio/${type}/${file}`)
}

const manifest = {}

for (const track of bgmMeta.tracks) {
  const variants = {}
  for (const c of track.candidates) {
    const slot = c.slot
    needFile('bgm', c.filename)
    const m = c.metrics
    variants[slot] = {
      src: `/audio/bgm/${c.filename}`,
      loopStart: r3(m.loop_start_sec),
      loopEnd: r3(m.loop_end_sec),
      duration: r3(m.duration_sec),
    }
  }
  const def = track.recommended_id?.split('_').pop()
  if (!def || !variants[def]) problems.push(`bgm/${track.id}：找不到建議首選 ${track.recommended_id}`)
  manifest[`bgm/${track.id}`] = { default: def, variants }
}

for (const sound of sfxMeta.sounds) {
  const variants = {}
  for (const c of sound.candidates) {
    needFile('sfx', c.file)
    variants[c.candidate_id] = { src: `/audio/sfx/${c.file}`, ...(c.source === 'synth' ? { synth: true } : {}) }
  }
  if (!variants[sound.recommended_candidate]) problems.push(`sfx/${sound.id}：找不到建議首選 ${sound.recommended_candidate}`)
  manifest[`sfx/${sound.id}`] = { default: sound.recommended_candidate, variants }
}

for (const type of ['bgm', 'sfx']) {
  const dir = join(pubAudio, type)
  const files = existsSync(dir) ? readdirSync(dir) : []
  for (const f of files) if (!used[type].has(f)) problems.push(`多餘的檔案（manifest 沒有用到）：public/audio/${type}/${f}`)
}

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}

const out = JSON.stringify(manifest, null, 2) + '\n'
if (check) {
  const cur = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : ''
  if (cur !== out) {
    console.error('public/audio/manifest.json 與重新產生的內容不同，請執行 node scripts/build-audio-manifest.mjs')
    process.exit(1)
  }
  console.log('manifest 已是最新')
} else {
  writeFileSync(manifestPath, out)
  const nv = Object.values(manifest).reduce((n, e) => n + Object.keys(e.variants).length, 0)
  console.log(`已寫入 ${manifestPath}：${Object.keys(manifest).length} 個 id、${nv} 個版本`)
}
