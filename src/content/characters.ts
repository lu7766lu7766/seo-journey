export const FACES = [
  'normal', 'smile', 'happy', 'blush', 'surprised', 'angry', 'sad', 'think',
  // kuro-only extras (plan §1): normal/smug/shock/sad
  'smug', 'shock',
] as const
export type Face = (typeof FACES)[number]

/** Characters that have a sprite and can be shown on stage. */
export const SPRITE_IDS = ['rin', 'hare', 'mirai', 'sensei', 'kuro'] as const
export type CharId = (typeof SPRITE_IDS)[number]

/** Anyone who can speak. `me` is the player (uses the player's name), `narr` is narration, `npc` is a portraitless speaker with a custom nameplate. */
export const SPEAKER_IDS = ['me', 'narr', 'npc', ...SPRITE_IDS] as const
export type SpeakerId = (typeof SPEAKER_IDS)[number]

export interface CharacterDef {
  id: SpeakerId
  /** display name; `null` = no name plate (narration), 'me' resolves to the player name at runtime */
  name: string | null
  /** theme main color (name plate) */
  color: string
  /** accent color */
  accent: string
  hasSprite: boolean
}

export const CHARACTERS: Record<SpeakerId, CharacterDef> = {
  me: { id: 'me', name: '{name}', color: '#6fa8dc', accent: '#b5ead7', hasSprite: false },
  narr: { id: 'narr', name: null, color: '#8a8aa0', accent: '#d0d0e0', hasSprite: false },
  npc: { id: 'npc', name: null, color: '#5c667a', accent: '#b8c2d6', hasSprite: false },
  rin: { id: 'rin', name: '白鷺 凜', color: '#1f3a6e', accent: '#d6334a', hasSprite: true },
  hare: { id: 'hare', name: '夏川 晴', color: '#f28c28', accent: '#ffd24a', hasSprite: true },
  mirai: { id: 'mirai', name: '星野 未來', color: '#9a8cd0', accent: '#3fd0d4', hasSprite: true },
  sensei: { id: 'sensei', name: '索 千尋', color: '#a9826a', accent: '#f1dcc4', hasSprite: true },
  kuro: { id: 'kuro', name: '黑川 翔', color: '#2d2d38', accent: '#8a8a9a', hasSprite: true },
}

export const DEFAULT_PLAYER_NAME = '葉 搜一'

/** Resolve a speaker's display name (null = no plate). For `npc`, uses `speakerName`. */
export function displayName(id: SpeakerId, playerName: string, speakerName?: string): string | null {
  if (id === 'npc') return speakerName?.trim() ? speakerName : null
  const n = CHARACTERS[id]?.name ?? null
  return n === null ? null : n.replace('{name}', playerName)
}
