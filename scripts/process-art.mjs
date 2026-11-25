import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { launchBrowser } from './lib/browser.mjs'

const ROOT = process.cwd()
const SOURCES_PATH = process.argv[2] ?? join(ROOT, 'scripts', 'art-sources.json')
const OUT_DIR = join(ROOT, 'public', 'art')
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json')

const sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf8'))

const browser = await launchBrowser()
const page = await browser.newPage()

const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : {}

try {
  for (const [key, srcPath] of Object.entries(sources)) {
    if (!srcPath || !existsSync(srcPath)) {
      console.warn(`Missing source for ${key}: ${srcPath}`)
      continue
    }

    const ext = srcPath.toLowerCase().endsWith('.jpg') || srcPath.toLowerCase().endsWith('.jpeg') ? 'jpeg' : 'png'
    const b64 = readFileSync(srcPath).toString('base64')
    const dataUrl = `data:image/${ext};base64,${b64}`

    const isSprite = !key.startsWith('bg/') && !key.startsWith('cg/')

    const webpBase64 = await page.evaluate(
      async ({ dataUrl: src, isSprite: sprite }) => {
        const img = new Image()
        img.src = src
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })

        const iw = img.naturalWidth
        const ih = img.naturalHeight

        if (!sprite) {
          const canvas = document.createElement('canvas')
          canvas.width = 1280
          canvas.height = 720
          const ctx = canvas.getContext('2d')
          const scale = Math.max(1280 / iw, 720 / ih)
          const dw = iw * scale
          const dh = ih * scale
          ctx.drawImage(img, (1280 - dw) / 2, (720 - dh) / 2, dw, dh)
          return canvas.toDataURL('image/webp', 0.86).split(',')[1]
        }

        // Key out chroma green background via border-seeded flood fill + despill
        const srcCanvas = document.createElement('canvas')
        srcCanvas.width = iw
        srcCanvas.height = ih
        const sctx = srcCanvas.getContext('2d')
        sctx.drawImage(img, 0, 0)
        const imgData = sctx.getImageData(0, 0, iw, ih)
        const d = imgData.data

        // Estimate background RGB from 4 corners
        const corners = [0, (iw - 1) * 4, (ih - 1) * iw * 4, ((ih - 1) * iw + (iw - 1)) * 4]
        let bgR = 0, bgG = 0, bgB = 0
        for (const c of corners) {
          bgR += d[c]
          bgG += d[c + 1]
          bgB += d[c + 2]
        }
        bgR /= 4; bgG /= 4; bgB /= 4

        const total = iw * ih
        const visited = new Uint8Array(total)
        const bgMask = new Uint8Array(total)
        const queue = new Int32Array(total)
        let qh = 0, qt = 0

        const isChroma = (idx) => {
          const p = idx * 4
          const r = d[p], g = d[p + 1], b = d[p + 2]
          const greenDom = g - Math.max(r, b)
          const dist = Math.hypot(r - bgR, g - bgG, b - bgB)
          return greenDom > 26 || (dist < 95 && g > r + 15 && g > b + 15)
        }

        const push = (idx) => {
          if (visited[idx]) return
          visited[idx] = 1
          if (isChroma(idx)) {
            bgMask[idx] = 1
            queue[qt++] = idx
          }
        }

        for (let x = 0; x < iw; x++) {
          push(x)
          push((ih - 1) * iw + x)
        }
        for (let y = 0; y < ih; y++) {
          push(y * iw)
          push(y * iw + (iw - 1))
        }

        while (qh < qt) {
          const cur = queue[qh++]
          const cx = cur % iw
          const cy = (cur - cx) / iw
          if (cx > 0) push(cur - 1)
          if (cx + 1 < iw) push(cur + 1)
          if (cy > 0) push(cur - iw)
          if (cy + 1 < ih) push(cur + iw)
        }

        // Also seed enclosed pure chroma-green pockets (e.g. gaps between sleeve and torso)
        for (let i = 0; i < total; i++) {
          if (bgMask[i]) continue
          const p = i * 4
          const r = d[p], g = d[p + 1], b = d[p + 2]
          if (g > 180 && g - Math.max(r, b) > 75) {
            bgMask[i] = 1
            visited[i] = 1
            queue[qt++] = i
          }
        }
        while (qh < qt) {
          const cur = queue[qh++]
          const cx = cur % iw
          const cy = (cur - cx) / iw
          if (cx > 0) push(cur - 1)
          if (cx + 1 < iw) push(cur + 1)
          if (cy > 0) push(cur - iw)
          if (cy + 1 < ih) push(cur + iw)
        }

        // Alpha removal + 2px edge feathering & green despill
        for (let i = 0; i < total; i++) {
          const p = i * 4
          if (bgMask[i]) {
            d[p + 3] = 0
            continue
          }
          const x = i % iw
          const y = (i - x) / iw
          let nearBg = false
          for (let dy = -2; dy <= 2 && !nearBg; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx, ny = y + dy
              if (nx >= 0 && nx < iw && ny >= 0 && ny < ih && bgMask[ny * iw + nx]) {
                nearBg = true
                break
              }
            }
          }
          if (nearBg) {
            const r = d[p], g = d[p + 1], b = d[p + 2]
            const maxRB = Math.max(r, b)
            if (g > maxRB) {
              const excess = g - maxRB
              d[p + 1] = maxRB
              if (excess > 18) d[p + 3] = Math.max(0, Math.round(255 * (1 - Math.min(1, (excess - 18) / 55))))
            }
          }
        }

        sctx.putImageData(imgData, 0, 0)

        // Find tight bounding box of non-transparent pixels
        let minX = iw, maxX = 0, minY = ih, maxY = 0
        for (let y = 0; y < ih; y++) {
          for (let x = 0; x < iw; x++) {
            if (d[(y * iw + x) * 4 + 3] > 20) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }

        const out = document.createElement('canvas')
        out.width = 600
        out.height = 1000
        const octx = out.getContext('2d')

        if (maxX > minX && maxY > minY) {
          const bw = maxX - minX + 1
          const bh = maxY - minY + 1
          const targetH = 950
          const scale = Math.min(560 / bw, targetH / bh)
          const dw = bw * scale
          const dh = bh * scale
          const dx = (600 - dw) / 2
          const dy = 1000 - dh
          octx.drawImage(srcCanvas, minX, minY, bw, bh, dx, dy, dw, dh)
        }

        return out.toDataURL('image/webp', 0.88).split(',')[1]
      },
      { dataUrl, isSprite },
    )

    const relPath = `${key}.webp`
    const outFile = join(OUT_DIR, relPath)
    mkdirSync(dirname(outFile), { recursive: true })
    writeFileSync(outFile, Buffer.from(webpBase64, 'base64'))
    manifest[key] = `/art/${relPath}`
    console.log(`Processed ${key} -> public/art/${relPath}`)
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Updated manifest with ${Object.keys(manifest).length} assets.`)
} finally {
  await browser.close()
}
