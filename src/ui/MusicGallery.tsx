import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { audioPreview } from '@/audio'
import { resolveVariant, type AudioManifest, type ManifestEntry, type ManifestItem } from '@/audio/manifest'
import { useSettings } from '@/store/settings'
import { useUI } from '@/store/ui'

/** 背景音樂：曲名與用途（順序即畫面順序） */
const BGM_TRACKS: { id: string; name: string; usage: string }[] = [
  { id: 'title', name: '直到你找到我', usage: '標題曲' },
  { id: 'daily', name: '404 號社辦的日常', usage: '校園日常' },
  { id: 'warm', name: '放學後的晚霞', usage: '溫馨心動' },
  { id: 'tense', name: '演算法的大雨', usage: '緊張' },
  { id: 'festival', name: '搜尋祭', usage: '祭典' },
]

/** 音效：中文名與觸發情境 */
const SFX_SOUNDS: { id: string; name: string; usage: string }[] = [
  { id: 'click', name: '輕點', usage: '推進對白、按鈕' },
  { id: 'blip', name: '打字逐字聲', usage: '對白逐字顯示' },
  { id: 'choice', name: '選擇選項', usage: '劇情選項' },
  { id: 'card', name: '解鎖知識卡', usage: '獲得知識卡' },
  { id: 'grow', name: '能力上升', usage: '能力數值增加' },
  { id: 'bond', name: '好感上升', usage: '好感度增加' },
  { id: 'fail', name: '失誤／倒下', usage: '小遊戲失誤、體力歸零' },
  { id: 'win', name: '小遊戲過關', usage: '小遊戲完成' },
]

type Tab = 'bgm' | 'sfx'

/** c1→A、c2→B…；其他 id 直接大寫 */
export function variantLabel(variant: string): string {
  const m = /^c(\d+)$/.exec(variant)
  return m ? `版本 ${String.fromCharCode(64 + Number(m[1]))}` : `版本 ${variant.toUpperCase()}`
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-[#9fd3f0]" role="status" aria-label="載入中" data-testid="music-spinner" />
}

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
      <rect x="4" y="3" width="4" height="14" rx="1" />
      <rect x="12" y="3" width="4" height="14" rx="1" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M6 3.5v13l11-6.5z" />
    </svg>
  )
}

function AdoptButton({ adopted, onClick, testId }: { adopted: boolean; onClick: () => void; testId: string }) {
  return adopted ? (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#b5ead7]/70 bg-[#b5ead7]/20 px-3 py-1 text-sm font-bold text-[#b5ead7]"
      data-testid={testId}
      data-adopted="true"
    >
      ✓ 遊戲中採用
    </span>
  ) : (
    <button type="button" className="btn-pastel whitespace-nowrap px-3 py-1 text-sm" onClick={onClick} data-testid={testId} data-adopted="false">
      採用這版
    </button>
  )
}

/** 播放進度：播放中用 rAF 直接更新 DOM（不重繪 React），暫停時停在暫停處 */
function TrackProgress({ status, entry }: { status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'; entry: ManifestEntry }) {
  const bar = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const total0 = entry.duration ?? 0
    const paint = () => {
      const idle = status === 'idle' || status === 'loading' || status === 'error'
      const pos = idle ? 0 : audioPreview.position()
      const total = (idle ? undefined : audioPreview.duration()) ?? total0
      if (bar.current) bar.current.style.width = total > 0 ? `${Math.min(100, (pos / total) * 100)}%` : '0%'
      if (label.current) label.current.textContent = `${formatTime(pos)} / ${total > 0 ? formatTime(total) : '--:--'}`
    }
    paint()
    if (status !== 'playing') return
    let raf = 0
    const tick = () => {
      paint()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status, entry])

  const total = entry.duration ?? 0
  const loopL = total > 0 && entry.loopStart !== undefined ? (entry.loopStart / total) * 100 : 0
  const loopR = total > 0 && entry.loopEnd !== undefined ? (entry.loopEnd / total) * 100 : 100
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/12" aria-hidden="true" title="亮色區段為無縫循環範圍">
        <div className="absolute inset-y-0 bg-white/12" style={{ left: `${loopL}%`, width: `${Math.max(0, loopR - loopL)}%`, background: 'rgba(159,211,240,0.22)' }} />
        <div ref={bar} className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#9fd3f0] to-[#f7b8c8]" style={{ width: 0 }} />
      </div>
      <span ref={label} className="w-[84px] shrink-0 text-right font-mono text-xs tabular-nums text-white/75" data-testid="music-time" />
    </div>
  )
}

