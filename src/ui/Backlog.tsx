import { useEffect, useRef } from 'react'
import { CHARACTERS, displayName, type SpeakerId } from '@/content/characters'
import { useGame } from '@/store/game'
import { audioVoice } from '@/audio'
import { lookupVoice, sceneOfLine } from '@/audio/voiceManifest'
import { isVoiceBusy } from './autoAdvance'
import { useUI } from '@/store/ui'
import { Panel } from './Panel'
import { useVoiceManifest, useVoiceState } from './useVoice'

function ReplayButton({ lineId, voice }: { lineId: string; voice: string }) {
  const playing = isVoiceBusy(useVoiceState(), lineId)
  return (
    <button
      type="button"
      className="ml-3 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#b8325a]/50 bg-[#d6334a]/10 text-[#b8325a] transition hover:bg-[#d6334a]/25 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7ee8fa]"
      aria-label={playing ? '停止語音' : '重播語音'}
      aria-pressed={playing}
      data-testid="backlog-replay"
      onClick={() => (playing ? audioVoice.stop() : audioVoice.play(lineId, sceneOfLine(lineId), voice))}
    >
      {playing ? (
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1.5" /></svg>
      ) : (
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M2 6h2.5L8 3v10L4.5 10H2z" />
          <path d="M10 5.5a3.5 3.5 0 0 1 0 5M11.6 3.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}

export function Backlog() {
  const backlog = useGame((s) => s.backlog)
  const playerName = useGame((s) => s.playerName)
  const ref = useRef<HTMLDivElement>(null)
  const voices = useVoiceManifest()
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight })
  }, [])
  return (
    <Panel title="對話紀錄" wide onClose={() => useUI.getState().setOverlay(null)}>
      <div ref={ref} className="max-h-[500px] space-y-3 overflow-y-auto pr-2" data-testid="backlog">
        {backlog.length === 0 && <p className="opacity-60">（還沒有紀錄）</p>}
        {backlog.map((b) =>
          b.who === 'choice' ? (
            <p key={b.lineId} className="pl-4 text-lg font-bold text-[#b8325a]">▶ {b.text}</p>
          ) : (
            <div key={b.lineId}>
              <div className="font-title text-base font-bold" style={{ color: CHARACTERS[b.who as SpeakerId]?.color }}>
                {displayName(b.who as SpeakerId, playerName, b.name) ?? ''}
              </div>
              <div className="flex items-start">
                <p className="text-lg leading-relaxed">{b.text}</p>
                {b.voice && lookupVoice(voices, sceneOfLine(b.lineId), b.voice) && <ReplayButton lineId={b.lineId} voice={b.voice} />}
              </div>
            </div>
          ),
        )}
      </div>
    </Panel>
  )
}
