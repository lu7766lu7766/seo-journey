import type { Scene } from '@/engine/types'

/**
 * Scene registry — automatic. Every `*.ts` file under main/ dates/ side/ endings/
 * is picked up via import.meta.glob (each is its own lazy chunk).
 * A scene file must `export default scene('<id>', [...])` and its file name
 * (without .ts) MUST equal the scene id (enforced by tests/scriptLint.test.ts).
 * No manual registration needed — parallel authors never edit this file.
 */
const modules = import.meta.glob<{ default: Scene }>(['./main/*.ts', './dates/*.ts', './side/*.ts', './endings/*.ts'])

const fileId = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.ts$/, '')

export const SCENE_LOADERS: Record<string, () => Promise<{ default: Scene }>> = Object.fromEntries(
  Object.entries(modules).map(([path, loader]) => [fileId(path), loader]),
)

export type SceneId = string
export const SCENE_IDS = Object.keys(SCENE_LOADERS)

const cache = new Map<string, Scene>()

export async function loadScene(id: string): Promise<Scene> {
  const hit = cache.get(id)
  if (hit) return hit
  const loader = SCENE_LOADERS[id]
  if (!loader) throw new Error(`Unknown scene: ${id}`)
  const scene = (await loader()).default
  cache.set(id, scene)
  return scene
}
