import { useCallback, useEffect, useState } from 'react'
import { trackAssetLoading } from './loading'
import { useArtManifest } from './manifest'
import { imageCache, preloadSpec, SCENE_PRELOAD_TIMEOUT_MS } from './preload'
import { specUrls, type ArtSpec } from './sceneAssets'

/**
 * Load state of one `<img>`. Spread `imgProps` on the element; `loaded` is false until the bytes are in
 * (instantly true if the URL was preloaded), `failed` after an error (callers then fall back to SVG).
 */
export function useArtImage(src: string | null) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  // set when the shared cache says "loaded" but this very <img> element is still fetching (e.g. HTTP cache disabled)
  const [staleSrc, setStaleSrc] = useState<string | null>(null)
  const loaded = !!src && (loadedSrc === src || (imageCache.isLoaded(src) && staleSrc !== src))
  const failed = !!src && failedSrc === src

  const ref = useCallback(
    (el: HTMLImageElement | null) => {
      // cached images can finish before React attaches onLoad
      if (!el || !src) return
      if (el.complete && el.naturalWidth > 0) {
        imageCache.markLoaded(src)
        setLoadedSrc(src)
      } else if (imageCache.isLoaded(src)) {
        setStaleSrc(src)
      }
    },
    [src],
  )
  const onLoad = useCallback(() => {
    if (!src) return
    imageCache.markLoaded(src)
    setLoadedSrc(src)
  }, [src])
  const onError = useCallback(() => setFailedSrc(src), [src])

  return { loaded, failed, imgProps: { ref, onLoad, onError } }
}

/**
 * Show `value`, but when it changes keep showing the previous value until `urlsOf(value)` are loaded (capped at
 * 4s). Used for expression / background changes so a not-yet-downloaded image never shows as a blank flash.
 */
export function useAfterPreload<T>(value: T, keyOf: (v: T) => string, urlsOf: (v: T) => string[]): T {
  const [shown, setShown] = useState(value)
  const key = keyOf(value)
  const urls = urlsOf(value)
  const ready = urls.every((u) => imageCache.isLoaded(u))

  useEffect(() => {
    if (keyOf(shown) === key) return
    if (ready) {
      setShown(value)
      return
    }
    let cancelled = false
    void imageCache.preloadAll(urls, SCENE_PRELOAD_TIMEOUT_MS).then(() => {
      if (!cancelled) setShown(value)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return ready ? value : shown
}

/**
 * Gate for a whole screen: `ready` once every image of `spec` is in the cache (capped at 4s). If it has to wait
 * longer than 200ms the shared "讀取中…" overlay appears. `waited` tells the caller to play a fade-in.
 */
export function useArtReady(spec: ArtSpec) {
  const manifest = useArtManifest()
  const urls = specUrls(manifest, spec)
  const [ready, setReady] = useState(() => urls.every((u) => imageCache.isLoaded(u)))
  const [waited, setWaited] = useState(false)

  useEffect(() => {
    if (ready) return
    let cancelled = false
    setWaited(true)
    void trackAssetLoading(preloadSpec(spec)).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ready, waited }
}
