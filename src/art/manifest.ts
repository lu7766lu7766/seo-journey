import { useSyncExternalStore } from 'react'

/**
 * `public/art/manifest.json` lists which image overrides exist (so we never probe with 404 requests).
 * Keys: `<charId>/<face>` (sprite), `bg/<bgId>` (background), `cg/<cgId>` (event CG).
 * Values: the URL string written by scripts/process-art.mjs (e.g. "/art/rin/blush.webp"); a bare `true`
 * is still accepted and means `/art/<key>.png`. Default `{}`. See src/art/resolve.ts and docs/art-requests.md.
 */
export type ArtManifest = Record<string, unknown>

let manifest: ArtManifest = {}
let started = false
const subs = new Set<() => void>()

function load() {
  if (started) return
  started = true
  fetch('/art/manifest.json')
    .then((r) => (r.ok ? r.json() : {}))
    .then((j) => {
      if (j && typeof j === 'object') {
        manifest = j as ArtManifest
        subs.forEach((f) => f())
      }
    })
    .catch(() => {})
}

export function useArtManifest(): ArtManifest {
  load()
  return useSyncExternalStore(
    (cb) => (subs.add(cb), () => void subs.delete(cb)),
    () => manifest,
  )
}