function BgmVariantCard({ id, variant, entry, adopted, onAdopt }: { id: string; variant: string; entry: ManifestEntry; adopted: boolean; onAdopt: () => void }) {
  const preview = useSyncExternalStore(audioPreview.subscribe, audioPreview.getState)
  const mine = preview && preview.id === id && preview.variant === variant ? preview.status : 'idle'
  const toggle = () => {
    if (mine === 'playing') audioPreview.pause()
    else if (mine === 'loading') audioPreview.stop()
    else audioPreview.playBgm(id, variant, mine === 'paused')
  }
  const label = mine === 'playing' ? '暫停' : mine === 'loading' ? '載入中，點擊取消' : '播放'
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-2xl border px-3 py-2 transition ${
        adopted ? 'border-[#f7b8c8] bg-[#f7b8c8]/12 shadow-[0_0_18px_rgba(247,184,200,0.3)]' : 'border-white/14 bg-white/[0.045]'
      }`}
      data-testid={`bgm-card-${id}-${variant}`}
      data-adopted={adopted ? 'true' : 'false'}
      data-status={mine}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={`${label}：${variantLabel(variant)}`}
          title={label}
          data-testid={`bgm-play-${id}-${variant}`}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-white transition hover:border-[#f7b8c8] hover:bg-white/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#7ee8fa] ${
            mine === 'playing' ? 'border-[#9fd3f0] bg-[#9fd3f0]/20' : 'border-white/35 bg-white/[0.06]'
          }`}
        >
          {mine === 'loading' ? <Spinner /> : <PlayIcon playing={mine === 'playing'} />}
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-title text-lg font-bold text-white">{variantLabel(variant)}</div>
          {mine === 'error' && <div className="text-xs text-[#ffb4b4]">載入失敗，請再試一次</div>}
        </div>
        <AdoptButton adopted={adopted} onClick={onAdopt} testId={`bgm-adopt-${id}-${variant}`} />
      </div>
      <TrackProgress status={mine} entry={entry} />
    </div>
  )
}

function SfxVariantCell({ id, variant, entry, adopted, onAdopt }: { id: string; variant: string; entry: ManifestEntry; adopted: boolean; onAdopt: () => void }) {
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(false), 450)
    return () => clearTimeout(t)
  }, [flash])
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 transition ${
        adopted ? 'border-[#f7b8c8] bg-[#f7b8c8]/12 shadow-[0_0_14px_rgba(247,184,200,0.28)]' : 'border-white/14 bg-white/[0.045]'
      }`}
      data-testid={`sfx-cell-${id}-${variant}`}
      data-adopted={adopted ? 'true' : 'false'}
    >
      <button
        type="button"
        onClick={() => {
          audioPreview.playSfx(id, variant)
          setFlash(true)
        }}
        aria-label={`試聽 ${variantLabel(variant)}`}
        title="試聽"
        data-testid={`sfx-play-${id}-${variant}`}
        className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-bold text-white transition hover:border-[#f7b8c8] hover:bg-white/10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#7ee8fa] ${
          flash ? 'border-[#9fd3f0] bg-[#9fd3f0]/25' : 'border-white/35 bg-white/[0.06]'
        }`}
      >
        <PlayIcon playing={false} />
        {variantLabel(variant).replace('版本 ', '')}
      </button>
      {entry.synth && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white/80">合成</span>}
      <div className="ml-auto">
        <AdoptButton adopted={adopted} onClick={onAdopt} testId={`sfx-adopt-${id}-${variant}`} />
      </div>
    </div>
  )
}

function Missing() {
  return <div className="rounded-2xl border border-dashed border-white/20 px-4 py-3 text-sm text-white/55">尚未提供音檔，遊戲中使用合成聲。</div>
}

