import { useEffect, useState, useSyncExternalStore } from 'react'
import { audioVoice } from '@/audio'
import { sceneOfLine } from '@/audio/voiceManifest'
import type { VoiceManifest } from '@/audio/voiceManifest'
import { useGame } from '@/store/game'
import { useSettings } from '@/store/settings'
import { useUI } from '@/store/ui'

/** 目前的語音狀態（載入中／播放中／播完／沒有語音）。 */
export const useVoiceState = () => useSyncExternalStore(audioVoice.subscribe, audioVoice.getState)

/** 語音 manifest（語音關閉或尚未載入完成時為空）；對話紀錄用它判斷哪些行有語音可以重播。 */
export function useVoiceManifest(): VoiceManifest {
  const voiceOn = useSettings((s) => s.voiceOn)
  const [m, setM] = useState<VoiceManifest>({})
  useEffect(() => {
    if (!voiceOn) {
      setM({})
      return
    }
    let alive = true
    void audioVoice.manifest().then((x) => alive && setM(x))
    return () => {
      alive = false
    }
  }, [voiceOn])
  return voiceOn ? m : {}
}

/**
 * 劇本畫面的語音播放：顯示有語音的一行時播放；推進、跳過、選項出現、開選單／存讀檔等覆蓋畫面、
 * 快轉、語音關閉、離開遊戲（回標題）時停止。同時預載接下來 2–3 行。
 */
export function useVoicePlayback() {
  const voiceOn = useSettings((s) => s.voiceOn)
  const pause = useGame((s) => s.pause)
  const skipping = useUI((s) => s.skipping)
  const overlay = useUI((s) => s.overlay)

  // 開了覆蓋畫面（選單、紀錄、存讀檔…）就停止；重播（對話紀錄）在覆蓋畫面之後才開始，不受影響
  useEffect(() => {
    audioVoice.stop()
  }, [overlay])
  // 離開劇本畫面（回標題）
  useEffect(() => () => audioVoice.stop(), [])

  const lineId = pause.kind === 'end' ? '' : pause.lineId
  const voice = pause.kind === 'say' ? pause.voice : undefined
  useEffect(() => {
    if (!voice || !voiceOn || skipping || useUI.getState().overlay) {
      audioVoice.stop()
      return
    }
    const sceneId = sceneOfLine(lineId)
    audioVoice.play(lineId, sceneId, voice)
    audioVoice.prefetch(sceneId, useGame.getState().voiceAhead)
  }, [lineId, voice, voiceOn, skipping])
}
