/**
 * Image preload cache. Pure logic (the actual loading is injected) so it can be unit tested without a DOM.
 * A URL is only ever downloaded once: finished URLs live in `done`, running ones in `inflight`.
 */
export type ImageLoader = (url: string) => Promise<boolean>

export interface ImageCache {
  /** has this URL been fully loaded (and decoded) before? */
  isLoaded: (url: string) => boolean
  markLoaded: (url: string) => void
  /** load once; resolves (never rejects) with whether the image loaded. Concurrent calls share one load. */
  preload: (url: string) => Promise<boolean>
  /** preload many; resolves when all have settled, or after `timeoutMs` (whichever first). `true` = all settled in time. */
  preloadAll: (urls: readonly string[], timeoutMs: number) => Promise<boolean>
  reset: () => void
}

export function createImageCache(load: ImageLoader): ImageCache {
  const done = new Set<string>()
  const inflight = new Map<string, Promise<boolean>>()

  const preload = (url: string): Promise<boolean> => {
    if (done.has(url)) return Promise.resolve(true)
    const running = inflight.get(url)
    if (running) return running
    const p = load(url)
      .catch(() => false)
      .then((ok) => {
        inflight.delete(url)
        if (ok) done.add(url)
        return ok
      })
    inflight.set(url, p)
    return p
  }

  const preloadAll = (urls: readonly string[], timeoutMs: number): Promise<boolean> => {
    const unique = [...new Set(urls)].filter((u) => !done.has(u))
    if (unique.length === 0) return Promise.resolve(true)
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs)
      void Promise.all(unique.map(preload)).then(() => {
        clearTimeout(timer)
        resolve(true)
      })
    })
  }

  return {
    isLoaded: (url) => done.has(url),
    markLoaded: (url) => void done.add(url),
    preload,
    preloadAll,
    reset: () => {
      done.clear()
      inflight.clear()
    },
  }
}

/** Browser loader: downloads and decodes off the main paint path so the later `<img>` shows instantly. */
export const domImageLoader: ImageLoader = (url) => {
  if (typeof Image === 'undefined') return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onerror = () => resolve(false)
    img.src = url
    if (typeof img.decode === 'function') {
      img.decode().then(
        () => resolve(true),
        () => resolve(false),
      )
    } else {
      img.onload = () => resolve(true)
    }
  })
}
