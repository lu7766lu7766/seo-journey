import { SPRITE_IDS, type CharId, type Face } from '@/content/characters'
import type { BgId, CgId, Cmd, StageState } from '@/engine/types'
import { resolveBgSrc, resolveCgSrc, resolveSpriteSrc, resolveUiSrc } from './resolve'

/** A declarative list of the artwork a screen / scene needs. All fields are keyed like the manifest. */
export interface ArtSpec {
  bg?: readonly BgId[]
  sprites?: readonly (readonly [CharId, Face])[]
  cg?: readonly CgId[]
  /** `ui/<name>` illustrations, e.g. `logo`, `activity-write` */
  ui?: readonly string[]
}

type Manifest = Record<string, unknown>

const isSprite = (who: string): who is CharId => (SPRITE_IDS as readonly string[]).includes(who)

/** Resolve a spec to the actual (deduplicated, order-preserving) image URLs the manifest provides. */
export function specUrls(manifest: Manifest, spec: ArtSpec): string[] {
  const urls: string[] = []
  const push = (u: string | null | undefined) => {
    if (u && !urls.includes(u)) urls.push(u)
  }
  spec.bg?.forEach((id) => push(resolveBgSrc(manifest, id)))
  spec.sprites?.forEach(([id, face]) => push(resolveSpriteSrc(manifest, id, face)?.src))
  spec.cg?.forEach((id) => push(resolveCgSrc(manifest, id)))
  spec.ui?.forEach((name) => push(resolveUiSrc(manifest, name)))
  return urls
}

/**
 * Walk a command list (recursing into `if` then/else and every `choice` option's `then`) and collect what it can
 * ever put on stage. Backgrounds ignore `time` (same file); sprites are `<id>/<face>` (a `show` with no face is
 * `normal`); `say` with a face switches that character's expression. Order = first appearance.
 */
export function collectSceneSpec(cmds: readonly Cmd[]): Required<Pick<ArtSpec, 'bg' | 'sprites' | 'cg'>> {
  const bg: BgId[] = []
  const sprites: [CharId, Face][] = []
  const cg: CgId[] = []
  const walk = (list: readonly Cmd[]) => {
    for (const c of list) {
      switch (c.k) {
        case 'bg':
          if (!bg.includes(c.id)) bg.push(c.id)
          break
        case 'show':
          addSprite(c.who, c.face ?? 'normal')
          break
        case 'say':
          if (c.face && isSprite(c.who)) addSprite(c.who, c.face)
          break
        case 'cg':
          if (c.id !== 'none' && !cg.includes(c.id)) cg.push(c.id)
          break
        case 'if':
          walk(c.then)
          if (c.else) walk(c.else)
          break
        case 'choice':
          c.options.forEach((o) => o.then && walk(o.then))
          break
        default:
          break
      }
    }
  }
  const addSprite = (who: CharId, face: Face) => {
    if (!sprites.some(([w, f]) => w === who && f === face)) sprites.push([who, face])
  }
  walk(cmds)
  return { bg, sprites, cg }
}

/** What the stage currently shows (used when restoring a save, where the scene starts mid-way). */
export function stageSpec(stage: StageState): ArtSpec {
  return {
    bg: [stage.bg.id],
    sprites: Object.values(stage.chars).map((c) => [c.who, c.face] as const),
    cg: stage.cg ? [stage.cg as CgId] : [],
  }
}

/** URLs for a scene (+ optionally the stage it will start from). */
export function sceneImageUrls(manifest: Manifest, cmds: readonly Cmd[], stage?: StageState): string[] {
  const urls = stage ? specUrls(manifest, stageSpec(stage)) : []
  for (const u of specUrls(manifest, collectSceneSpec(cmds))) if (!urls.includes(u)) urls.push(u)
  return urls
}
