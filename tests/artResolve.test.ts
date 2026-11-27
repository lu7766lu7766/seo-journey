import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { activityBannerName, resolveBgSrc, resolveCgSrc, resolveSpriteSrc, resolveUiSrc } from '../src/art/resolve'
import { ACTIVITY_IDS } from '../src/content/activityIds'
import { BG_IDS } from '../src/content/backgrounds'
import { SPRITE_IDS, FACES } from '../src/content/characters'
import { CG_IDS } from '../src/content/cgs'

describe('art manifest resolution', () => {
  it('returns null (SVG fallback) when the manifest is empty', () => {
    expect(resolveSpriteSrc({}, 'rin', 'blush')).toBeNull()
    expect(resolveBgSrc({}, 'street')).toBeNull()
    expect(resolveCgSrc({}, 'end-true')).toBeNull()
  })

  it('uses an exact per-face image without the emoji overlay', () => {
    const m = { 'rin/normal': '/art/rin/normal.webp', 'rin/blush': '/art/rin/blush.webp' }
    expect(resolveSpriteSrc(m, 'rin', 'blush')).toEqual({ src: '/art/rin/blush.webp', exact: true })
  })

  it('falls back to normal (with overlay) when the face image is missing', () => {
    const m = { 'rin/normal': '/art/rin/normal.webp' }
    expect(resolveSpriteSrc(m, 'rin', 'angry')).toEqual({ src: '/art/rin/normal.webp', exact: false })
    expect(resolveSpriteSrc(m, 'rin', 'normal')).toEqual({ src: '/art/rin/normal.webp', exact: true })
  })

  it('honours the sensei / kuro face fallbacks before normal', () => {
    const m = { 'sensei/normal': '/s/n.webp', 'sensei/smile': '/s/smile.webp', 'kuro/normal': '/k/n.webp', 'kuro/smug': '/k/smug.webp' }
    expect(resolveSpriteSrc(m, 'sensei', 'happy')).toEqual({ src: '/s/smile.webp', exact: false })
    expect(resolveSpriteSrc(m, 'kuro', 'happy')).toEqual({ src: '/k/smug.webp', exact: false })
  })

  it('uses the closest existing face for heroines whose own face is still missing, but prefers a real image', () => {
    const m = { 'rin/normal': '/r/n.webp', 'rin/smile': '/r/smile.webp', 'rin/think': '/r/think.webp' }
    expect(resolveSpriteSrc(m, 'rin', 'happy')).toEqual({ src: '/r/smile.webp', exact: false })
    expect(resolveSpriteSrc(m, 'rin', 'sad')).toEqual({ src: '/r/think.webp', exact: false })
    // once the real image is added it wins, with no overlay
    expect(resolveSpriteSrc({ ...m, 'rin/sad': '/r/sad.webp' }, 'rin', 'sad')).toEqual({ src: '/r/sad.webp', exact: true })
    // no fallback face available -> normal
    expect(resolveSpriteSrc({ 'mirai/normal': '/m/n.webp' }, 'mirai', 'angry')).toEqual({ src: '/m/n.webp', exact: false })
  })

  it('resolves UI illustrations (`ui/<name>`) and picks the right schedule banner', () => {
    const m = { 'ui/logo': '/art/ui/logo.webp', 'ui/activity-write': '/art/ui/activity-write.webp' }
    expect(resolveUiSrc(m, 'logo')).toBe('/art/ui/logo.webp')
    expect(resolveUiSrc(m, 'activity-qa')).toBeNull()
    expect(resolveUiSrc({ 'ui/logo': true }, 'logo')).toBe('/art/ui/logo.png')
    expect(activityBannerName({ status: 'ok', activityId: 'write' })).toBe('write')
    expect(activityBannerName({ status: 'fail', activityId: 'write' })).toBe('fail')
    expect(activityBannerName({ status: 'infirmary', activityId: 'techcheck' })).toBe('infirmary')
    expect(activityBannerName({ status: 'skipped', activityId: 'rest' })).toBe('infirmary')
  })

  it('accepts legacy boolean entries as .png paths', () => {
    expect(resolveSpriteSrc({ 'hare/smile': true }, 'hare', 'smile')).toEqual({ src: '/art/hare/smile.png', exact: true })
    expect(resolveBgSrc({ 'bg/beach': true }, 'beach')).toBe('/art/bg/beach.png')
    expect(resolveCgSrc({ 'cg/end-rin': true }, 'end-rin')).toBe('/art/cg/end-rin.png')
  })

  it('resolves background and CG manifest keys (`bg/<id>`, `cg/<id>`)', () => {
    const m = { 'bg/street': '/art/bg/street.webp', 'cg/date-hare-3': '/art/cg/date-hare-3.webp' }
    expect(resolveBgSrc(m, 'street')).toBe('/art/bg/street.webp')
    expect(resolveBgSrc(m, 'beach')).toBeNull()
    expect(resolveCgSrc(m, 'date-hare-3')).toBe('/art/cg/date-hare-3.webp')
    expect(resolveCgSrc(m, 'end-bad')).toBeNull()
  })

  it('every key shipped in public/art/manifest.json maps to a known id', () => {
    const manifest = JSON.parse(readFileSync('public/art/manifest.json', 'utf8')) as Record<string, string>
    const uiKeys = ['logo', ...ACTIVITY_IDS.map((id) => `activity-${id}`), 'activity-fail', 'activity-infirmary']
    for (const key of Object.keys(manifest)) {
      const [head, tail] = key.split('/')
      if (head === 'bg') expect(BG_IDS as readonly string[]).toContain(tail)
      else if (head === 'cg') expect(CG_IDS as readonly string[]).toContain(tail)
      else if (head === 'ui') expect(uiKeys).toContain(tail)
      else {
        expect(SPRITE_IDS as readonly string[]).toContain(head)
        expect(FACES as readonly string[]).toContain(tail)
      }
    }
  })
})
