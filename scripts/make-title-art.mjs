/**
 * Programmatic title logo & Open Graph share image generator.
 *
 * Usage:
 *   node scripts/make-title-art.mjs
 *
 * Outputs:
 *   - public/art/ui/logo.webp  (1200x310 transparent WebP)
 *   - public/og-image.jpg      (1200x630 JPEG, composited from gate.webp, heroines & the new logo)
 *
 * All text and line icons are rendered with local SIL OFL fonts (LXGW WenKai TC) and vector SVG,
 * never AI-generated text. To update copy, edit the constants below and re-run this script.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { launchBrowser } from './lib/browser.mjs'

// ---------------------------------------------------------------------------
// Editable copy & layout configuration
// ---------------------------------------------------------------------------
const MAIN_TITLE = '直到你找到我'
const SUBTITLE = '～青葉學園網站研究社～'
const OG_BADGE = 'SEO・AEO・GEO 青春校園戀愛養成'

const LOGO_WIDTH = 1200
const LOGO_HEIGHT = 310
const OG_WIDTH = 1200
const OG_HEIGHT = 630

const ROOT = process.cwd()
const FONT_DIR = join(ROOT, 'scripts', 'assets', 'fonts')
const FONT_BOLD_PATH = join(FONT_DIR, 'LXGWWenKaiTC-Bold.ttf')
const FONT_REGULAR_PATH = join(FONT_DIR, 'LXGWWenKaiTC-Regular.ttf')

const LOGO_OUT = join(ROOT, 'public', 'art', 'ui', 'logo.webp')
const OG_OUT = join(ROOT, 'public', 'og-image.jpg')

function toDataUrl(filePath, mime) {
  if (!existsSync(filePath)) {
    throw new Error(`Required asset not found: ${filePath}`)
  }
  return `data:${mime};base64,${readFileSync(filePath).toString('base64')}`
}

function escapeXml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Build the 1200x310 transparent title logo SVG.
 *
 * Aesthetic direction:
 *   - Lyrical, wistful youth atmosphere ("until you find me") matching delicate anime illustrations.
 *   - LXGW WenKai TC typography, pure/warm white fill, soft sky-blue & sakura outer glow,
 *     delicate dark-navy drop shadow + hairline definition (no chunky outlines or pastel gradients).
 *   - Thin-line rounded translucent-white search bar below with a minimalist line magnifying glass,
 *     subtitle, and crisp glowing vertical text caret "|".
 *   - Restrained accents: one cyan/sky-blue 4-point star (echoing Mirai's hairpin) and two soft sakura petals.
 */
