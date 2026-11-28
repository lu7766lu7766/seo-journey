import { useEffect, useState } from 'react'
import { audio } from '@/audio'
import { Background } from '@/art/backgrounds'
import { CharacterSprite } from '@/art/characters'
import { useArtImage } from '@/art/hooks'
import { useArtManifest, useArtManifestStatus } from '@/art/manifest'
import { resolveUiSrc } from '@/art/resolve'
import { DEFAULT_PLAYER_NAME } from '@/content/characters'
import { SCENE_IDS } from '@/content/scenes'
import { useGame } from '@/store/game'
import { latestSave } from '@/store/save'
import { useUI } from '@/store/ui'
import { loadSlot } from './SaveLoad'

export function TitleScreen() {
  const manifest = useArtManifest()
  const manifestStatus = useArtManifestStatus()
  const logoSrc = resolveUiSrc(manifest, 'logo')
  const logo = useArtImage(logoSrc)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<'menu' | 'name'>('menu')
  const [name, setName] = useState(DEFAULT_PLAYER_NAME)
  const latest = latestSave()

  // 標題曲；離開標題時若還在播標題曲就淡出（新遊戲／讀檔的劇本 bgm 會接手）
  useEffect(() => {
    audio.bgm('title')
    return () => {
      if (audio.currentBgm === 'title') audio.stopBgm()
    }
  }, [])

  const start = async () => {
    if (busy) return
    setBusy(true)
    try {
      const n = name.trim() || DEFAULT_PLAYER_NAME
      useGame.getState().newGame(n)
      const entryScene = SCENE_IDS.includes('prologue') ? 'prologue' : 'demo'
      // load + preload the prologue first (the loading overlay covers a slow download) and only then leave the title,
      // so the stage never shows its default backdrop or half-loaded art
      await useGame.getState().startScene(entryScene)
      useUI.getState().setScreen('game')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden" data-testid="title">
      <Background id="gate" time="day" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(100deg, rgba(11,16,38,0.88) 0%, rgba(16,22,48,0.62) 48%, rgba(16,22,48,0.12) 100%)',
        }}
      />

      {/* Trio heroines showcase on the right */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[760px]">
        <div className="absolute bottom-[-24px] left-[0px] h-[590px] w-[354px] opacity-95">
          <CharacterSprite id="mirai" face="smile" />
        </div>
        <div className="absolute bottom-[-24px] right-[-20px] h-[590px] w-[354px] opacity-95">
          <CharacterSprite id="hare" face="happy" />
        </div>
        <div className="absolute bottom-[-16px] left-[195px] h-[630px] w-[378px] drop-shadow-[0_18px_36px_rgba(8,12,32,0.65)]">
          <CharacterSprite id="rin" face="smile" />
        </div>
      </div>

      {/* Left title lockup & menu */}
      <div className="relative z-10 flex h-full w-[580px] flex-col justify-center pl-16">
        <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#9fd3f0]/50 bg-[#101836]/80 px-4 py-1 text-sm font-bold tracking-widest text-[#9fd3f0] shadow-[0_0_16px_rgba(159,211,240,0.28)]">
          SEO · AEO · GEO 青春校園戀愛養成
        </span>
        {manifestStatus === 'loading' ? (
          // manifest not settled yet: reserve the logo's space instead of flashing the text fallback
          <div className="mb-8 mt-1 h-[190px]" aria-hidden="true" />
        ) : logoSrc && !logo.failed ? (
          <>
            <h1 className="sr-only">直到你找到我 ～青葉學園網站研究社～</h1>
            <img {...logo.imgProps} src={logoSrc} alt="" draggable={false} className="art-fade mb-8 mt-1 h-auto max-h-[190px] w-auto max-w-[500px] select-none object-contain object-left drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)]" style={{ opacity: logo.loaded ? 1 : 0 }} data-testid="title-logo" />
          </>
        ) : (
          <>
            <h1 className="font-title text-7xl font-bold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(159,211,240,0.45)]">
              直到你找到我
            </h1>
            <p className="mb-10 mt-3 font-title text-2xl font-bold tracking-wide text-[#f7b8c8] drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
              ～青葉學園網站研究社～
            </p>
          </>
        )}

        {step === 'menu' ? (
          <div className="flex w-72 flex-col gap-3">
            <button className="choice-btn rounded-full px-6 py-3 text-center text-xl font-bold tracking-wide" onClick={() => setStep('name')}>
              開始遊戲
            </button>
            <button className="choice-btn rounded-full px-6 py-3 text-center text-xl font-bold tracking-wide disabled:opacity-40" disabled={!latest} onClick={() => latest && loadSlot(latest.slot)}>
              繼續
            </button>
            <button className="choice-btn rounded-full px-6 py-3 text-center text-xl font-bold tracking-wide" onClick={() => useUI.getState().setOverlay('load')}>
              讀檔
            </button>
            <button className="choice-btn rounded-full px-6 py-3 text-center text-xl font-bold tracking-wide" onClick={() => useUI.getState().openGallery('cards')}>
              圖鑑・相簿
            </button>
            <button className="choice-btn rounded-full px-6 py-3 text-center text-xl font-bold tracking-wide" onClick={() => useUI.getState().setOverlay('settings')}>
              設定
            </button>
          </div>
        ) : (
          <form className="vn-box flex w-96 flex-col gap-4 rounded-3xl p-6 text-white" onSubmit={(e) => { e.preventDefault(); void start() }}>
            <label className="font-title text-xl font-bold text-[#9fd3f0]" htmlFor="pname">請輸入你的名字</label>
            <input id="pname" autoFocus maxLength={8} value={name} onChange={(e) => setName(e.target.value)} className="select-text rounded-xl border-2 border-[#9fd3f0]/60 bg-[#0b1024] px-4 py-2 text-xl text-white" />
            <div className="flex justify-end gap-3">
              <button type="button" className="hud-pill px-5 py-2" onClick={() => setStep('menu')}>返回</button>
              <button type="submit" className="btn-pastel px-6 py-2" data-testid="name-ok">決定</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
