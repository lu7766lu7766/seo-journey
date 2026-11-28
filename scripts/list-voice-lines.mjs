#!/usr/bin/env node
/**
 * 列出所有需要配音的台詞，輸出 `scripts/audio/voice-lines.json`，給之後的語音產生流程使用。
 *
 * - 有語音的說話者：rin／hare／mirai／sensei／kuro 與無立繪 NPC（`npc(name, text)`）；主角（me）與旁白（narr）沒有。
 * - 每一筆有 `sceneId`、`key`（語音鍵，見 src/audio/voiceKey.ts）、說話者、表情 `face`、原文 `text`（含 `{name}`）、
 *   配音用文字 `voiceText`（規則見 src/audio/voiceText.ts：去掉 `{name}` 並收乾淨標點、去掉括號內的舞台指示）。
 * - 配音用文字為空或只剩標點的行不配音：不放進 `lines`，改列在 `skipped`（方便檢查）。
 * - `nameInline: true` 表示 `{name}` 夾在文字中間（兩側都不是標點，例如「和{name}在天台」），去掉後句子會不通順，
 *   需要請劇本作者改寫（本腳本只標記、不改劇本）。
 * - 同一場景裡「說話者＋原文」相同的行共用一個 key／一個音檔，`lineIds` 列出所有出現的位置。
 * - 產生音檔後放到 `public/audio/voice/<sceneId>/<key>.mp3`，並在 `public/audio/voice/manifest.json` 加上
 *   `"<sceneId>/<key>": { "src": "/audio/voice/<sceneId>/<key>.mp3", "duration": 秒 }`。
 *
 * 用法：node scripts/list-voice-lines.mjs [--out <path>] [--quiet]
 * 輸出是決定性的（沒有時間戳），劇本沒變就不會有 diff。
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const quiet = args.includes('--quiet')
const outIdx = args.indexOf('--out')
const outPath = outIdx !== -1 && args[outIdx + 1] ? join(process.cwd(), args[outIdx + 1]) : join(root, 'scripts/audio/voice-lines.json')

const server = await createServer({
  root,
  configFile: false,
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true },
  resolve: { alias: { '@': join(root, 'src') } },
})

try {
  const { voiceKey, isVoicedSpeaker, VOICED_SPEAKERS } = await server.ssrLoadModule('/src/audio/voiceKey.ts')
  const { voiceText } = await server.ssrLoadModule('/src/audio/voiceText.ts')

  /** 場景檔（與 src/content/scenes/index.ts 的 glob 一致），依 sceneId 排序以得到穩定輸出 */
  const files = []
  for (const dir of ['main', 'dates', 'side', 'endings']) {
    for (const f of readdirSync(join(root, 'src/content/scenes', dir))) {
      if (f.endsWith('.ts')) files.push({ id: f.replace(/\.ts$/, ''), url: `/src/content/scenes/${dir}/${f}` })
    }
  }
  files.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  function* says(cmds, path) {
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i]
      const p = [...path, i]
      if (c.k === 'say') yield { cmd: c, pc: p }
      else if (c.k === 'choice') for (let b = 0; b < c.options.length; b++) yield* says(c.options[b].then ?? [], [...p, b])
      else if (c.k === 'if') {
        yield* says(c.then, [...p, 0])
        yield* says(c.else ?? [], [...p, 1])
      }
    }
  }

  /** `{name}` 兩側都是一般文字（不是標點或句首句尾）→ 去掉名字後句子會破 */
  const INLINE_NAME = /[^，、；：,;:。！？!?.…—～~·・\s（(]\{name\}[^，、；：,;:。！？!?.…—～~·・\s）)]/
  const lines = []
  const skipped = []
  const stats = { sceneCount: files.length, sayCommands: 0, voicedSpeakerSayCommands: 0, noVoiceSpeakerSayCommands: 0, uniqueLines: 0, skippedLines: 0, nameInlineLines: 0, bySpeaker: {} }
  for (const sp of VOICED_SPEAKERS) stats.bySpeaker[sp] = { lines: 0, withName: 0, skipped: 0 }

  for (const f of files) {
    const scene = (await server.ssrLoadModule(f.url)).default
    if (scene.id !== f.id) throw new Error(`${f.url}: scene id ${scene.id} ≠ 檔名`)
    const seen = new Map() // key → entry（同一場景相同說話者＋原文合併）
    for (const { cmd, pc } of says(scene.cmds, [])) {
      stats.sayCommands++
      if (!isVoicedSpeaker(cmd.who)) {
        stats.noVoiceSpeakerSayCommands++
        continue
      }
      stats.voicedSpeakerSayCommands++
      const key = voiceKey(cmd.who, cmd.text, cmd.name)
      const lineId = `${scene.id}#${pc.join('.')}`
      const dup = seen.get(key)
      if (dup) {
        dup.lineIds.push(lineId)
        continue
      }
      const vt = voiceText(cmd.text)
      const entry = {
        sceneId: scene.id,
        key,
        speaker: cmd.who,
        ...(cmd.who === 'npc' ? { name: cmd.name } : {}),
        face: cmd.face ?? null,
        text: cmd.text,
        voiceText: vt,
        hasName: cmd.text.includes('{name}'),
        ...(INLINE_NAME.test(cmd.text) ? { nameInline: true } : {}),
        lineIds: [lineId],
      }
      seen.set(key, entry)
      const s = stats.bySpeaker[cmd.who]
      if (vt === null) {
        s.skipped++
        stats.skippedLines++
        skipped.push(entry)
      } else {
        s.lines++
        if (entry.hasName) s.withName++
        stats.uniqueLines++
        if (entry.nameInline) stats.nameInlineLines++
        lines.push(entry)
      }
    }
  }

  const output = { stats, lines, skipped }
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')

  if (!quiet) {
    const rel = outPath.startsWith(root) ? outPath.slice(root.length + 1) : outPath
    console.log(`已寫入 ${rel}`)
    console.log(`場景 ${stats.sceneCount} 個；對白指令 ${stats.sayCommands} 行（主角／旁白 ${stats.noVoiceSpeakerSayCommands} 行無語音，有語音說話者 ${stats.voicedSpeakerSayCommands} 行）`)
    console.log(`需要配音（同場景同說話者同原文合併後）：${stats.uniqueLines} 行；不配音（處理後為空或只剩標點）：${stats.skippedLines} 行`)
    for (const l of lines.filter((x) => x.nameInline)) console.log(`⚠ ${l.lineIds[0]} {name} 夾在句中，去掉後不通順：${l.text}`)
    console.log('說話者        配音行數  去掉{name}  不配音')
    for (const [sp, s] of Object.entries(stats.bySpeaker)) {
      console.log(`${sp.padEnd(12)} ${String(s.lines).padStart(8)} ${String(s.withName).padStart(10)} ${String(s.skipped).padStart(7)}`)
    }
  }
} finally {
  await server.close()
}
