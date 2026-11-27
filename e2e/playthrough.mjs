import { execSync, spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { launchBrowser } from '../scripts/lib/browser.mjs'

const args = process.argv.slice(2)
const usePreview = args.includes('--preview')
const urlArgIdx = args.indexOf('--url')
const shotArgIdx = args.indexOf('--shots')
const SHOTS_DIR = shotArgIdx !== -1 ? args[shotArgIdx + 1] : null
if (SHOTS_DIR) mkdirSync(SHOTS_DIR, { recursive: true })

async function shot(page, name) {
  if (!SHOTS_DIR) return
  await page.screenshot({ path: join(SHOTS_DIR, name) })
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function startViteServer(preview) {
  const port = 4177
  const cmdArgs = preview ? ['vite', 'preview', '--port', String(port), '--strictPort'] : ['vite', '--port', String(port), '--strictPort']
  const isWin = process.platform === 'win32'
  // detached on POSIX => own process group, so npx + vite can be stopped together.
  const child = spawn(isWin ? 'npx.cmd' : 'npx', cmdArgs, { stdio: 'ignore', shell: isWin, detached: !isWin })
  return { child, url: `http://localhost:${port}` }
}

function stopViteServer(child) {
  if (!child?.pid) return
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' })
    } else {
      process.kill(-child.pid, 'SIGTERM')
    }
  } catch {
    /* ignore */
  }
}

