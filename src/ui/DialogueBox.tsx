import { useEffect, useState } from 'react'
import { audio } from '@/audio'
import { CHARACTERS, displayName } from '@/content/characters'
import type { Pause } from '@/engine/types'
import { useGame } from '@/store/game'
import { useSettings } from '@/store/settings'
import { useUI } from '@/store/ui'

type Say = Extract<Pause, { kind: 'say' }>

export function DialogueBox({ line }: { line: Say }) {
  const playerName = useGame((s) => s.playerName)
  const textSpeed = useSettings((s) => s.textSpeed)
  const finishSignal = useUI((s) => s.finishSignal)
  const skipping = useUI((s) => s.skipping)
  const chars = [...line.text]
  const [n, setN] = useState(0)

  // restart on a new line
  useEffect(() => {
    setN(0)
    useUI.getState().set({ typed: false })
  }, [line.lineId])

  useEffect(() => {
    if (n >= chars.length) {
      useUI.getState().set({ typed: true })
      return
    }
    const t = setTimeout(() => {
      if (!skipping && n % 3 === 0) audio.sfx('blip')
      setN((v) => v + 1)
    }, skipping ? 0 : 1000 / textSpeed)
    return () => clearTimeout(t)
  }, [n, chars.length, textSpeed, skipping])

  // "finish line on click"
  useEffect(() => {
    if (finishSignal) setN(chars.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishSignal])

  const name = displayName(line.who, playerName)
  const color = CHARACTERS[line.who].color
  const done = n >= chars.length
  return (
    <div className="absolute bottom-6 left-1/2 z-20 w-[1120px] -translate-x-1/2" data-testid="dialogue">
      {name && (
        <div
          className="absolute -top-5 left-8 z-10 rounded-full px-6 py-1 font-title text-2xl font-bold text-white shadow-md"
          style={{ background: color, border: '2px solid rgba(255,255,255,.85)' }}
          data-testid="nameplate"
        >
          {name}
        </div>
      )}
      <div className="glass min-h-[168px] rounded-3xl px-10 pb-6 pt-8" style={{ borderLeft: `8px solid ${color}` }}>
        <p className="font-title text-[27px] font-medium leading-[1.6] text-[#241d35]" data-testid="dialogue-text">
          {chars.slice(0, n).join('')}
          {done && <span className="ml-1.5 inline-block text-[#d6334a]" style={{ animation: 'blink-caret 1s infinite' }}>▼</span>}
        </p>
      </div>
    </div>
  )
}
