import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createImageCache } from '../src/art/imageCache'
import { LOADING_OVERLAY_DELAY_MS, resetAssetLoadingForTests, trackAssetLoading, useAssetLoading } from '../src/art/loading'
import { getArtManifestStatus, loadArtManifest, resetArtManifestForTests } from '../src/art/manifest'
import { collectSceneSpec, sceneImageUrls, specUrls } from '../src/art/sceneAssets'
import { BOARD_ART, SCHEDULE_ART, TITLE_ART } from '../src/art/specs'
import { bg, cg, choice, hide, opt, say, scene, show, when } from '../src/engine/dsl'
import { initialStage } from '../src/engine/stage'

const M = {
  'bg/clubroom': '/art/bg/clubroom.webp',
  'bg/gate': '/art/bg/gate.webp',
  'bg/rooftop': '/art/bg/rooftop.webp',
  'bg/street': '/art/bg/street.webp',
  'rin/normal': '/art/rin/normal.webp',
  'rin/smile': '/art/rin/smile.webp',
  'rin/blush': '/art/rin/blush.webp',
  'hare/normal': '/art/hare/normal.webp',
  'hare/happy': '/art/hare/happy.webp',
  'sensei/normal': '/art/sensei/normal.webp',
  'sensei/smile': '/art/sensei/smile.webp',
  'cg/end-true': '/art/cg/end-true.webp',
  'ui/logo': '/art/ui/logo.webp',
}

describe('collectSceneSpec / sceneImageUrls', () => {
  it('collects bg (ignoring time), shown sprites with faces, say faces and CGs', () => {
    const s = scene('t', [
      bg('clubroom', 'day'),
      bg('clubroom', 'night'),
      show('rin', 'left', 'smile'),
      show('hare'),
      say('rin', 'blush', 'hi'),
      say('me', undefined, 'no face'),
      say('narr', 'smile' as never, 'narrator never has a sprite'),
      hide('all'),
      cg('end-true'),
      cg('none'),
    ])
    const spec = collectSceneSpec(s.cmds)
    expect(spec.bg).toEqual(['clubroom'])
    expect(spec.sprites).toEqual([['rin', 'smile'], ['hare', 'normal'], ['rin', 'blush']])
    expect(spec.cg).toEqual(['end-true'])
    expect(sceneImageUrls(M, s.cmds)).toEqual([
      '/art/bg/clubroom.webp',
      '/art/rin/smile.webp',
      '/art/hare/normal.webp',
      '/art/rin/blush.webp',
      '/art/cg/end-true.webp',
    ])
  })

  it('recurses into both if branches and every choice option (nested)', () => {
    const s = scene('t', [
      when(
        { t: 'flag', key: 'x' },
        [bg('rooftop'), show('rin', 'left', 'smile')],
        [bg('street'), when({ t: 'flag', key: 'y' }, [say('hare', 'happy', 'deep')])],
      ),
      choice([
        opt('a', undefined, [bg('gate')]),
        opt('b', undefined, [choice([opt('c', undefined, [show('sensei', 'right', 'smile')])])]),
        opt('d'),
      ]),
    ])
    const spec = collectSceneSpec(s.cmds)
    expect([...spec.bg].sort()).toEqual(['gate', 'rooftop', 'street'])
    expect(spec.sprites).toContainEqual(['rin', 'smile'])
    expect(spec.sprites).toContainEqual(['hare', 'happy'])
    expect(spec.sprites).toContainEqual(['sensei', 'smile'])
  })

  it('applies the sprite face fallback (missing face -> borrowed image) and dedupes shared files', () => {
    // rin/happy has no image of its own: resolveSpriteSrc borrows rin/smile, which is also shown directly
    const s = scene('t', [show('rin', 'left', 'smile'), say('rin', 'happy', 'x'), say('rin', 'angry', 'y')])
    // angry has no image and no fallback entry -> falls back to normal
    expect(sceneImageUrls(M, s.cmds)).toEqual(['/art/rin/smile.webp', '/art/rin/normal.webp'])
  })

  it('returns nothing for entries the manifest does not list (SVG-only art)', () => {
    expect(sceneImageUrls({}, [bg('clubroom'), show('rin', 'left', 'smile'), cg('end-true')])).toEqual([])
  })

  it('puts the current stage first when resuming a save', () => {
    const stage = { ...initialStage(), bg: { id: 'gate' as const, time: 'day' as const }, chars: { center: { who: 'rin' as const, face: 'smile' as const } } }
    expect(sceneImageUrls(M, [bg('clubroom')], stage)).toEqual(['/art/bg/gate.webp', '/art/rin/smile.webp', '/art/bg/clubroom.webp'])
  })

  it('resolves screen specs from the real manifest shape', () => {
    expect(specUrls(M, TITLE_ART)).toEqual(['/art/bg/gate.webp', '/art/rin/smile.webp', '/art/hare/happy.webp', '/art/ui/logo.webp'])
    expect(specUrls(M, BOARD_ART)).toEqual(['/art/rin/normal.webp', '/art/hare/normal.webp', '/art/sensei/normal.webp'])
    expect(specUrls(M, SCHEDULE_ART)).toContain('/art/bg/clubroom.webp')
  })
})

