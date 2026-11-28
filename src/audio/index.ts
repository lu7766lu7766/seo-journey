import { useSettings } from '@/store/settings'
import { AudioEngine } from './engine'
import { createWebBackend } from './webBackend'

export type { SfxId, BgmId } from './synth'

const engine = new AudioEngine({
  backend: createWebBackend(),
  getSettings: () => useSettings.getState(),
})

if (typeof window !== 'undefined') {
  // 音量滑桿即時反映
  useSettings.subscribe((s) => engine.setBgmVolume(s.bgmVolume))
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
