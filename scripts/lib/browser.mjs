import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

/** Chromium executables inside a Playwright browsers folder (newest revision first). */
function playwrightCachedChromes(root) {
  if (!root || !existsSync(root)) return []
  const rel =
    process.platform === 'win32'
      ? ['chrome-win', 'chrome.exe']
      : process.platform === 'darwin'
        ? ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium']
        : ['chrome-linux64', 'chrome']
  return readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    .map((d) => join(root, d, ...rel))
}

function systemChromes() {
  if (process.platform === 'win32') {
    return [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ]
  }
  return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']
}

/**
 * Order: $CHROME_PATH -> Playwright's own default chromium -> any chromium already present in the
 * Playwright browsers folder ($PLAYWRIGHT_BROWSERS_PATH, /opt/pw-browsers, ~/.cache/ms-playwright)
 * -> system Chrome/Edge (Windows, macOS, Linux paths).
 */
export function findBrowserExecutable() {
  const candidates = []
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH)
  try {
    candidates.push(chromium.executablePath())
  } catch {
    /* no default revision installed */
  }
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', join(homedir(), '.cache', 'ms-playwright')]) {
    candidates.push(...playwrightCachedChromes(root))
  }
  candidates.push(...systemChromes())
  const found = candidates.find((p) => p && existsSync(p))
  if (!found) throw new Error('No Chrome/Chromium/Edge found. Set CHROME_PATH to a browser executable.')
  return found
}

export async function launchBrowser() {
  // --no-sandbox is required when running as root inside containers / CI on Linux.
  return chromium.launch({
    executablePath: findBrowserExecutable(),
    headless: true,
    args: process.platform === 'linux' ? ['--no-sandbox'] : [],
  })
}
