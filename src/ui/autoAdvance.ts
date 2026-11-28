import type { VoiceState } from '@/audio/voicePlayer'

/** 這一行的語音是否還在載入／播放（自動播放要等它播完）。 */
export function isVoiceBusy(state: VoiceState | null, lineId: string): boolean {
  return !!state && state.id === lineId && (state.status === 'loading' || state.status === 'playing')
}

/**
 * 自動播放：這一行打完字後要再等多久（ms）才前進；還不該計時回傳 null。
 * 有語音的行要等語音播完（`voiceBusy` 為 true 時不計時），播完後再加上原本的自動間隔；沒有語音的行照原本邏輯。
 */
export function autoAdvanceDelay(o: {
  auto: boolean
  typed: boolean
  isSay: boolean
  overlay: boolean
  skipping: boolean
  voiceBusy: boolean
  autoDelayMs: number
  textLength: number
}): number | null {
  if (!o.auto || !o.typed || !o.isSay || o.overlay || o.skipping || o.voiceBusy) return null
  return o.autoDelayMs + o.textLength * 15
}