describe('createImageCache', () => {
  it('downloads each URL once, even when requested concurrently or again later', async () => {
    const load = vi.fn(async () => true)
    const cache = createImageCache(load)
    const [a, b] = await Promise.all([cache.preload('/a.webp'), cache.preload('/a.webp')])
    expect([a, b]).toEqual([true, true])
    await cache.preload('/a.webp')
    await cache.preloadAll(['/a.webp', '/b.webp', '/b.webp'], 1000)
    expect(load.mock.calls.map((c) => (c as unknown as [string])[0])).toEqual(['/a.webp', '/b.webp'])
    expect(cache.isLoaded('/a.webp')).toBe(true)
    expect(cache.isLoaded('/zzz.webp')).toBe(false)
  })

  it('does not cache failures (retried next time) and never rejects', async () => {
    const load = vi.fn<(u: string) => Promise<boolean>>()
    load.mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce(false).mockResolvedValue(true)
    const cache = createImageCache(load)
    expect(await cache.preload('/x')).toBe(false)
    expect(await cache.preload('/x')).toBe(false)
    expect(cache.isLoaded('/x')).toBe(false)
    expect(await cache.preload('/x')).toBe(true)
    expect(cache.isLoaded('/x')).toBe(true)
  })

  describe('preloadAll timeout', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('gives up after the cap while slow images keep loading in the background', async () => {
      let finish!: (ok: boolean) => void
      const cache = createImageCache((u) => (u === '/slow' ? new Promise<boolean>((r) => (finish = r)) : Promise.resolve(true)))
      const p = cache.preloadAll(['/fast', '/slow'], 4000)
      await vi.advanceTimersByTimeAsync(3999)
      let settled = false
      void p.then(() => (settled = true))
      await vi.advanceTimersByTimeAsync(0)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(await p).toBe(false)
      expect(cache.isLoaded('/fast')).toBe(true)
      expect(cache.isLoaded('/slow')).toBe(false)
      finish(true)
      await vi.advanceTimersByTimeAsync(0)
      expect(cache.isLoaded('/slow')).toBe(true)
    })

    it('resolves immediately when everything is already cached', async () => {
      const cache = createImageCache(async () => true)
      await cache.preload('/a')
      expect(await cache.preloadAll(['/a'], 4000)).toBe(true)
    })
  })
})

describe('trackAssetLoading (loading overlay)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetAssetLoadingForTests()
  })
  afterEach(() => {
    vi.useRealTimers()
    resetAssetLoadingForTests()
  })

  it('stays hidden when the work finishes within 200ms', async () => {
    const p = trackAssetLoading(new Promise<void>((r) => setTimeout(r, LOADING_OVERLAY_DELAY_MS - 50)))
    await vi.advanceTimersByTimeAsync(LOADING_OVERLAY_DELAY_MS - 50)
    await p
    await vi.advanceTimersByTimeAsync(1000)
    expect(useAssetLoading.getState()).toEqual({ pending: 0, visible: false })
  })

  it('shows after 200ms and hides when the work is done', async () => {
    const p = trackAssetLoading(new Promise<void>((r) => setTimeout(r, 1000)))
    await vi.advanceTimersByTimeAsync(LOADING_OVERLAY_DELAY_MS + 1)
    expect(useAssetLoading.getState().visible).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    await p
    expect(useAssetLoading.getState()).toEqual({ pending: 0, visible: false })
  })

  it('counts concurrent work and hides only when all of it is done (also on failure)', async () => {
    let end1!: () => void
    const p1 = trackAssetLoading(new Promise<void>((r) => (end1 = r)))
    let fail2!: (e: Error) => void
    const p2 = trackAssetLoading(new Promise<void>((_, rej) => (fail2 = rej)))
    await vi.advanceTimersByTimeAsync(LOADING_OVERLAY_DELAY_MS + 1)
    expect(useAssetLoading.getState()).toEqual({ pending: 2, visible: true })
    end1()
    await p1
    expect(useAssetLoading.getState()).toEqual({ pending: 1, visible: true })
    fail2(new Error('x'))
    await expect(p2).rejects.toThrow('x')
    expect(useAssetLoading.getState()).toEqual({ pending: 0, visible: false })
  })
})

describe('art manifest loader', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetArtManifestForTests()
  })

  it('stays "loading" until fetched, resolves the manifest once and shares the request', async () => {
    resetArtManifestForTests()
    expect(getArtManifestStatus()).toBe('loading')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(M), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const [a, b] = await Promise.all([loadArtManifest(), loadArtManifest()])
    expect(a).toEqual(M)
    expect(b).toBe(a)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(getArtManifestStatus()).toBe('ready')
  })

  it('resolves {} (never rejects) and reports "failed" on a network error or a bad body', async () => {
    resetArtManifestForTests()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    expect(await loadArtManifest()).toEqual({})
    expect(getArtManifestStatus()).toBe('failed')

    resetArtManifestForTests()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 200 })))
    expect(await loadArtManifest()).toEqual({})
    expect(getArtManifestStatus()).toBe('failed')

    resetArtManifestForTests()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })))
    expect(await loadArtManifest()).toEqual({})
    expect(getArtManifestStatus()).toBe('failed')
  })
})
