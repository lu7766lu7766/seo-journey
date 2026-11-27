/**
 * Art checklist / QA:  node scripts/check-art.mjs [--sheet <dir>]   (or: npm run art:check [-- --sheet <dir>])
 *
 * --sheet <dir>  additionally writes contact sheets (sprites-<id>.png, backgrounds.png, cgs.png) of everything
 *                that is done, for the director's "all faces side by side" review.
 *
 * Reads public/art/manifest.json and reports, for every asset the production sheet
 * (docs/art-requests.md) asks for, whether it is DONE (listed in the manifest, file exists, size is right)
 * or still TODO. For sprites it also compares the opaque bounding box against `<id>/normal` so a face
 * that would "jump" in the game (different crop/scale) is flagged.
 * Exit code is always 0 for TODO items; it is 1 only when a listed file is broken (missing / wrong size).
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { launchBrowser } from './lib/browser.mjs'

const ART = join(process.cwd(), 'public', 'art')
const manifest = existsSync(join(ART, 'manifest.json')) ? JSON.parse(readFileSync(join(ART, 'manifest.json'), 'utf8')) : {}

const GIRL_FACES = ['normal', 'smile', 'happy', 'blush', 'surprised', 'angry', 'sad', 'think']
const WANT = {
  rin: GIRL_FACES,
  hare: GIRL_FACES,
  mirai: GIRL_FACES,
  sensei: ['normal', 'smile', 'think', 'sad'],
  kuro: ['normal', 'smug', 'shock', 'sad'],
}
const BGS = [
  'gate', 'classroom', 'clubroom', 'corridor', 'rooftop', 'library', 'broadcast', 'council', 'home',
  'street', 'planetarium', 'beach', 'festival', 'rain', 'infirmary',
]
const CGS = [
  'end-true', 'end-rin', 'end-hare', 'end-mirai', 'end-normal', 'end-bad', 'end-blackhat',
  'date-rin-3', 'date-hare-3', 'date-mirai-3',
]

const items = []
for (const [id, faces] of Object.entries(WANT)) for (const f of faces) items.push({ key: `${id}/${f}`, kind: 'sprite', id, face: f })
for (const b of BGS) items.push({ key: `bg/${b}`, kind: 'bg' })
for (const c of CGS) items.push({ key: `cg/${c}`, kind: 'cg' })
// second batch: UI illustrations (via the manifest) and site icons / share image (plain files in public/)
const ACTIVITIES = ['write', 'research', 'techcheck', 'schema', 'qa', 'authors', 'social', 'rest', 'fail', 'infirmary']
for (const a of ACTIVITIES) items.push({ key: `ui/activity-${a}`, kind: 'banner' })
items.push({ key: 'ui/logo', kind: 'logo' })
const FILES = [
  { file: 'og-image.jpg', w: 1200, h: 630 },
  { file: 'favicon.png', w: 512, h: 512 },
  { file: 'apple-touch-icon.png', w: 180, h: 180 },
]

const browser = await launchBrowser()
const page = await browser.newPage()

async function inspect(file) {
  const b64 = readFileSync(file).toString('base64')
  const mime = /\.png$/i.test(file) ? 'png' : /\.jpe?g$/i.test(file) ? 'jpeg' : 'webp'
  return page.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await new Promise((res, rej) => ((img.onload = res), (img.onerror = rej)))
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height)
    let minX = width, maxX = -1, minY = height, maxY = -1
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 20) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    return { width, height, bbox: maxX >= 0 ? [minX, minY, maxX, maxY] : null }
  }, `data:image/${mime};base64,${b64}`)
}

const rows = []
let broken = 0
const normalBox = {}
try {
  for (const it of items) {
    const entry = manifest[it.key]
    if (!entry) {
      rows.push([it.key, 'TODO', 'not in manifest.json'])
      continue
    }
    const url = typeof entry === 'string' ? entry : `/art/${it.key}.png`
    const file = join(process.cwd(), 'public', url.replace(/^\//, ''))
    if (!existsSync(file)) {
      rows.push([it.key, 'BROKEN', `manifest points to ${url} but the file is missing`])
      broken++
      continue
    }
    if (!/\.webp$/i.test(file)) {
      rows.push([it.key, 'DONE', `${url} (not webp; size not inspected)`])
      continue
    }
    const info = await inspect(file)
    const wantW = it.kind === 'sprite' ? 600 : it.kind === 'banner' ? 1584 : 1280
    const wantH = it.kind === 'sprite' ? 1000 : it.kind === 'banner' ? 404 : 720
    if (it.kind === 'logo') {
      if (info.width > 1200 || info.height > 400) {
        rows.push([it.key, 'BROKEN', `${url} is ${info.width}x${info.height}; the logo must fit within 1200x400 (re-run process-art)`])
        broken++
        continue
      }
      rows.push([it.key, 'DONE', `${url} (${info.width}x${info.height})`])
      continue
    }
    if (info.width !== wantW || info.height !== wantH) {
      rows.push([it.key, 'BROKEN', `${url} is ${info.width}x${info.height}, expected ${wantW}x${wantH} (re-run process-art)`])
      broken++
      continue
    }
    let note = url
    if (it.kind === 'sprite') {
      if (it.face === 'normal') normalBox[it.id] = info.bbox
      else if (normalBox[it.id] && info.bbox) {
        const d = info.bbox.map((v, i) => Math.abs(v - normalBox[it.id][i]))
        const worst = Math.max(...d)
        if (worst > 12) note += `  WARN: crop differs from normal by up to ${worst}px (bbox ${info.bbox.join(',')} vs ${normalBox[it.id].join(',')}); face may shift/scale in game`
      }
    }
    rows.push([it.key, 'DONE', note])
  }
  for (const f of FILES) {
    const file = join(process.cwd(), 'public', f.file)
    if (!existsSync(file)) {
      rows.push([f.file, 'TODO', `public/${f.file} not found`])
      continue
    }
    const info = await inspect(file)
    if (info.width !== f.w || info.height !== f.h) {
      rows.push([f.file, 'BROKEN', `public/${f.file} is ${info.width}x${info.height}, expected ${f.w}x${f.h}`])
      broken++
    } else rows.push([f.file, 'DONE', `public/${f.file}`])
  }
} finally {
  await browser.close()
}


const shotIdx = process.argv.indexOf('--sheet')
if (shotIdx !== -1) {
  const dir = process.argv[shotIdx + 1]
  if (!dir) throw new Error('--sheet needs an output directory')
  mkdirSync(dir, { recursive: true })
  const b2 = await launchBrowser()
  const p2 = await b2.newPage()
  const urlOf = (key) => {
    const e = manifest[key]
    const u = typeof e === 'string' ? e : `/art/${key}.png`
    const f = join(process.cwd(), 'public', u.replace(/^\//, ''))
    if (!existsSync(f)) return null
    const mime = /\.png$/i.test(f) ? 'png' : 'webp'
    return `data:image/${mime};base64,${readFileSync(f).toString('base64')}`
  }
  const render = async (name, html, w, h) => {
    await p2.setViewportSize({ width: w, height: h })
    await p2.setContent(`<body style="margin:0;background:#8b8fa3;font:14px sans-serif;color:#fff">${html}</body>`)
    await p2.waitForTimeout(300)
    await p2.screenshot({ path: join(dir, name), fullPage: true })
    console.log(`sheet -> ${join(dir, name)}`)
  }
  try {
    for (const [id, faces] of Object.entries(WANT)) {
      const cells = faces
        .filter((f) => manifest[`${id}/${f}`])
        .map((f) => `<div style="width:200px;text-align:center"><img src="${urlOf(`${id}/${f}`)}" style="width:200px;height:333px;object-fit:contain"><div>${id}/${f}</div></div>`)
      if (cells.length) await render(`sprites-${id}.png`, `<div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px;width:1640px">${cells.join('')}</div>`, 1664, 380 * Math.ceil(cells.length / 8))
    }
    for (const [name, keys] of [['backgrounds.png', BGS.map((x) => `bg/${x}`)], ['cgs.png', CGS.map((x) => `cg/${x}`)]]) {
      const cells = keys
        .filter((k) => manifest[k])
        .map((k) => `<div style="width:420px"><img src="${urlOf(k)}" style="width:420px;height:236px;display:block"><div>${k}</div></div>`)
      if (cells.length) await render(name, `<div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px;width:1300px">${cells.join('')}</div>`, 1316, 280 * Math.ceil(cells.length / 3))
    }
  } finally {
    await b2.close()
  }
}

const pad = Math.max(...rows.map((r) => r[0].length))
for (const [k, s, n] of rows) console.log(`${s.padEnd(6)} ${k.padEnd(pad)}  ${n}`)
const done = rows.filter((r) => r[1] === 'DONE').length
console.log(`\n${done}/${rows.length} assets done, ${rows.filter((r) => r[1] === 'TODO').length} TODO, ${broken} broken.`)
process.exit(broken ? 1 : 0)
