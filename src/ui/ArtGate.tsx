import type { ReactNode } from 'react'
import { useArtReady } from '@/art/hooks'
import type { ArtSpec } from '@/art/sceneAssets'

const PLACEHOLDER = '#0b1430'

/**
 * Holds a non-script screen (schedule, board, weekend, report) back until its artwork is preloaded (max 4s), then
 * fades it in. While waiting: dark backdrop, plus the shared 「讀取中…」 overlay if it takes over 200ms.
 */
export function ArtGate({ spec, children }: { spec: ArtSpec; children: ReactNode }) {
  const { ready, waited } = useArtReady(spec)
  if (!ready) return <div className="h-full w-full" style={{ background: PLACEHOLDER }} />
  return <div className={`h-full w-full ${waited ? 'art-gate-in' : ''}`}>{children}</div>
}