function buildLogoHtml({ boldFontUrl, regularFontUrl }) {
  const mainEsc = escapeXml(MAIN_TITLE)
  const subEsc = escapeXml(SUBTITLE)

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<style>
  @font-face {
    font-family: 'LXGW WenKai TC';
    src: url('${regularFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'LXGW WenKai TC';
    src: url('${boldFontUrl}') format('truetype');
    font-weight: 700;
    font-style: normal;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${LOGO_WIDTH}px;
    height: ${LOGO_HEIGHT}px;
    background: transparent;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
  }
</style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" viewBox="0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}">
  <defs>
    <!-- Pure warm-white fill on main title (no rainbow/pastel gradient) -->
    <linearGradient id="titleFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="76%" stop-color="#fffdf8" />
      <stop offset="100%" stop-color="#f7f9ff" />
    </linearGradient>

    <!-- Soft outer glow + subtle dark depth shadow for crisp legibility on deep navy -->
    <filter id="titleGlow" x="-12%" y="-28%" width="124%" height="165%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="5" stdDeviation="6.5" flood-color="#060e26" flood-opacity="0.72" result="shadow" />
      <!-- Soft sky-blue outer atmospheric halo -->
      <feGaussianBlur in="SourceAlpha" stdDeviation="11.5" result="blurSky" />
      <feFlood flood-color="#9fd3f0" flood-opacity="0.54" result="colorSky" />
      <feComposite in="colorSky" in2="blurSky" operator="in" result="glowSky" />
      <!-- Delicate warm sakura inner aura -->
      <feGaussianBlur in="SourceAlpha" stdDeviation="3.8" result="blurPink" />
      <feFlood flood-color="#f7c4d3" flood-opacity="0.40" result="colorPink" />
      <feComposite in="colorPink" in2="blurPink" operator="in" result="glowPink" />
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="glowSky" />
        <feMergeNode in="glowPink" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Subtle shadow + soft sky glow for search bar frame & text -->
    <filter id="searchGlow" x="-6%" y="-35%" width="112%" height="185%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="3" stdDeviation="4.5" flood-color="#050b20" flood-opacity="0.62" result="s" />
      <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="b" />
      <feFlood flood-color="#9fd3f0" flood-opacity="0.32" result="c" />
      <feComposite in="c" in2="b" operator="in" result="g" />
      <feMerge>
        <feMergeNode in="s" />
        <feMergeNode in="g" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Star sparkle glow (echoing Mirai's cyan star hairclip) -->
    <linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0feff" />
      <stop offset="46%" stop-color="#92eaf5" />
      <stop offset="100%" stop-color="#52c8de" />
    </linearGradient>
    <filter id="starGlow" x="-90%" y="-90%" width="280%" height="280%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6.5" result="blur1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.0" result="blur2" />
      <feMerge>
        <feMergeNode in="blur1" />
        <feMergeNode in="blur2" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Delicate watercolor-like sakura petal gradients (no thick black stroke) -->
    <linearGradient id="petalGrad1" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="#fff2f6" stop-opacity="0.96" />
      <stop offset="52%" stop-color="#fbc4d4" stop-opacity="0.92" />
      <stop offset="100%" stop-color="#ec9ab4" stop-opacity="0.88" />
    </linearGradient>
    <linearGradient id="petalGrad2" x1="0" y1="0.1" x2="1" y2="0.9">
      <stop offset="0%" stop-color="#fff0f5" stop-opacity="0.92" />
      <stop offset="60%" stop-color="#f8b8cb" stop-opacity="0.86" />
      <stop offset="100%" stop-color="#e88faa" stop-opacity="0.82" />
    </linearGradient>
    <filter id="petalShadow" x="-45%" y="-45%" width="190%" height="190%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#120a22" flood-opacity="0.34" />
    </filter>

    <!-- Caret subtle glow (userSpaceOnUse so thin vertical rect is never clipped) -->
    <filter id="caretGlow" filterUnits="userSpaceOnUse" x="0" y="185" width="${LOGO_WIDTH}" height="100">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="cb" />
      <feMerge>
        <feMergeNode in="cb" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Main Title: 直到你找到我 (single line, generous letter-spacing, left-aligned) -->
  <g filter="url(#titleGlow)">
    <!-- Hairline dark-navy separation stroke (very subtle, never thick) -->
    <text
      id="main-title-stroke"
      x="30"
      y="146"
      font-family="'LXGW WenKai TC', serif"
      font-weight="700"
      font-size="146"
      letter-spacing="28"
      fill="none"
      stroke="#111d42"
      stroke-opacity="0.34"
      stroke-width="2.2"
      stroke-linejoin="round"
      paint-order="stroke"
    >${mainEsc}</text>
    <text
      id="main-title-text"
      x="30"
      y="146"
      font-family="'LXGW WenKai TC', serif"
      font-weight="700"
      font-size="146"
      letter-spacing="28"
      fill="url(#titleFill)"
    >${mainEsc}</text>
  </g>

  <!-- Delicate 4-point cyan/sky-blue star sparkle beside the title (echoing Mirai's star hairpin) -->
  <g id="star-accent" transform="translate(1096, 56) rotate(8)" filter="url(#starGlow)">
    <path d="M 0,-27 C 2.0,-7.2 7.2,-2.0 27,0 C 7.2,2.0 2.0,7.2 0,27 C -2.0,7.2 -7.2,2.0 -27,0 C -7.2,-2.0 -2.0,-7.2 0,-27 Z"
          fill="url(#starGrad)" />
    <circle cx="0" cy="0" r="4.0" fill="#ffffff" opacity="0.94" />
  </g>
  <!-- Tiny companion starlight glint -->
  <g id="star-mini" transform="translate(1136, 84)" opacity="0.76" filter="url(#starGlow)">
    <path d="M 0,-8.5 C 0.8,-2.4 2.4,-0.8 8.5,0 C 2.4,0.8 0.8,2.4 0,8.5 C -0.8,2.4 -2.4,0.8 -8.5,0 C -2.4,-0.8 -0.8,-2.4 0,-8.5 Z"
          fill="#daf6ff" />
  </g>

  <!-- Restrained drifting sakura petal #1 (open air at upper-right beside the star, zero text collision) -->
  <g id="petal-1" transform="translate(1126, 148) rotate(32) scale(0.90)" filter="url(#petalShadow)" opacity="0.92">
    <path d="M 0,-18 C 11,-14 15,-2 11,11 C 7,18 2,20 0,21 C -2,20 -7,18 -11,11 C -15,-2 -11,-14 0,-18 C -2,-11 0,-8 0,-8 C 0,-8 2,-11 0,-18 Z"
          fill="url(#petalGrad1)" />
    <path d="M 0,-15 C 5,-10 7,0 4,11" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.48" stroke-linecap="round" />
  </g>

  <!-- Thin rounded search bar containing minimalist magnifying glass, subtitle & glowing caret "|" -->
  <g filter="url(#searchGlow)">
    <!-- Airy translucent glass pill with crisp semi-transparent white border -->
    <rect
      id="search-pill"
      x="34"
      y="196"
      width="992"
      height="78"
      rx="39"
      ry="39"
      fill="#0b1536"
      fill-opacity="0.16"
      stroke="#f2f8ff"
      stroke-opacity="0.76"
      stroke-width="2.5"
    />
    <!-- Subtle inner highlight hairline -->
    <rect
      id="search-pill-inner"
      x="36"
      y="198"
      width="988"
      height="74"
      rx="37"
      ry="37"
      fill="none"
      stroke="#ffffff"
      stroke-opacity="0.15"
      stroke-width="1"
    />

    <!-- Minimalist thin-line magnifying glass icon (same color as border, not emoji) -->
    <g transform="translate(88, 235)" stroke="#eef6ff" stroke-opacity="0.86" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="-3" cy="-3" r="13.5" />
      <line x1="6.8" y1="6.8" x2="16.5" y2="16.5" />
    </g>

    <!-- Subtitle text inside the search bar (LXGW WenKai TC) -->
    <text
      id="subtitle-text"
      x="132"
      y="251"
      font-family="'LXGW WenKai TC', serif"
      font-weight="700"
      font-size="47"
      letter-spacing="7"
      fill="#f8fbff"
      fill-opacity="0.96"
    >${subEsc}</text>

    <!-- Crisp thin vertical text cursor "|" (rect so SVG glow filter never clips) -->
    <rect
      id="search-caret"
      x="764"
      y="214"
      width="3.0"
      height="42"
      rx="1.5"
      fill="#c4ebff"
      fill-opacity="0.95"
      filter="url(#caretGlow)"
    />
  </g>

  <!-- Restrained drifting sakura petal #2 (softly floating past the right end of search bar) -->
  <g id="petal-2" transform="translate(1078, 242) rotate(-28) scale(0.82)" filter="url(#petalShadow)" opacity="0.86">
    <path d="M 0,-17 C 10,-13 14,-2 10,10 C 6,16 2,19 0,20 C -2,19 -6,16 -10,10 C -14,-2 -10,-13 0,-17 C -2,-10 0,-7 0,-7 C 0,-7 2,-10 0,-17 Z"
          fill="url(#petalGrad2)" />
    <path d="M 0,-14 C 4,-9 6,0 3,10" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.42" stroke-linecap="round" />
  </g>
</svg>
<script>
  // Dynamically align search bar width, caret position, and right accents to actual rendered text metrics
  window.__alignLayout = () => {
    const main = document.getElementById('main-title-text')
    const sub = document.getElementById('subtitle-text')
    const caret = document.getElementById('search-caret')
    const pill = document.getElementById('search-pill')
    const pillInner = document.getElementById('search-pill-inner')
    const star = document.getElementById('star-accent')
    const starMini = document.getElementById('star-mini')
    const petal1 = document.getElementById('petal-1')
    const petal2 = document.getElementById('petal-2')
    if (!main || !sub || !caret || !pill || !pillInner) return null

    const mBox = main.getBBox()
    const sBox = sub.getBBox()

    // Place caret cleanly right after the subtitle's trailing wave dash
    const caretX = Math.round((sBox.x + sBox.width + 14) * 10) / 10
    caret.setAttribute('x', String(caretX))

    // Match search bar right edge harmoniously to main title right edge (always leaving typing space after caret)
    const desiredRight = Math.min(1060, Math.max(Math.round(mBox.x + mBox.width), Math.round(caretX + 120)))
    const pillW = desiredRight - 34
    pill.setAttribute('width', String(pillW))
    pillInner.setAttribute('width', String(pillW - 4))

    // Position 4-point star and petals cleanly in the open air to the right of main title & search bar
    const rightEdge = Math.round(mBox.x + mBox.width)
    if (star) star.setAttribute('transform', 'translate(' + Math.min(1118, rightEdge + 46) + ', 52) rotate(8)')
    if (starMini) starMini.setAttribute('transform', 'translate(' + Math.min(1158, rightEdge + 84) + ', 80)')
    if (petal1) petal1.setAttribute('transform', 'translate(' + Math.min(1150, rightEdge + 76) + ', 146) rotate(32) scale(0.88)')
    if (petal2) petal2.setAttribute('transform', 'translate(' + Math.min(1126, desiredRight + 46) + ', 242) rotate(-28) scale(0.80)')

    return {
      mainBBox: { x: Math.round(mBox.x), y: Math.round(mBox.y), width: Math.round(mBox.width), height: Math.round(mBox.height) },
      subBBox: { x: Math.round(sBox.x), y: Math.round(sBox.y), width: Math.round(sBox.width), height: Math.round(sBox.height) },
      caretX,
      pillWidth: pillW,
    }
  }
</script>
</body>
</html>`
}

/**
 * Build the 1200x630 Open Graph promotional share image HTML.
 * Composites gate.webp + mirai/smile (left) + rin/smile (center) + hare/happy (right)
 * + deep cinematic bottom gradient + badge pill + newly generated logo.webp.
 */
function buildOgHtml({
  boldFontUrl,
  regularFontUrl,
  gateUrl,
  miraiUrl,
  rinUrl,
  hareUrl,
  logoUrl,
  logoOffsetX,
}) {
  const badgeEsc = escapeXml(OG_BADGE)

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<style>
  @font-face {
    font-family: 'LXGW WenKai TC';
    src: url('${regularFontUrl}') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'LXGW WenKai TC';
    src: url('${boldFontUrl}') format('truetype');
    font-weight: 700;
    font-style: normal;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${OG_WIDTH}px;
    height: ${OG_HEIGHT}px;
    overflow: hidden;
    background: #081026;
    -webkit-font-smoothing: antialiased;
  }
  .stage {
    position: relative;
    width: ${OG_WIDTH}px;
    height: ${OG_HEIGHT}px;
    overflow: hidden;
  }
  .bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 42%;
    filter: saturate(1.04) brightness(0.98);
  }
  /* Gentle atmospheric depth gradient behind characters */
  .bg-vignette {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 95% 80% at 50% 34%, rgba(255, 248, 244, 0.08) 0%, rgba(12, 20, 48, 0.28) 100%);
  }
  /* Heroines trio — Mirai left, Rin center front (red armband fully clear above badge & left of Hare), Hare right (keeping "青葉學園" sign visible) */
  .sprite {
    position: absolute;
    height: auto;
    pointer-events: none;
    -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%);
  }
  .mirai {
    z-index: 1;
    left: 196px;
    top: 8px;
    width: 314px;
    filter: drop-shadow(0 12px 24px rgba(8, 14, 38, 0.42));
  }
  .hare {
    z-index: 1;
    left: 672px;
    top: 12px;
    width: 306px;
    filter: drop-shadow(0 12px 24px rgba(8, 14, 38, 0.42));
  }
  .rin {
    z-index: 2;
    left: 432px;
    top: -9px;
    width: 326px;
    filter: drop-shadow(0 16px 32px rgba(6, 10, 32, 0.58));
  }
  /* Deep lyrical navy bottom gradient: keeps faces & Rin's red armband bright, creates rich contrast for badge & logo */
  .bottom-gradient {
    position: absolute;
    z-index: 3;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(9, 15, 38, 0.00) 0%,
      rgba(9, 15, 38, 0.00) 47%,
      rgba(10, 17, 44, 0.46) 58%,
      rgba(9, 15, 40, 0.86) 73%,
      rgba(7, 12, 32, 0.95) 89%,
      rgba(6, 10, 28, 0.98) 100%
    );
  }
  /* Subtle warm-sakura & sky-blue horizon mist near lower center */
  .mist-accent {
    position: absolute;
    z-index: 4;
    left: 0;
    right: 0;
    bottom: 0;
    height: 290px;
    background:
      radial-gradient(ellipse 55% 65% at 32% 88%, rgba(159, 211, 240, 0.14) 0%, transparent 72%),
      radial-gradient(ellipse 50% 60% at 70% 85%, rgba(247, 184, 200, 0.12) 0%, transparent 72%);
  }
  /* Lower title lockup */
  .lockup {
    position: absolute;
    z-index: 5;
    left: 0;
    right: 0;
    bottom: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 26px 7px;
    border-radius: 999px;
    background: rgba(11, 19, 46, 0.82);
    border: 1.5px solid rgba(159, 211, 240, 0.58);
    box-shadow: 0 4px 18px rgba(4, 8, 26, 0.50), 0 0 18px rgba(159, 211, 240, 0.18);
    color: #d4eeff;
    font-family: 'LXGW WenKai TC', 'Noto Sans TC', 'PingFang TC', sans-serif;
    font-weight: 700;
    font-size: 22px;
    letter-spacing: 2.5px;
    line-height: 1.25;
    margin-bottom: 12px;
  }
  .logo-wrap {
    width: 820px;
    display: flex;
    justify-content: center;
  }
  .logo-img {
    width: 820px;
    height: auto;
    display: block;
    transform: translateX(${logoOffsetX}px);
    filter: drop-shadow(0 6px 22px rgba(4, 8, 28, 0.68));
  }
</style>
</head>
<body>
  <div class="stage">
    <img class="bg" src="${gateUrl}" alt="" />
    <div class="bg-vignette"></div>
    <img class="sprite mirai" src="${miraiUrl}" alt="" />
    <img class="sprite hare" src="${hareUrl}" alt="" />
    <img class="sprite rin" src="${rinUrl}" alt="" />
    <div class="bottom-gradient"></div>
    <div class="mist-accent"></div>
    <div class="lockup">
      <div class="badge">${badgeEsc}</div>
      <div class="logo-wrap">
        <img class="logo-img" src="${logoUrl}" alt="" />
      </div>
    </div>
  </div>
</body>
</html>`
}

async function renderSupersampled(page, html, { width, height, mime, quality, omitBackground, afterFonts }) {
  await page.setViewportSize({ width, height })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  const extra = afterFonts ? await afterFonts(page) : null

  const pngBuffer = await page.screenshot({
    type: 'png',
    omitBackground: Boolean(omitBackground),
    clip: { x: 0, y: 0, width, height },
  })

  const pngDataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`
  const { base64, bbox } = await page.evaluate(
    async ({ src, w, h, outMime, outQuality }) => {
      const img = new Image()
      img.src = src
      await new Promise((res, rej) => ((img.onload = res), (img.onerror = rej)))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, w, h)

      let minX = w, maxX = -1, minY = h, maxY = -1
      const { data } = ctx.getImageData(0, 0, w, h)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 20) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
      return {
        base64: c.toDataURL(outMime, outQuality).split(',')[1],
        bbox: maxX >= 0 ? [minX, minY, maxX, maxY] : null,
      }
    },
    { src: pngDataUrl, w: width, h: height, outMime: mime, outQuality: quality },
  )

  return { buffer: Buffer.from(base64, 'base64'), bbox, extra }
}

async function main() {
  const boldFontUrl = toDataUrl(FONT_BOLD_PATH, 'font/ttf')
  const regularFontUrl = toDataUrl(FONT_REGULAR_PATH, 'font/ttf')

  const browser = await launchBrowser()
  const context = await browser.newContext({
    viewport: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  try {
    // 1. Render transparent title logo (1200x310 WebP)
    const logoHtml = buildLogoHtml({ boldFontUrl, regularFontUrl })
    const logoRes = await renderSupersampled(page, logoHtml, {
      width: LOGO_WIDTH,
      height: LOGO_HEIGHT,
      mime: 'image/webp',
      quality: 0.94,
      omitBackground: true,
      afterFonts: (p) => p.evaluate(() => window.__alignLayout?.() ?? null),
    })

    mkdirSync(dirname(LOGO_OUT), { recursive: true })
    writeFileSync(LOGO_OUT, logoRes.buffer)
    console.log(
      `Generated ${LOGO_OUT} (${LOGO_WIDTH}x${LOGO_HEIGHT}, ${(logoRes.buffer.length / 1024).toFixed(1)} KB, bbox=${logoRes.bbox?.join(',')})`,
    )
    if (logoRes.extra) {
      console.log(`  layout metrics:`, JSON.stringify(logoRes.extra))
    }

    // Center optical mass of the main title + search bar block on the 1200px OG canvas
    let logoOffsetX = 0
    if (logoRes.extra?.mainBBox) {
      const { x, width } = logoRes.extra.mainBBox
      const titleCenter = x + width / 2
      const canvasCenter = LOGO_WIDTH / 2
      const ogLogoScale = 820 / LOGO_WIDTH
      logoOffsetX = Math.round((canvasCenter - titleCenter) * ogLogoScale * 10) / 10
    }

    // 2. Render Open Graph share image (1200x630 JPEG)
    const ogHtml = buildOgHtml({
      boldFontUrl,
      regularFontUrl,
      gateUrl: toDataUrl(join(ROOT, 'public', 'art', 'bg', 'gate.webp'), 'image/webp'),
      miraiUrl: toDataUrl(join(ROOT, 'public', 'art', 'mirai', 'smile.webp'), 'image/webp'),
      rinUrl: toDataUrl(join(ROOT, 'public', 'art', 'rin', 'smile.webp'), 'image/webp'),
      hareUrl: toDataUrl(join(ROOT, 'public', 'art', 'hare', 'happy.webp'), 'image/webp'),
      logoUrl: `data:image/webp;base64,${logoRes.buffer.toString('base64')}`,
      logoOffsetX,
    })

    const ogRes = await renderSupersampled(page, ogHtml, {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      mime: 'image/jpeg',
      quality: 0.91,
      omitBackground: false,
    })

    writeFileSync(OG_OUT, ogRes.buffer)
    console.log(`Generated ${OG_OUT} (${OG_WIDTH}x${OG_HEIGHT}, ${(ogRes.buffer.length / 1024).toFixed(1)} KB, logoOffsetX=${logoOffsetX})`)
  } finally {
    await context.close()
    await browser.close()
  }
}

await main()
