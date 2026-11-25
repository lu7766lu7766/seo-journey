import { useState } from 'react'
import { useGame } from '@/store/game'
import { listSaves, writeSave, type SlotId } from '@/store/save'
import { useUI } from '@/store/ui'
import { Panel } from './Panel'

export async function loadSlot(slot: SlotId): Promise<boolean> {
  const hit = listSaves().find((s) => s.slot === slot)?.env
  if (!hit) return false
  await useGame.getState().loadPersisted(hit.data)
  useUI.getState().setScreen('game')
  return true
}

export function SaveLoad({ mode }: { mode: 'save' | 'load' }) {
  const [saves, setSaves] = useState(listSaves)
  const [msg, setMsg] = useState('')
  const inGame = useUI((s) => s.screen) === 'game'
  const back = () => useUI.getState().setOverlay(inGame ? 'menu' : null)

  const act = async (slot: SlotId) => {
    if (mode === 'save') {
      const ok = slot !== 'auto' && writeSave(slot, useGame.getState().toPersisted())
      setMsg(ok ? `已存入欄位 ${slot}` : '存檔失敗')
      setSaves(listSaves())
    } else if (!(await loadSlot(slot))) setMsg('這個欄位沒有存檔')
  }

  return (
    <Panel title={mode === 'save' ? '存檔' : '讀檔'} onClose={back}>
      <div className="space-y-3">
        {saves.map(({ slot, env }) => {
          const disabled = mode === 'save' ? slot === 'auto' : !env
          return (
            <button
              key={slot}
              disabled={disabled}
              data-testid={`slot-${slot}`}
              onClick={() => act(slot)}
              className="glass flex w-full items-center justify-between rounded-2xl px-5 py-3 text-left text-lg enabled:hover:brightness-105 disabled:opacity-50"
            >
              <span className="font-title font-bold">{slot === 'auto' ? '自動存檔' : `欄位 ${slot}`}</span>
              <span className="text-base">{env ? `${env.label}　${new Date(env.savedAt).toLocaleString()}` : '（空）'}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 h-6 text-center text-base" data-testid="saveload-msg">{msg}</p>
    </Panel>
  )
}
