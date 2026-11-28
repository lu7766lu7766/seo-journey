/**
 * Verifies that the programmatic SVG art (sprites / backgrounds / activity chibi / title text logo) is NEVER
 * rendered while the real WebP artwork is loading, under a throttled network.
 *
 *   npm run build && node scripts/check-no-svg-flash.mjs [--profile fast3g|slow3g|none] [--shots <dir>] [--url <url>]
 *
 * Starts `vite preview` (unless --url), opens the game with the HTTP cache disabled and CDP network throttling, and
 * plays: boot splash -> title -> 開始遊戲 -> prologue -> W1 -> schedule -> board -> weekend -> report.
 * An in-page recorder (MutationObserver + requestAnimationFrame, so it sees every committed DOM state, not just a
 * 100ms sample) logs any SVG sprite / SVG background / SVG chibi / text-logo fallback. The Node side polls every
 * 100ms for screen transitions and takes screenshots at the interesting moments.
 *
 * Exit code 1 if any SVG art was ever rendered, the splash / loading overlay never showed, or the run never got
 * through a weekly cycle.
 */
import { execSync, spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { launchBrowser } from './lib/browser.mjs'

const args = process.argv.slice(2)
const opt = (name, dflt) => {
  const i = args.indexOf(name)
  return i === -1 ? dflt : args[i + 1]
}
const PROFILE = opt('--profile', 'fast3g')
const SHOTS = opt('--shots', `/tmp/seo-journey-flash-${PROFILE}`)
const PORT = 4188
mkdirSync(SHOTS, { recursive: true })

// bytes/s down, bytes/s up, ms RTT
const PROFILES = {
  none: null,
  fast3g: { downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8), uploadThroughput: Math.round((750 * 1024) / 8), latency: 150 },
  slow3g: { downloadThroughput: Math.round((400 * 1024) / 8), uploadThroughput: Math.round((400 * 1024) / 8), latency: 400 },
}
if (!(PROFILE in PROFILES)) throw new Error(`unknown --profile ${PROFILE}`)

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

