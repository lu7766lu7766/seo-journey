export const BG_IDS = [
  'gate', 'classroom', 'clubroom', 'corridor', 'rooftop', 'library', 'broadcast',
  'council', 'street', 'planetarium', 'beach', 'festival', 'rain',
] as const
export type BgId = (typeof BG_IDS)[number]