export function MusicGallery() {
  const [tab, setTab] = useState<Tab>('bgm')
  const [manifest, setManifest] = useState<AudioManifest | null>(null)
  const chosen = useSettings((s) => s.audioVariants)
  const setAudioVariant = useSettings((s) => s.setAudioVariant)
  const musicOn = useSettings((s) => s.musicOn)
  const sfxOn = useSettings((s) => s.sfxOn)
  const close = () => useUI.getState().setOverlay(null)

  // 進入時遊戲 BGM（標題曲）淡出，離開時依採用的版本恢復
  useEffect(() => {
    audioPreview.begin()
    return () => audioPreview.end()
  }, [])
  useEffect(() => {
    let alive = true
    void audioPreview.manifest().then((m) => alive && setManifest(m))
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const adoptedOf = (type: 'bgm' | 'sfx', id: string, item: ManifestItem) => resolveVariant(item, chosen[`${type}/${id}`])
  const muted = tab === 'bgm' ? !musicOn : !sfxOn

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => {
        setTab(t)
        if (t === 'sfx') audioPreview.stop()
      }}
      data-testid={`music-tab-${t}`}
      aria-pressed={tab === t}
      className={`rounded-full px-5 py-1.5 font-title text-lg font-bold transition ${
        tab === t ? 'bg-[#d6334a] text-white shadow-sm' : 'border border-white/25 bg-white/[0.06] text-white/85 hover:bg-white/15'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#050711]/80 backdrop-blur-sm" data-testid="music-gallery" onClick={(e) => e.stopPropagation()}>
      <div className="vn-box flex h-[680px] w-[1208px] flex-col rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(180deg, rgba(16,22,46,0.97) 0%, rgba(10,14,32,0.99) 100%)' }} role="dialog" aria-label="音樂鑑賞">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-title text-3xl font-bold tracking-wide">音樂鑑賞</h2>
            <p className="mt-0.5 text-sm text-white/65">每首都有多個版本，試聽後按「採用這版」，遊戲就會改用那一版（記在這個瀏覽器）。</p>
          </div>
          <button type="button" className="hud-pill px-5 py-2 text-base font-bold" onClick={close} data-testid="music-close">
            返回 (Esc)
          </button>
        </div>

        <div className="mb-2.5 flex items-center gap-2">
          {tabBtn('bgm', '背景音樂')}
          {tabBtn('sfx', '音效')}
          {muted && (
            <span className="ml-3 flex items-center gap-2 text-sm text-[#f7b8c8]" data-testid="music-muted-hint">
              {tab === 'bgm' ? '音樂' : '音效'}已關閉，聽不到試聽。
              <button
                type="button"
                className="rounded-full border border-[#f7b8c8]/60 bg-[#f7b8c8]/15 px-3 py-0.5 text-sm font-bold text-[#ffd9e3] hover:bg-[#f7b8c8]/30"
                data-testid="music-muted-enable"
                onClick={() => useSettings.getState().set(tab === 'bgm' ? { musicOn: true } : { sfxOn: true })}
              >
                開啟{tab === 'bgm' ? '音樂' : '音效'}
              </button>
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1" data-testid={`music-section-${tab}`}>
          {!manifest ? (
            <div className="flex h-full items-center justify-center gap-2 text-white/70"><Spinner /> 讀取音檔清單…</div>
          ) : tab === 'bgm' ? (
            <div className="flex flex-col gap-2">
              {BGM_TRACKS.map((t) => {
                const item = manifest[`bgm/${t.id}`]
                const adopted = item ? adoptedOf('bgm', t.id, item) : null
                return (
                  <div key={t.id} className="grid grid-cols-[200px_1fr] items-center gap-4" data-testid={`bgm-row-${t.id}`}>
                    <div className="leading-tight">
                      <div className="font-title text-xl font-bold">{t.name}</div>
                      <div className="mt-1 inline-block rounded-full border border-[#9fd3f0]/45 bg-[#9fd3f0]/10 px-2.5 py-0.5 text-xs font-bold text-[#9fd3f0]">{t.usage}</div>
                    </div>
                    {item ? (
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(item.variants).map(([v, entry]) => (
                          <BgmVariantCard key={v} id={t.id} variant={v} entry={entry} adopted={adopted === v} onAdopt={() => setAudioVariant(`bgm/${t.id}`, v)} />
                        ))}
                      </div>
                    ) : (
                      <Missing />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {SFX_SOUNDS.map((t) => {
                const item = manifest[`sfx/${t.id}`]
                const adopted = item ? adoptedOf('sfx', t.id, item) : null
                return (
                  <div key={t.id} className="grid grid-cols-[170px_1fr] items-center gap-4" data-testid={`sfx-row-${t.id}`}>
                    <div className="leading-tight">
                      <div className="font-title text-lg font-bold">{t.name}</div>
                      <div className="text-xs text-white/55">{t.usage}</div>
                    </div>
                    {item ? (
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(item.variants).map(([v, entry]) => (
                          <SfxVariantCell key={v} id={t.id} variant={v} entry={entry} adopted={adopted === v} onAdopt={() => setAudioVariant(`sfx/${t.id}`, v)} />
                        ))}
                      </div>
                    ) : (
                      <Missing />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-2 border-t border-white/15 pt-2 text-center text-xs leading-relaxed text-white/60" data-testid="music-credits">
          背景音樂：ACE-Step 生成（Apache 2.0）　·　音效：Stable Audio Open 生成 — Powered by Stability AI
        </div>
      </div>
    </div>
  )
}

export default MusicGallery
