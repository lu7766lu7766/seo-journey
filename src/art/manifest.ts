import { useSyncExternalStore } from 'react'

/**
 * `public/art/manifest.json` lists which PNG overrides exist (so we never probe with 404 requests).
 * Keys: `<charId>/<face>` for sprites -> /art/<charId>/<face>.png ; `bg/<bgId>` for backgrounds -> /art/bg/<bgId>.png.
 * Values: `true` (or any truthy). Default `{}`.
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