async function solveMinigame(page, captured) {
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
    if (!captured.serp) {
      await shot(page, 'minigame-serp.png')
      captured.serp = true
    }
    await page.locator('[data-testid="serp-title-0"]').click()
    await page.locator('[data-testid="serp-desc-0"]').click()
    await page.locator('[data-testid="serp-submit"]').click()
    await page.locator('[data-testid="minigame-done"]').waitFor({ state: 'visible', timeout: 3000 })
    await page.locator('[data-testid="minigame-done"]').click()
    return true
  }

  // Spot
  if (await page.locator('[data-testid="spot-line-0"]').isVisible().catch(() => false)) {
    if (!captured.spot) {
      await shot(page, 'minigame-spot.png')
      captured.spot = true
    }
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
  const baseUrl = urlArgIdx !== -1 ? args[urlArgIdx + 1] : null
  let targetUrl = baseUrl
  if (!targetUrl) {
    server = startViteServer(usePreview)
    targetUrl = server.url
    await waitForServer(targetUrl)
  }

  const browser = await launchBrowser()
  const consoleErrors = []
  const pageErrors = []
  const badResponses = []

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('response', (res) => {
      if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`)
    })

    // 1. Desktop gate check (< 1024px)
    await page.setViewportSize({ width: 900, height: 700 })
    await page.goto(targetUrl, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="desktop-gate"]').waitFor({ state: 'visible', timeout: 5000 })
    const gateText = await page.locator('[data-testid="desktop-gate"]').textContent()
    if (!gateText?.includes('請使用電腦遊玩')) throw new Error(`Unexpected desktop gate text: ${gateText}`)

    // 2. 1920x1080 Title screenshot
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.locator('[data-testid="title"]').waitFor({ state: 'visible', timeout: 5000 })
    await shot(page, 'title-1920.png')

    // 3. 1280x720 Title, Settings, Gallery check
    await page.setViewportSize({ width: 1280, height: 720 })
    await shot(page, 'title-1280.png')

    await page.getByRole('button', { name: '設定' }).click()
    await page.getByRole('button', { name: '返回' }).click()

    await page.getByRole('button', { name: '圖鑑・相簿' }).click()
    await page.locator('[data-testid="gallery-modal"]').waitFor({ state: 'visible', timeout: 5000 })
    await shot(page, 'gallery-cards.png')
    await page.locator('[data-testid="tab-cg"]').click()
    await page.locator('[data-testid="tab-endings"]').click()
    await page.locator('[data-testid="tab-practice"]').click()
    await page.locator('[data-testid="gallery-close"]').click()

    // 4. Start new game
    await page.getByRole('button', { name: '開始遊戲' }).click()
    await page.locator('#pname').fill('小測試')
    await page.locator('[data-testid="name-ok"]').click()
    await page.locator('[data-testid="vnstage"]').waitFor({ state: 'visible', timeout: 5000 })

    // 5. Full playthrough loop
    const captured = {
      prologue: false,
      choice: false,
      spot: false,
      serp: false,
      schedule: false,
      playback: false,
      playback2: false,
      board: false,
      weekend: false,
      status: false,
      report: false,
      saveTested: false,
    }

    const startTime = Date.now()
    // Generous overall limit (software rendering of the real art can be slow on busy machines), but a
    // dialogue line that stays unchanged for 20s is a real hang and fails with a diagnostic.
    let lastLine = ''
    let lastLineChange = Date.now()
    while (Date.now() - startTime < 420000) {
      const lineNow = await page.locator('[data-testid="dialogue-text"]').innerText({ timeout: 50 }).catch(() => '')
      if (lineNow !== lastLine) {
        lastLine = lineNow
        lastLineChange = Date.now()
      } else if (lineNow && Date.now() - lastLineChange > 20000) {
        await shot(page, 'stuck.png')
        throw new Error(`Playthrough stuck on dialogue line for 20s: ${JSON.stringify(lineNow)}`)
      }

      if (await page.locator('[data-testid="ending-screen"]').isVisible().catch(() => false)) {
        await page.waitForTimeout(200)
        await shot(page, 'ending-cg.png')
        // the 「只看 CG」 toggle hides the report, then restores it
        await page.locator('[data-testid="ending-toggle-report"]').click()
        await page.waitForTimeout(450)
        await shot(page, 'ending-cg-only.png')
        await page.locator('[data-testid="ending-toggle-report"]').click()
        await page.locator('[data-testid="ending-to-title"]').waitFor({ state: 'visible', timeout: 3000 })
        break
      }

      if (await page.locator('[data-testid="schedule-screen"]').isVisible().catch(() => false)) {
        const snapFilled = !captured.schedule
        if (!captured.schedule) {
          await shot(page, 'schedule-ui.png')
          captured.schedule = true
        }
        await page.getByRole('button', { name: '推薦排程' }).click()
        if (snapFilled) {
          await page.waitForTimeout(100)
          await shot(page, 'schedule-filled.png')
        }
        await page.locator('[data-testid="schedule-go"]').click()
        await page.locator('[data-testid="schedule-playback"]').waitFor({ state: 'visible', timeout: 3000 })
        let stepCount = 0
        while (await page.locator('[data-testid="schedule-playback"]').isVisible().catch(() => false)) {
          if (stepCount === 0 && !captured.playback) {
            await page.waitForTimeout(260)
            await shot(page, 'schedule-playback.png')
            captured.playback = true
          } else if (stepCount === 1 && !captured.playback2) {
            await page.waitForTimeout(260)
            await shot(page, 'schedule-playback-2.png')
            captured.playback2 = true
          }
          await page.locator('[data-testid="schedule-next"]').click()
          await page.waitForTimeout(25)
          stepCount++
        }
        continue
      }

      if (await page.locator('[data-testid="notice-board"]').isVisible().catch(() => false)) {
        if (!captured.board) {
          await page.waitForTimeout(160)
          await shot(page, 'notice-board.png')
          captured.board = true
        }
        await page.locator('[data-testid="skip-board"]').click()
        await page.locator('[data-testid="notice-board"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
        continue
      }

      if (await page.locator('[data-testid="weekend-menu"]').isVisible().catch(() => false)) {
        if (!captured.weekend) {
          await page.waitForTimeout(200)
          await shot(page, 'weekend-menu.png')
          captured.weekend = true
        }
        await page.locator('[data-testid="date-rin"]').click()
        await page.locator('[data-testid="weekend-menu"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
        continue
      }

      if (await page.locator('[data-testid="weekly-report"]').isVisible().catch(() => false)) {
        if (!captured.report) {
          await page.waitForTimeout(450)
          await shot(page, 'weekly-report.png')
          captured.report = true
        }
        await page.locator('[data-testid="report-next"]').click()
        await page.locator('[data-testid="weekly-report"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
        continue
      }

      if (await solveMinigame(page, captured)) continue

      if (await page.locator('[data-testid="choices"]').isVisible().catch(() => false)) {
        if (!captured.choice) {
          await page.waitForTimeout(180)
          await shot(page, 'choice-menu.png')
          captured.choice = true
        }
        await page.locator('[data-testid="choices"] button').first().click()
        continue
      }

      if (await page.locator('[data-testid="dialogue"]').isVisible().catch(() => false)) {
        if (!captured.prologue) {
          for (let k = 0; k < 4; k++) {
            await page.keyboard.press(' ')
            await page.waitForTimeout(40)
            await page.keyboard.press(' ')
            await page.waitForTimeout(30)
          }
          await shot(page, 'prologue-dialogue.png')
          captured.prologue = true
        }

        if (!captured.status) {
          await page.getByRole('button', { name: '狀態' }).click()
          await page.waitForTimeout(150)
          await shot(page, 'status-radar.png')
          await page.getByRole('button', { name: '關閉' }).click()
          captured.status = true
        }

        if (!captured.saveTested && captured.schedule) {
          await page.keyboard.press('Escape')
          await page.getByRole('button', { name: '存檔' }).click()
          await page.locator('[data-testid="slot-1"]').click()
          await page.reload({ waitUntil: 'networkidle' })
          await page.getByRole('button', { name: '讀檔' }).click()
          await page.locator('[data-testid="slot-1"]').click()
          await page.locator('[data-testid="vnstage"]').waitFor({ state: 'visible', timeout: 5000 })
          captured.saveTested = true
          continue
        }

        await page.keyboard.press(' ')
        await page.waitForTimeout(10)
        continue
      }

      await page.waitForTimeout(25)
    }

    if (!(await page.locator('[data-testid="ending-screen"]').isVisible().catch(() => false))) {
      throw new Error('Playthrough did not reach ending-screen within timeout!')
    }
    if (!captured.saveTested) throw new Error('Save/reload verification did not run!')

    await page.locator('[data-testid="ending-to-title"]').click()
    await page.locator('[data-testid="title"]').waitFor({ state: 'visible', timeout: 5000 })
    await page.getByRole('button', { name: '圖鑑・相簿' }).click()
    await page.locator('[data-testid="tab-endings"]').click()
    const endingsText = await page.locator('[data-testid="gallery-modal"]').textContent()
    if (!endingsText?.includes('已達成')) throw new Error('Expected unlocked ending badge in Gallery!')
    await page.locator('[data-testid="tab-cg"]').click()
    await page.locator('[data-testid="gallery-close"]').click()

    if (badResponses.length > 0) throw new Error(`HTTP errors: ${badResponses.join(' | ')}`)
    if (consoleErrors.length > 0) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`)
    if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join(' | ')}`)

    console.log('E2E PLAYTHROUGH PASSED: desktop-gate, 1920x1080, 1280x720, gallery, save/reload, full W0-W6 -> festival -> ending, 0 console/page/HTTP errors.')
  } finally {
    await browser.close()
    stopViteServer(server?.child)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
