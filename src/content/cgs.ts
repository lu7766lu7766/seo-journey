/** Event CG registry (art: P1 draws `<Cg id />` in src/art/cg; script: P3 uses cg(id)). */
export const CG_IDS = [
  'end-true', 'end-rin', 'end-hare', 'end-mirai', 'end-normal', 'end-bad', 'end-blackhat',
  'date-rin-3', 'date-hare-3', 'date-mirai-3',
] as const
export type CgId = (typeof CG_IDS)[number]
