import { useEffect, useRef } from 'react'
import { CHARACTERS, displayName, type SpeakerId } from '@/content/characters'
import { useGame } from '@/store/game'
import { useUI } from '@/store/ui'
import { Panel } from './Panel'

export function Backlog() {
  const backlog = useGame((s) => s.backlog)
  const playerName = useGame((s) => s.playerName)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight })
  }, [])
  return (
    <Panel title="對話紀錄" wide onClose={() => useUI.getState().setOverlay(null)}>
      <div ref={ref} className="max-h-[500px] space-y-3 overflow-y-auto pr-2" data-testid="backlog">
        {backlog.length === 0 && <p className="opacity-60">（還沒有紀錄）</p>}
        {backlog.map((b) =>
          b.who === 'choice' ? (
            <p key={b.lineId} className="pl-4 text-lg text-sakura">▶ {b.text}</p>
          ) : (
            <div key={b.lineId}>
              <div className="font-title text-base font-bold" style={{ color: CHARACTERS[b.who as SpeakerId]?.color }}>
                {displayName(b.who as SpeakerId, playerName) ?? ''}
              </div>
              <p className="text-lg leading-relaxed">{b.text}</p>
            </div>
          ),
        )}
      </div>
    </Panel>
  )
}
