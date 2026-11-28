import { useSyncExternalStore } from 'react'

/**
 * `public/art/manifest.json` lists which image overrides exist (so we never probe with 404 requests).
 * Keys: `<charId>/<face>` (sprite), `bg/<bgId>` (background), `cg/<cgId>` (event CG).
 * Values: the URL string written by scripts/process-art.mjs (e.g. "/art/rin/blush.webp"); a bare `true`
 * is still accepted and means `/art/<key>.png`. Default `{}`. See src/art/resolve.ts and docs/art-requests.md.
 *
 * The manifest is fetched once. Until it has settled (`status === 'loading'`) art components must NOT fall back to
 * the programmatic SVG art (that is what caused the "SVG flash" before the real artwork appeared); they render a
 * dark placeholder instead. Only a settled manifest ('ready' / 'failed') with no matching entry means "use SVG".
 */
export type ArtManifest = Record<string, unknown>
export type ArtManifestStatus = 'loading' | 'ready' | 'failed'

/** The fetch is aborted after this long so `status` always settles (the boot screen gives up earlier, see boot.ts). */
export const MANIFEST_FETCH_TIMEOUT_MS = 8000

let manifest: ArtManifest = {}
let status: ArtManifestStatus = 'loading'
let pending: Promise<ArtManifest> | null = null
const subs = new Set<() => void>()

function settle(next: ArtManifest, nextStatus: ArtManifestStatus) {
  manifest = next
  status = nextStatus
  subs.forEach((f) => f())
}

async function fetchManifest(): Promise<ArtManifest> {
  const ctrl = typeof AbortController === 'undefined' ? null : new AbortController()
  const timer = ctrl ? setTimeout(() => ctrl.abort(), MANIFEST_FETCH_TIMEOUT_MS) : undefined
  try {
    const r = await fetch('/art/manifest.json', ctrl ? { signal: ctrl.signal } : undefined)
    const j: unknown = r.ok ? await r.json() : null
    if (j && typeof j === 'object' && !Array.isArray(j)) {
      settle(j as ArtManifest, 'ready')
    } else {
      settle({}, 'failed')
    }
  } catch {
    settle({}, 'failed')
  } finally {
    clearTimeout(timer)
  }
  return manifest
}

/** Start (once) and await the manifest. Never rejects: on failure it resolves `{}` and `status` becomes 'failed'. */
export function loadArtManifest(): Promise<ArtManifest> {
  pending ??= fetchManifest()
  return pending
}

export const getArtManifest = (): ArtManifest => manifest
export const getArtManifestStatus = (): ArtManifestStatus => status

/** Test helper: forget everything so the next `loadArtManifest()` fetches again. */
export function resetArtManifestForTests() {
  manifest = {}
  status = 'loading'
  pending = null
}

const subscribe = (cb: () => void) => (subs.add(cb), () => void subs.delete(cb))

export function useArtManifest(): ArtManifest {
  void loadArtManifest()
  return useSyncExternalStore(subscribe, getArtManifest)
}

export function useArtManifestStatus(): ArtManifestStatus {
  void loadArtManifest()
  return useSyncExternalStore(subscribe, getArtManifestStatus)
}
