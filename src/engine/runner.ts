import { evalCond } from './cond'
import { subst } from './text'
import type { Cmd, CondState, Effects, Pause, RunnerSnapshot, Scene } from './types'

/**
 * Scene runner: pure TypeScript, no React / store imports.
 *
 * Program counter `pc` is a path of numbers (serializable, stable):
 *   [i]               -> top-level cmd i
 *   [i, b, j]         -> cmd i is a `choice` (b = option index) or `if` (b: 0 = then, 1 = else);
 *                        j is the index inside that block
 *   [i, b, j, b2, k]  -> nesting continues in the same (branch, index) pairs
 * The stable line id of the cmd at `pc` is `${sceneId}#${pc.join('.')}`.
 */
export interface RunnerHost {
  /** current state used for conditions and `{name}` substitution */
  getState(): CondState & { playerName: string }
  applyEffects(e: Effects): void
  /** non-flow, non-pausing visual/audio cmds (and `say`, just before pausing) */
  onCmd(cmd: Cmd, lineId: string): void
  onChoice?(lineId: string, text: string): void
}

export const lineId = (sceneId: string, pc: number[]) => `${sceneId}#${pc.join('.')}`

export class SceneRunner {
  pc: number[]
  pause: Pause = { kind: 'end' }

  constructor(
    readonly scene: Scene,
    private host: RunnerHost,
    snapshot?: RunnerSnapshot,
  ) {
    this.pc = snapshot ? [...snapshot.pc] : [0]
  }

  snapshot(): RunnerSnapshot {
    return { sceneId: this.scene.id, pc: [...this.pc] }
  }

  /** The command the runner is currently paused on (for tools and tests). */
  peek(): Cmd | undefined {
    return this.cur()
  }

  /** Run until the first pause. Call once after construction / resume. */
  start(): Pause {
    return this.settle()
  }

  /** Continue after a `say` or `wait` pause. */
  advance(): Pause {
    if (this.pause.kind === 'say' || this.pause.kind === 'wait') this.step()
    return this.settle()
  }

  choose(index: number): Pause {
    if (this.pause.kind !== 'choice') return this.pause
    const cmd = this.cur()
    if (!cmd || cmd.k !== 'choice') return this.pause
    const o = cmd.options[index]
    if (!o || !this.pause.options.some((p) => p.index === index)) return this.pause
    this.host.onChoice?.(this.pause.lineId, subst(o.text, { name: this.host.getState().playerName }))
    if (o.effects) this.host.applyEffects(o.effects)
    if (o.then?.length) this.pc.push(index, 0)
    else this.step()
    return this.settle()
  }

  resolveMinigame(won: boolean): Pause {
    if (this.pause.kind !== 'minigame') return this.pause
    const cmd = this.cur()
    if (cmd && cmd.k === 'minigame') {
      const e = won ? cmd.win : cmd.lose
      if (e) this.host.applyEffects(e)
    }
    this.step()
    return this.settle()
  }

  // ---- internals ----
  private block(pc: number[]): Cmd[] {
    let b = this.scene.cmds
    for (let j = 0; j + 2 < pc.length; j += 2) {
      const c = b[pc[j]]
      const br = pc[j + 1]
      if (c.k === 'choice') b = c.options[br].then ?? []
      else if (c.k === 'if') b = (br === 0 ? c.then : c.else) ?? []
      else return []
    }
    return b
  }

  private cur(): Cmd | undefined {
    return this.block(this.pc)[this.pc[this.pc.length - 1]]
  }

  private step() {
    this.pc[this.pc.length - 1]++
  }

  /** Pop finished blocks. Returns false when the scene is over. */
  private normalize(): boolean {
    for (;;) {
      const b = this.block(this.pc)
      if (this.pc[this.pc.length - 1] < b.length) return true
      if (this.pc.length === 1) return false
      this.pc.length -= 2
      this.step()
    }
  }

  private settle(): Pause {
    for (let guard = 0; guard < 100000; guard++) {
      if (!this.normalize()) return (this.pause = { kind: 'end' })
      const cmd = this.cur()!
      const id = lineId(this.scene.id, this.pc)
      const st = this.host.getState()
      switch (cmd.k) {
        case 'say':
          this.host.onCmd(cmd, id)
          return (this.pause = { kind: 'say', lineId: id, who: cmd.who, face: cmd.face, text: subst(cmd.text, { name: st.playerName }) })
        case 'choice': {
          const options = cmd.options
            .map((o, index) => ({ o, index }))
            .filter(({ o }) => !o.cond || evalCond(o.cond, st))
            .map(({ o, index }) => ({ index, text: subst(o.text, { name: st.playerName }) }))
          if (!options.length) { this.step(); break }
          return (this.pause = { kind: 'choice', lineId: id, options })
        }
        case 'minigame':
          return (this.pause = { kind: 'minigame', lineId: id, id: cmd.id })
        case 'wait':
          return (this.pause = { kind: 'wait', lineId: id, ms: cmd.ms })
        case 'effect':
          this.host.applyEffects(cmd.effects)
          this.step()
          break
        case 'if': {
          const branch = evalCond(cmd.cond, st) ? 0 : 1
          const blk = branch === 0 ? cmd.then : cmd.else
          if (blk?.length) this.pc.push(branch, 0)
          else this.step()
          break
        }
        default:
          this.host.onCmd(cmd, id)
          this.step()
      }
    }
    throw new Error(`Runner exceeded step guard in scene ${this.scene.id}`)
  }
}
