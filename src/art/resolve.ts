import type { BgId } from '@/content/backgrounds'
import type { CharId, Face } from '@/content/characters'
import type { CgId } from '@/content/cgs'

/**
 * Pure helpers that map `public/art/manifest.json` entries to image URLs.
 * A manifest value is either a string (the URL, what scripts/process-art.mjs writes) or any other
 * truthy value (legacy `true` => `/art/<...>.png`). No entry => null => the programmatic SVG art is used.
 */
type Manifest = Record<string, unknown>

/** When a face has no image of its own, borrow this one (then `normal`) and show the emoji-style overlay. */
export const FACE_FALLBACK: Partial<Record<CharId, Partial<Record<Face, Face>>>> = {
  // heroines: only faces that are still missing need an entry; a real image is always preferred
  rin: { happy: 'smile', sad: 'think' },
  hare: { angry: 'think' },
  mirai: { angry: 'think' },
  sensei: { happy: 'smile', blush: 'smile', surprised: 'normal', angry: 'normal', smug: 'smile', shock: 'normal' },
  kuro: { smile: 'smug', happy: 'smug', blush: 'normal', surprised: 'shock', angry: 'normal', think: 'normal' },
}

function entryToSrc(entry: unknown, legacyPath: string): string | null {
  if (typeof entry === 'string') return entry
  return entry ? legacyPath : null
}

/** `exact: true` => the image for this very face exists (no emoji overlay needed). */
export function resolveSpriteSrc(manifest: Manifest, id: CharId, face: Face): { src: string; exact: boolean } | null {
  const exact = entryToSrc(manifest[`${id}/${face}`], `/art/${id}/${face}.png`)
  if (exact) return { src: exact, exact: true }

  const candidates: Face[] = []
  const fb = FACE_FALLBACK[id]?.[face]
  if (fb) candidates.push(fb)
  if (face !== 'normal') candidates.push('normal')

  for (const f of candidates) {
    const src = entryToSrc(manifest[`${id}/${f}`], `/art/${id}/${f}.png`)
    if (src) return { src, exact: false }
  }
  return null
}

export function resolveBgSrc(manifest: Manifest, id: BgId): string | null {
  return entryToSrc(manifest[`bg/${id}`], `/art/bg/${id}.png`)
}

export function resolveCgSrc(manifest: Manifest, id: CgId): string | null {
  return entryToSrc(manifest[`cg/${id}`], `/art/cg/${id}.png`)
}