/** Runs inside the page from document start. */
function installRecorder() {
  const rec = { violations: [], log: [], seen: {}, t0: performance.now() }
  window.__flash = rec
  const now = () => Math.round(performance.now() - rec.t0)
  let lastSig = ''
  const SELECTORS = {
    'svg-sprite': 'svg[viewBox="0 0 600 1000"]',
    'svg-background': 'linearGradient#sky-soft',
    'svg-chibi': 'svg[viewBox="0 0 792 202"]',
    'title-text-logo': '[data-testid="title"] h1.font-title',
  }
  function snapshot(source) {
    const d = document
    const splashEl = d.getElementById('boot-splash')
    const state = {
      splash: !!splashEl && !splashEl.classList.contains('boot-out'),
      overlay: !!d.querySelector('[data-testid="loading-overlay"]'),
      screen: d.querySelector('[data-testid="title"]')
        ? 'title'
        : d.querySelector('[data-testid="schedule-screen"]')
          ? 'schedule'
          : d.querySelector('[data-testid="schedule-playback"]')
            ? 'playback'
            : d.querySelector('[data-testid="notice-board"]')
              ? 'board'
              : d.querySelector('[data-testid="weekend-menu"]')
                ? 'weekend'
                : d.querySelector('[data-testid="weekly-report"]')
                  ? 'report'
                  : d.querySelector('[data-testid="vnstage"]')
                    ? 'vn'
                    : d.getElementById('root')?.childElementCount
                      ? 'app'
                      : 'none',
      imgs: d.querySelectorAll('img').length,
      imgsLoaded: [...d.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth > 0).length,
    }
    for (const [kind, sel] of Object.entries(SELECTORS)) {
      const n = d.querySelectorAll(sel).length
      if (n > 0) rec.violations.push({ t: now(), kind, count: n, source, screen: state.screen })
    }
    const sig = `${state.splash}|${state.overlay}|${state.screen}`
    if (sig !== lastSig) {
      lastSig = sig
      rec.log.push({ t: now(), ...state })
    }
    if (state.splash) rec.seen.splash = true
    if (state.overlay) rec.seen.overlay = true
    rec.seen[state.screen] = true
    rec.last = state
  }
  new MutationObserver(() => snapshot('mutation')).observe(document, { childList: true, subtree: true, attributes: true })
  const frame = () => {
    snapshot('frame')
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

/** Same solver as e2e/playthrough.mjs (the first week contains a minigame). */
async function solveMinigame(page) {
  const mg = page.locator('[data-testid="minigame"]')
  if (!(await mg.isVisible().catch(() => false))) return false

  // Quiz
  if (await page.locator('[data-testid="quiz-opt-0"]').isVisible().catch(() => false)) {
    while (await mg.isVisible().catch(() => false)) {
      if (await page.locator('[data-testid="minigame-done"]').isVisible().catch(() => false)) {
        await page.locator('[data-testid="minigame-done"]').click()
        return true
      }
      if (await page.locator('[data-testid="quiz-opt-0"]').isEnabled().catch(() => false)) {
        await page.locator('[data-testid="quiz-opt-0"]').click()
      }
      if (await page.locator('[data-testid="quiz-next"]').isEnabled().catch(() => false)) {
        await page.locator('[data-testid="quiz-next"]').click()
      }
      await page.waitForTimeout(30)
    }
    return true
  }

  // Serp
  if (await page.locator('[data-testid="serp-submit"]').isVisible().catch(() => false)) {
    await page.locator('[data-testid="serp-title-0"]').click()
    await page.locator('[data-testid="serp-desc-0"]').click()
    await page.locator('[data-testid="serp-submit"]').click()
    await page.locator('[data-testid="minigame-done"]').waitFor({ state: 'visible', timeout: 3000 })
    await page.locator('[data-testid="minigame-done"]').click()
    return true
  }

  // Spot
  if (await page.locator('[data-testid="spot-line-0"]').isVisible().catch(() => false)) {
    for (let i = 0; i < 30; i++) {
      if (await page.locator('[data-testid="spot-finish"]').isVisible().catch(() => false)) {
        await page.locator('[data-testid="spot-finish"]').click()
        break
      }
      const line = page.locator(`[data-testid="spot-line-${i}"]`)
      if ((await line.count()) === 0) break
      if (await line.isEnabled().catch(() => false)) await line.click()
      await page.waitForTimeout(20)
    }
    if (await page.locator('[data-testid="spot-finish"]').isVisible().catch(() => false)) {
      await page.locator('[data-testid="spot-finish"]').click()
    }
    await page.locator('[data-testid="minigame-done"]').waitFor({ state: 'visible', timeout: 3000 })
    await page.locator('[data-testid="minigame-done"]').click()
    return true
  }

  return false
}

async function main() {
  let server = null
  let url = opt('--url', null)
  if (!url) {
    const isWin = process.platform === 'win32'
    server = spawn(isWin ? 'npx.cmd' : 'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', shell: isWin, detached: !isWin })
    url = `http://localhost:${PORT}`
    await waitForServer(url)
  }

  const browser = await launchBrowser()
  let shotN = 0
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
    page.on('pageerror', (e) => consoleErrors.push(e.message))
    await page.addInitScript(installRecorder)

    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    const prof = PROFILES[PROFILE]
    if (prof) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...prof })

    const shot = async (label) => {
      const name = `${String(++shotN).padStart(3, '0')}-${label}.png`
      await page.screenshot({ path: join(SHOTS, name) }).catch(() => {})
      return name
    }
    const state = () => page.evaluate(() => window.__flash?.last ?? null).catch(() => null)
    const t0 = Date.now()
    const el = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`
    console.log(`profile=${PROFILE} shots=${SHOTS}`)

    // ---- boot: poll every 100ms, screenshot on every splash/overlay/screen change and at least every 1.5s ----
    await page.goto(url, { waitUntil: 'commit' })
    let lastSig = ''
    let lastShotAt = 0
    const watch = async (label) => {
      const s = await state()
      if (!s) return s
      const sig = `${s.splash}|${s.overlay}|${s.screen}`
      if (sig !== lastSig || Date.now() - lastShotAt > 1500) {
        if (sig !== lastSig) console.log(`  [${el()}] ${label}: splash=${s.splash} overlay=${s.overlay} screen=${s.screen} imgs=${s.imgsLoaded}/${s.imgs}`)
        lastSig = sig
        lastShotAt = Date.now()
        await shot(`${label}-${s.screen}${s.splash ? '-splash' : ''}${s.overlay ? '-loading' : ''}`)
      }
      return s
    }
    const until = async (cond, label, timeoutMs) => {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        const s = await watch(label)
        if (s && cond(s)) return s
        await page.waitForTimeout(100)
      }
      throw new Error(`timeout (${timeoutMs}ms) waiting for: ${label}; last state ${JSON.stringify(await state())}`)
    }

    await until((s) => s.screen === 'title' && !s.splash, 'boot', 60000)
    await page.locator('[data-testid="title-logo"]').waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForFunction(() => { const i = document.querySelector('[data-testid="title-logo"]'); return i && i.complete && i.naturalWidth > 0 }, null, { timeout: 30000 })
    await page.waitForTimeout(500)
    await shot('title-ready')

    // ---- new game -> prologue ----
    await page.getByRole('button', { name: '開始遊戲' }).click()
    await page.locator('#pname').fill('小測試')
    await page.locator('[data-testid="name-ok"]').click()
    await until((s) => s.screen === 'vn', 'start-prologue', 60000)
    await page.locator('[data-testid="dialogue"]').waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(600)
    await shot('prologue-first-line')

    // ---- play: prologue -> W1 -> schedule -> board -> weekend -> report (one weekly cycle) ----
    const reached = new Set()
    const deadline = Date.now() + 8 * 60 * 1000
    const visible = (id) => page.locator(`[data-testid="${id}"]`).isVisible().catch(() => false)
    while (Date.now() < deadline && !reached.has('report-done')) {
      await watch('play')
      if (await visible('schedule-screen')) {
        if (!reached.has('schedule')) {
          reached.add('schedule')
          await page.waitForTimeout(500)
          await shot('schedule')
        }
        await page.getByRole('button', { name: '推薦排程' }).click()
        await page.locator('[data-testid="schedule-go"]').click()
        await page.locator('[data-testid="schedule-playback"]').waitFor({ state: 'visible', timeout: 15000 })
        let first = true
        while (await visible('schedule-playback')) {
          if (first) {
            first = false
            await page.waitForTimeout(500)
            await shot('schedule-playback')
          }
          await page.locator('[data-testid="schedule-next"]').click()
          await page.waitForTimeout(40)
        }
        continue
      }
      if (await visible('notice-board')) {
        if (!reached.has('board')) {
          reached.add('board')
          await page.waitForTimeout(500)
          await shot('board')
        }
        await page.locator('[data-testid="skip-board"]').click()
        await page.locator('[data-testid="notice-board"]').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
        continue
      }
      if (await visible('weekend-menu')) {
        if (!reached.has('weekend')) {
          reached.add('weekend')
          await page.waitForTimeout(500)
          await shot('weekend')
        }
        const pick = (await page.locator('[data-testid="date-rin"]').isEnabled().catch(() => false)) ? 'date-rin' : 'weekend-rest'
        await page.locator(`[data-testid="${pick}"]`).click()
        await page.locator('[data-testid="weekend-menu"]').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
        continue
      }
      if (await visible('weekly-report')) {
        if (!reached.has('report')) {
          reached.add('report')
          await page.waitForTimeout(700)
          await shot('report')
        }
        reached.add('report-done')
        break
      }
      if (await visible('choices')) {
        if (!reached.has('choice')) {
          reached.add('choice')
          await page.waitForTimeout(300)
          await shot('choice')
        }
        await page.locator('[data-testid="choices"] button').first().click()
        continue
      }
      if (await solveMinigame(page)) continue
      if (await visible('dialogue')) {
        await page.keyboard.press(' ')
        await page.waitForTimeout(15)
        continue
      }
      await page.waitForTimeout(40)
    }
    await page.waitForTimeout(500)
    await shot('end')

    // ---- timings of the boot-critical files (when did the boot screen have everything it waits for?) ----
    const timings = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((r) => /\/assets\/index-.*\.js|manifest\.json|\/art\/(ui\/logo|bg\/gate|rin\/smile|hare\/happy|mirai\/smile)/.test(r.name))
        .map((r) => `${r.name.replace(location.origin, '')} responseEnd=${Math.round(r.responseEnd)}ms`),
    )
    console.log('boot-critical resource timings (ms since navigation start):\n  ' + timings.join('\n  '))

    // ---- verdict ----
    const rec = await page.evaluate(() => window.__flash)
    const failures = []
    if (rec.violations.length) {
      const sum = {}
      for (const v of rec.violations) sum[`${v.kind}@${v.screen}(${v.source})`] = (sum[`${v.kind}@${v.screen}(${v.source})`] ?? 0) + 1
      failures.push(`SVG art / text-logo fallback was rendered ${rec.violations.length}x: ${JSON.stringify(sum)} first at t=${rec.violations[0].t}ms`)
    }
    if (!rec.seen.splash) failures.push('boot splash was never visible')
    if (!rec.seen.overlay && PROFILE !== 'none') failures.push('loading overlay never appeared under throttling')
    for (const need of ['schedule', 'board', 'weekend', 'report-done']) if (!reached.has(need)) failures.push(`never reached ${need}`)
    if (!rec.seen.vn || !rec.seen.title) failures.push('title / vn screens not both seen')
    if (consoleErrors.length) failures.push(`console/page errors: ${consoleErrors.join(' | ')}`)

    writeFileSync(join(SHOTS, 'timeline.json'), JSON.stringify({ profile: PROFILE, seen: rec.seen, reached: [...reached], violations: rec.violations.slice(0, 50), log: rec.log }, null, 2))
    console.log('timeline (state changes):')
    for (const e of rec.log) console.log(`  t=${String(e.t).padStart(6)}ms splash=${e.splash} overlay=${e.overlay} screen=${e.screen}`)
    console.log(`seen: ${JSON.stringify(rec.seen)}; reached: ${[...reached].join(',')}; screenshots: ${shotN} in ${SHOTS}`)
    if (failures.length) {
      console.error('FAIL:\n - ' + failures.join('\n - '))
      process.exitCode = 1
    } else {
      console.log(`PASS (${PROFILE}): no SVG sprite/background/chibi/text-logo was ever rendered; splash and loading overlay shown; weekly cycle completed in ${el()}.`)
    }
  } finally {
    await browser.close()
    if (server?.pid) {
      try {
        if (process.platform === 'win32') execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' })
        else process.kill(-server.pid, 'SIGTERM')
      } catch {
        /* ignore */
      }
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
