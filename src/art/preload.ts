import type { Cmd, StageState } from '@/engine/types'
import { createImageCache, domImageLoader } from './imageCache'
import { trackAssetLoading } from './loading'
import { loadArtManifest } from './manifest'
import { sceneImageUrls, specUrls, type ArtSpec } from './sceneAssets'
import { SIM_SCREEN_ARTS } from './specs'

/** App-wide cache: a URL is downloaded + decoded once, ever. */
export const imageCache = createImageCache(domImageLoader)

/** Max time the boot screen waits for the manifest + title art before entering anyway. */
export const BOOT_TIMEOUT_MS = 6000
/** Max time a scene change (or sim screen) waits for its artwork before carrying on (late images fade in). */
export const SCENE_PRELOAD_TIMEOUT_MS = 4000

const hasDom = () => typeof window !== 'undefined' && typeof Image !== 'undefined'

function timeoutAfter<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms)
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      () => (clearTimeout(t), resolve(fallback)),
    )
  })
}

/** Resolve `urlsFor(manifest)` once the manifest is known, then preload within the shared deadline. */
async function preloadWithManifest(urlsFor: (m: Record<string, unknown>) => string[], timeoutMs: number) {
  const started = Date.now()
  const manifest = await timeoutAfter(loadArtManifest(), timeoutMs, null)
  if (!manifest) return false
  const left = Math.max(0, timeoutMs - (Date.now() - started))
  return imageCache.preloadAll(urlsFor(manifest), left)
}

/** Boot: manifest + title art, hard-capped so a slow / failed network can never hang the splash screen. */
export function preloadBootArt(spec: ArtSpec, timeoutMs = BOOT_TIMEOUT_MS) {
  if (!hasDom()) return Promise.resolve(false)
  return preloadWithManifest((m) => specUrls(m, spec), timeoutMs)
}

/** Before a scene starts: every bg / sprite (+face) / CG it can show. Shows the small loading overlay if slow (>200ms). */
export function preloadSceneArt(cmds: readonly Cmd[], stage?: StageState, timeoutMs = SCENE_PRELOAD_TIMEOUT_MS) {
  if (!hasDom()) return Promise.resolve(false)
  return trackAssetLoading(preloadWithManifest((m) => sceneImageUrls(m, cmds, stage), timeoutMs))
}

/** A non-script screen's artwork (schedule, board, ...). Not tracked here: `useArtReady` drives the overlay. */
export function preloadSpec(spec: ArtSpec, timeoutMs = SCENE_PRELOAD_TIMEOUT_MS) {
  if (!hasDom()) return Promise.resolve(false)
  return preloadWithManifest((m) => specUrls(m, spec), timeoutMs)
}

let warmed = false
/** Once, after the first scene: quietly fetch the schedule / board / weekend / report art so those screens open instantly. */
export function warmSimScreenArt() {
  if (warmed || !hasDom()) return
  warmed = true
  setTimeout(() => {
    for (const spec of SIM_SCREEN_ARTS) void preloadSpec(spec, 30000)
  }, 1200)
}
