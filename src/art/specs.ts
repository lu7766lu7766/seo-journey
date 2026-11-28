import { ACTIVITY_IDS } from '@/content/activityIds'
import { SPRITE_IDS } from '@/content/characters'
import type { ArtSpec } from './sceneAssets'

/** Everything the title screen draws (see src/ui/TitleScreen.tsx): backdrop, logo and the three showcased heroines. */
export const TITLE_ART: ArtSpec = {
  bg: ['gate'],
  ui: ['logo'],
  sprites: [['rin', 'smile'], ['hare', 'happy'], ['mirai', 'smile']],
}

/** Portrait avatars (`<id>/normal`) used by the schedule / board / report screens. */
const AVATARS = SPRITE_IDS.map((id) => [id, 'normal'] as const)

export const SCHEDULE_ART: ArtSpec = {
  bg: ['clubroom', 'infirmary'],
  sprites: AVATARS,
  ui: [...ACTIVITY_IDS, 'fail', 'infirmary'].map((n) => `activity-${n}`),
}
export const BOARD_ART: ArtSpec = { bg: ['corridor'], sprites: AVATARS }
export const WEEKEND_ART: ArtSpec = { bg: ['street'], sprites: [['rin', 'smile'], ['hare', 'smile'], ['mirai', 'smile']] }
export const REPORT_ART: ArtSpec = { bg: ['council'], sprites: AVATARS }

/** All non-script screens, warmed in the background once the first scene is on screen. */
export const SIM_SCREEN_ARTS: readonly ArtSpec[] = [SCHEDULE_ART, BOARD_ART, WEEKEND_ART, REPORT_ART]
