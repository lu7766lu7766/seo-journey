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

  useEffect(() => {
    setN(0)
    useUI.getState().set({ typed: false })
  }, [line.lineId])

  useEffect(() => {
    if (skipping) {
      setN(chars.length)
      useUI.getState().set({ typed: true })
      return
    }
    if (n >= chars.length) {
      useUI.getState().set({ typed: true })
      return
    }
    const t = setTimeout(() => {
      if (n % 3 === 0) audio.sfx('blip')
      setN((v) => v + 1)
    }, 1000 / textSpeed)
    return () => clearTimeout(t)
  }, [n, chars.length, textSpeed, skipping])

  useEffect(() => {
    if (finishSignal) setN(chars.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishSignal])

  const name = displayName(line.who, playerName)
  const charDef = CHARACTERS[line.who]
  const color = charDef.color
  const accent = charDef.accent
  const done = n >= chars.length

  return (
    <div className="absolute bottom-5 left-1/2 z-20 w-[1120px] -translate-x-1/2" data-testid="dialogue">
      {name && (
        <div
          className="absolute -top-5 left-8 z-10 flex items-center gap-2 rounded-full px-6 py-1 font-title text-2xl font-bold text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${color}, #151b36)`,
            border: `2px solid ${accent}`,
            boxShadow: `0 4px 18px rgba(8, 12, 32, 0.5), 0 0 12px ${accent}55`,
          }}
          data-testid="nameplate"
        >
          <span className="inline-block h-2.5 w-2.5 rotate-45" style={{ background: accent }} />
          <span>{name}</span>
        </div>
      )}
      <div
        className="vn-box relative min-h-[164px] overflow-hidden rounded-3xl px-10 pb-6 pt-8"
        style={{ borderLeft: `6px solid ${accent}` }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] opacity-80"
          style={{ background: `linear-gradient(90deg, ${accent}, rgba(159,211,240,0.4), transparent)` }}
        />
        <p className="font-title text-[27px] font-medium leading-[1.62] tracking-[0.01em] text-[#f8f9ff]" data-testid="dialogue-text">
          {chars.slice(0, n).join('')}
          {done && (
            <span className="ml-2 inline-block text-sm text-[#9fd3f0]" style={{ animation: 'blink-caret 1s infinite' }}>
              ▼
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
