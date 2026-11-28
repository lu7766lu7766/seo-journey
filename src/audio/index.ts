import { useSettings } from '@/store/settings'
import { AudioEngine } from './engine'
import { createWebBackend } from './webBackend'

export type { SfxId, BgmId } from './synth'

const engine = new AudioEngine({
  backend: createWebBackend(),
  getSettings: () => useSettings.getState(),
})

if (typeof window !== 'undefined') {
  // 音樂／音效／語音開關即時反映
  useSettings.subscribe((s, prev) => {
    if (s.musicOn !== prev.musicOn || s.sfxOn !== prev.sfxOn || s.voiceOn !== prev.voiceOn) engine.settingsChanged()
    // 換了採用的版本：預載新音效，正在播的 BGM 交叉淡化到新版本
    if (s.audioVariants !== prev.audioVariants) engine.variantsChanged()
  })
  // 瀏覽器在使用者互動前不允許出聲：第一次互動時解鎖，之後自動補播目前應播的 BGM
  const events = ['pointerdown', 'pointerup', 'keydown', 'touchend', 'click'] as const
  const onGesture = () => {
    void engine.unlock().then((ok) => {
      if (ok) for (const e of events) window.removeEventListener(e, onGesture, true)
    })
  }
  for (const e of events) window.addEventListener(e, onGesture, true)
  void engine.init() // 先抓 manifest（不需要 AudioContext）
}

export const audio = {
  /** 播放音效：manifest 有檔案就播檔案，否則合成聲。 */
  sfx: (id: string) => engine.sfx(id),
  /** 切換背景音樂（交叉淡化）；同一首重複呼叫不會重新開始。 */
  bgm: (id: string) => engine.bgm(id),
  /** 淡出並停止背景音樂。 */
  stopBgm: () => engine.stopBgm(),
  get currentBgm() {
    return engine.currentBgm
  },
}

/** 角色語音（播放機制見 `voicePlayer.ts`）。 */
export const audioVoice = {
  /** 播放某行語音（沒有語音時狀態為 `none`）；會先停掉目前的語音。 */
  play: (lineId: string, sceneId: string, key: string) => engine.voice.play(lineId, sceneId, key),
  /** 停止目前語音（短淡出）並恢復 BGM。 */
  stop: () => engine.voice.stop(),
  /** 預載接下來幾行。 */
  prefetch: (sceneId: string, keys: string[]) => engine.voice.prefetch(sceneId, keys),
  getState: engine.voice.getState,
  subscribe: engine.voice.subscribe,
  /** 語音 manifest（語音關閉時為 {}，不下載）。 */
  manifest: () => engine.voice.manifest(),
}

/** 音樂鑑賞畫面用的預覽 API（一次只播一首；進入時遊戲 BGM 淡出，離開時依採用的版本恢復）。 */
export const audioPreview = {
  begin: () => engine.beginPreview(),
  end: () => engine.endPreview(),
  playBgm: (id: string, variant: string, resume = false) => engine.previewBgm(id, variant, resume),
  pause: () => engine.pausePreview(),
  stop: () => engine.stopPreview(),
  playSfx: (id: string, variant: string) => engine.previewSfx(id, variant),
  getState: () => engine.getPreview(),
  subscribe: (cb: () => void) => engine.subscribePreview(cb),
  position: () => engine.previewPosition(),
  duration: () => engine.previewDuration(),
  /** 取得（已載入的）manifest */
  manifest: () => engine.init(),
}
