import { audio } from '@/audio'
import { MINIGAME_BGM } from '@/audio/cues'
import { useGame } from '@/store/game'

/**
 * 小遊戲開啟時換成專用配樂，回傳「離開」函式（卸載時呼叫）：
 * - 劇情中的小遊戲：淡回 `stage.bgm ?? 'daily'`（離開時才讀，所以劇本在結算後立刻換曲也不會被蓋掉；不改寫 stage.bgm）
 * - 圖鑑練習（沒有劇本在等結果）：回到進場前正在播的曲子
 */
export function enterMinigameBgm(): () => void {
  const inStory = useGame.getState().pause.kind === 'minigame'
  const before = audio.currentBgm
  audio.bgm(MINIGAME_BGM)
  return () => {
    if (inStory) audio.bgm(useGame.getState().stage.bgm ?? 'daily')
    else if (before) audio.bgm(before)
    else audio.stopBgm()
  }
}
