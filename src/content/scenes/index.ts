import type { Scene } from '@/engine/types'

/**
 * Scene registry. Each scene lives in its own module (code-split via dynamic import)
 * and `export default scene('<id>', [...])`. The registry key MUST equal scene.id
 * (enforced by tests/scriptLint.test.ts). Add new scenes here.
 */
export const SCENE_LOADERS = {
  demo: () => import('./main/demo'),
} satisfies Record<string, () => Promise<{ default: Scene }>>

export type SceneId = keyof typeof SCENE_LOADERS
export const SCENE_IDS = Object.keys(SCENE_LOADERS) as SceneId[]

const cache = new Map<string, Scene>()

export async function loadScene(id: string): Promise<Scene> {
  const hit = cache.get(id)
  if (hit) return hit
  const loader = (SCENE_LOADERS as Record<string, () => Promise<{ default: Scene }>>)[id]
  if (!loader) throw new Error(`Unknown scene: ${id}`)
  const scene = (await loader()).default
  cache.set(id, scene)
  return scene
}
