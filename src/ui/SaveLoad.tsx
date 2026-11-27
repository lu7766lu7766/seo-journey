import { useState } from 'react'
import { useGame } from '@/store/game'
import { exportSaveCode, importSaveCode, listSaves, writeSave, type SlotId } from '@/store/save'
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
  const [codeText, setCodeText] = useState('')
  const inGame = useUI((s) => s.screen) === 'game'
  const back = () => useUI.getState().setOverlay(inGame ? 'menu' : null)

  const act = async (slot: SlotId) => {
    if (mode === 'save') {
      const ok = slot !== 'auto' && writeSave(slot, useGame.getState().toPersisted())
      setMsg(ok ? `已存入欄位 ${slot}` : '存檔失敗')
      setSaves(listSaves())
    } else if (!(await loadSlot(slot))) setMsg('這個欄位沒有存檔')
  }

  const copyCode = async () => {
    const code = exportSaveCode(useGame.getState().toPersisted())
    setCodeText(code)
    try {
      await navigator.clipboard.writeText(code)
      setMsg('已複製存檔碼！換電腦或下次上課可貼上還原')
    } catch {
      setMsg('已產生存檔碼，請從下方輸入框全選複製')
    }
  }

  const applyCode = async () => {
    const env = importSaveCode(codeText)
    if (!env) {
      setMsg('存檔碼格式不正確，請確認有完整複製')
      return
    }
    await useGame.getState().loadPersisted(env.data)
    useUI.getState().setScreen('game')
    useUI.getState().setOverlay(null)
  }

  return (
    <Panel title={mode === 'save' ? '存檔' : '讀檔'} onClose={back}>
      <div className="max-h-[300px] space-y-2.5 overflow-y-auto pr-1">
        {saves.map(({ slot, env }) => {
          const disabled = mode === 'save' ? slot === 'auto' : !env
          return (
            <button
              key={slot}
              disabled={disabled}
              data-testid={`slot-${slot}`}
              onClick={() => act(slot)}
              className="glass flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left text-base enabled:hover:brightness-105 disabled:opacity-50"
            >
              <span className="shrink-0 font-title font-bold">{slot === 'auto' ? '自動存檔' : `欄位 ${slot}`}</span>
              <span className="min-w-0 truncate text-sm">{env ? `${env.label}　${new Date(env.savedAt).toLocaleString()}` : '（空）'}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 rounded-2xl border border-ink/15 bg-white/75 p-3.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-bold text-ink">電腦教室存檔碼（跨機／防還原用）</span>
            <p className="text-xs text-ink/65">
              {mode === 'save' ? '換座位或使用公共電腦前，可複製存檔碼保存進度' : '從別台電腦複製來的 SEOJ1: 存檔碼可在此貼上繼續'}
            </p>
          </div>
          {mode === 'save' && (
            <button
              type="button"
              data-testid="save-code-copy"
              onClick={() => void copyCode()}
              className="btn-pastel px-3.5 py-1 text-xs"
            >
              複製目前進度存檔碼
            </button>
          )}
        </div>
        {mode === 'save' && codeText && (
          <input
            readOnly
            value={codeText}
            onFocus={(e) => e.target.select()}
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white px-3 py-1.5 font-mono text-xs text-ink"
          />
        )}
        {mode === 'load' && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={codeText}
              onChange={(e) => setCodeText(e.target.value)}
              placeholder="在此貼上 SEOJ1:... 存檔碼"
              className="flex-1 rounded-xl border border-ink/25 bg-white px-3 py-1.5 font-mono text-xs text-ink"
            />
            <button
              type="button"
              data-testid="load-code-apply"
              onClick={() => void applyCode()}
              className="btn-pastel shrink-0 px-4 py-1 text-xs"
            >
              以存檔碼還原
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 h-6 text-center text-base" data-testid="saveload-msg">{msg}</p>
    </Panel>
  )
}
