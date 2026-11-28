/**
 * 非劇本畫面的配樂／音效規則（純函式、不碰 Web Audio，方便單元測試）。
 * 劇本內的曲目由 `bgm()` 指令決定；這裡只管「沒有劇本在跑」的養成畫面與小遊戲。
 */

/** 養成畫面（排程、公佈欄、週末、週報）共用的配樂 */
export const SIM_BGM = 'sim'
/** 小遊戲（Quiz／Spot／Serp，含圖鑑練習）共用的配樂 */
export const MINIGAME_BGM = 'minigame'

/** 養成階段：沒有劇本在跑時，畫面是排程／公佈欄／週末／週報 */
export const SIM_PHASES: readonly string[] = ['schedule', 'board', 'weekend', 'report']

/** 目前是不是養成畫面（階段是養成階段、且沒有劇本在演） */
export function isSimScreen(phase: string, sceneRunning: boolean): boolean {
  return !sceneRunning && SIM_PHASES.includes(phase)
}

/**
 * 週報進場音效：本週三位女主角的分數（含好感）淨變化為正播 `grow`、為負播 `fail`、持平不播。
 * `prev`／`now` 都是 heroine id → 分數；比較用四捨五入後的整數（與畫面顯示的 +N／−N 一致）。
 */
export function weeklyReportSfx(prev: Record<string, number | undefined>, now: Record<string, number>): 'grow' | 'fail' | null {
  let net = 0
  for (const [h, v] of Object.entries(now)) net += Math.round(v) - Math.round(prev[h] ?? v)
  return net > 0 ? 'grow' : net < 0 ? 'fail' : null
}
