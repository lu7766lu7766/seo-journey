import { useState } from 'react'
import { Background } from '@/art/backgrounds'
import { CharacterSprite } from '@/art/characters'
import { DEFAULT_PLAYER_NAME } from '@/content/characters'
import { SCENE_IDS } from '@/content/scenes'
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
    const entryScene = SCENE_IDS.includes('prologue') ? 'prologue' : 'demo'
    await useGame.getState().startScene(entryScene)
  }

  return (
    <div className="relative h-full w-full overflow-hidden" data-testid="title">
      <Background id="gate" time="day" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(255,248,242,0.88) 0%, rgba(255,248,242,0.52) 48%, rgba(255,248,242,0.12) 100%)' }}
      />

      {/* Trio decorative showcase on the right */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[720px]">
        <div className="absolute bottom-[-30px] left-[20px] h-[560px] w-[336px] opacity-95">
          <CharacterSprite id="mirai" face="smile" />
        </div>
        <div className="absolute bottom-[-30px] right-[-10px] h-[560px] w-[336px] opacity-95">
          <CharacterSprite id="hare" face="happy" />
        </div>
        <div className="absolute bottom-[-20px] left-[190px] h-[600px] w-[360px] drop-shadow-xl">
          <CharacterSprite id="rin" face="smile" />
        </div>
      </div>

      {/* Left title & menu */}
      <div className="relative z-10 flex h-full w-[580px] flex-col justify-center pl-16">
        <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-sm font-bold tracking-wide text-[#d6334a] shadow-sm">
          SEO · AEO · GEO 校園戀愛養成
        </span>
        <h1 className="font-title text-7xl font-bold tracking-tight text-[#251e38] drop-shadow-[0_4px_0_rgba(255,255,255,0.95)]">
          搜尋戀曲
        </h1>
        <p className="mb-10 mt-3 font-title text-2xl font-bold text-[#4b3e66]">
          ～青葉學園網站研究社～
        </p>

        {step === 'menu' ? (
          <div className="flex w-72 flex-col gap-3">
            <button className="btn-pastel py-2.5 text-2xl" onClick={() => setStep('name')}>開始遊戲</button>
            <button className="btn-pastel py-2.5 text-2xl disabled:opacity-40" disabled={!latest} onClick={() => latest && loadSlot(latest.slot)}>繼續</button>
            <button className="btn-pastel py-2.5 text-2xl" onClick={() => useUI.getState().setOverlay('load')}>讀檔</button>
            <button className="btn-pastel py-2.5 text-2xl" data-testid="title-gallery" onClick={() => useUI.getState().openGallery('cards')}>圖鑑・相簿</button>
            <button className="btn-pastel py-2.5 text-2xl" onClick={() => useUI.getState().setOverlay('settings')}>設定</button>
          </div>
        ) : (
          <form className="glass flex w-96 flex-col gap-4 rounded-3xl p-6" onSubmit={(e) => { e.preventDefault(); void start() }}>
            <label className="font-title text-xl font-bold" htmlFor="pname">請輸入你的名字</label>
            <input id="pname" autoFocus maxLength={8} value={name} onChange={(e) => setName(e.target.value)} className="select-text rounded-xl border-2 border-sakura/60 bg-white px-4 py-2 text-xl" />
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-pastel" onClick={() => setStep('menu')}>返回</button>
              <button type="submit" className="btn-pastel" data-testid="name-ok">決定</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
