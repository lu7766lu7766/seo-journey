import { preloadBootArt } from './art/preload'
import { TITLE_ART } from './art/specs'

const SPLASH_ID = 'boot-splash'

/**
 * Runs before React renders: waits (at most `BOOT_TIMEOUT_MS`) for the art manifest and the title screen's images,
 * so the first frame the player sees already shows the real artwork. Never throws or hangs: on timeout / failure
 * the game simply starts and the usual fallbacks apply.
 */
export async function waitForBootAssets(): Promise<void> {
  try {
    await preloadBootArt(TITLE_ART)
  } catch {
    /* start anyway */
  }
}

/** Move the splash out of #root (React is about to replace its contents) so it can fade out on top of the app. */
export function detachSplash(): HTMLElement | null {
  const el = document.getElementById(SPLASH_ID)
  if (el) document.body.appendChild(el)
  return el
}

export function fadeOutSplash(el: HTMLElement | null) {
  if (!el) return
  const remove = () => el.remove()
  el.classList.add('boot-out')
  el.addEventListener('transitionend', remove, { once: true })
  setTimeout(remove, 800)
}
