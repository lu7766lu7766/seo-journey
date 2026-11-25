import { useState } from 'react'
import { DEFAULT_PLAYER_NAME } from '@/content/characters'
import { useGame } from '@/store/game'
import { latestSave } from '@/store/save'
import { useUI } from '@/store/ui'
import { loadSlot } from './SaveLoad'

export function TitleScreen() {
  const [step, setStep] = useState<'menu' | 'name'>('menu')
  const [name, setName] = useState(DEFAULT_PLAYER_NAME)
  const latest = latestSave()

  const start = async () => {
    const n = name.trim() || DEFAULT_PLAYER_NAME
    useGame.getState().newGame(n)
    useUI.getState().setScreen('game')
    await useGame.getState().startScene('demo')
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-sakura via-cream to-sky" data-testid="title">
      <h1 className="font-title text-7xl font-bold text-ink drop-shadow-[0_4px_0_rgba(255,255,255,.8)]">搜尋戀曲</h1>
      <p className="mb-14 mt-3 font-title text-2xl text-ink/70">～青葉學園網站研究社～</p>
      {step === 'menu' ? (
        <div className="flex w-72 flex-col gap-4">
          <button className="btn-pastel py-3 text-2xl" onClick={() => setStep('name')}>開始遊戲</button>
          <button className="btn-pastel py-3 text-2xl disabled:opacity-40" disabled={!latest} onClick={() => latest && loadSlot(latest.slot)}>繼續</button>
          <button className="btn-pastel py-3 text-2xl" onClick={() => useUI.getState().setOverlay('load')}>讀檔</button>
          <button className="btn-pastel py-3 text-2xl" onClick={() => useUI.getState().setOverlay('settings')}>設定</button>
        </div>
      ) : (
        <form className="glass flex w-96 flex-col gap-4 rounded-3xl p-6" onSubmit={(e) => { e.preventDefault(); void start() }}>
          <label className="font-title text-xl" htmlFor="pname">請輸入你的名字</label>
          <input id="pname" autoFocus maxLength={8} value={name} onChange={(e) => setName(e.target.value)} className="select-text rounded-xl border-2 border-white bg-white/80 px-4 py-2 text-xl" />
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-pastel" onClick={() => setStep('menu')}>返回</button>
            <button type="submit" className="btn-pastel" data-testid="name-ok">決定</button>
          </div>
        </form>
      )}
    </div>
  )
}
