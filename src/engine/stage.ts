import type { Cmd, CharId, Slot, StageState } from './types'

export const initialStage = (): StageState => ({
  bg: { id: 'clubroom', time: 'day' },
  rain: false,
  chars: {},
  cg: null,
  flash: 0,
})

const SLOTS: Slot[] = ['left', 'center', 'right']

function findSlot(s: StageState, who: CharId): Slot | undefined {
  return SLOTS.find((sl) => s.chars[sl]?.who === who)
}

/** Pure reducer for visual commands. Unknown/non-visual cmds return the same state. */
export function reduceStage(s: StageState, cmd: Cmd): StageState {
  switch (cmd.k) {
    case 'bg':
      return {
        ...s,
        bg: { id: cmd.id, time: cmd.time ?? 'day' },
        rain: cmd.fx === 'rain',
        flash: cmd.fx === 'flash' ? s.flash + 1 : s.flash,
      }
    case 'show': {
      const existing = findSlot(s, cmd.who)
      const at = cmd.at ?? existing ?? 'center'
      const face = cmd.face ?? (existing ? s.chars[existing]!.face : 'normal')
      const chars = { ...s.chars }
      if (existing) delete chars[existing]
      chars[at] = { who: cmd.who, face }
      return { ...s, chars }
    }
    case 'hide': {
      if (cmd.who === 'all') return { ...s, chars: {} }
      const sl = findSlot(s, cmd.who)
      if (!sl) return s
      const chars = { ...s.chars }
      delete chars[sl]
      return { ...s, chars }
    }
    case 'say': {
      if (!cmd.face || cmd.who === 'me' || cmd.who === 'narr' || cmd.who === 'npc') return s
      const sl = findSlot(s, cmd.who)
      if (!sl) return s
      return { ...s, chars: { ...s.chars, [sl]: { who: cmd.who, face: cmd.face } } }
    }
    case 'cg':
      return { ...s, cg: cmd.id === 'none' ? null : cmd.id }
    default:
      return s
  }
}
