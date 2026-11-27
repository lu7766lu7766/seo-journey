import { describe, expect, it } from 'vitest'
import { useGlobal } from '@/store/global'

describe('minigame stars', () => {
  it('only ever raises the stored best and clamps to 1-3', () => {
    const g = useGlobal.getState()
    g.setStars('t-quiz', 2)
    expect(useGlobal.getState().stars['t-quiz']).toBe(2)
    g.setStars('t-quiz', 1)
    expect(useGlobal.getState().stars['t-quiz']).toBe(2)
    g.setStars('t-quiz', 9)
    expect(useGlobal.getState().stars['t-quiz']).toBe(3)
    g.setStars('t-none', 0)
    expect(useGlobal.getState().stars['t-none']).toBeUndefined()
  })
})
