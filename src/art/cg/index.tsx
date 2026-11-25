import type { CgId } from '@/content/cgs'
import { Background } from '../backgrounds'
import { CharacterSprite } from '../characters'
import { useArtManifest } from '../manifest'

const CG_CONFIG: Record<
  CgId,
  {
    bg: Parameters<typeof Background>[0]['id']
    time: 'day' | 'dusk' | 'night'
    title: string
    overlay: string
    chars: { id: 'rin' | 'hare' | 'mirai' | 'sensei' | 'kuro'; face: 'happy' | 'blush' | 'smile' | 'sad' | 'shock'; x: number; scale?: number }[]
  }
> = {
  'date-rin-3': {
    bg: 'festival',
    time: 'night',
    title: '夏夜煙火下的微笑',
    overlay: 'radial-gradient(circle at 50% 25%, rgba(255,190,210,0.32), transparent 65%)',
    chars: [{ id: 'rin', face: 'blush', x: 640, scale: 1.08 }],
  },
  'date-hare-3': {
    bg: 'beach',
    time: 'dusk',
    title: '海風與一句話的告白',
    overlay: 'radial-gradient(circle at 60% 25%, rgba(255,210,130,0.35), transparent 65%)',
    chars: [{ id: 'hare', face: 'blush', x: 640, scale: 1.08 }],
  },
  'date-mirai-3': {
    bg: 'rooftop',
    time: 'night',
    title: '星光與被引用的來源',
    overlay: 'radial-gradient(circle at 50% 20%, rgba(110,240,245,0.28), transparent 65%)',
    chars: [{ id: 'mirai', face: 'happy', x: 640, scale: 1.08 }],
  },
  'end-true': {
    bg: 'festival',
    time: 'day',
    title: '搜尋祭的三重奏',
    overlay: 'radial-gradient(circle at 50% 20%, rgba(255,250,210,0.4), transparent 70%)',
    chars: [
      { id: 'rin', face: 'happy', x: 310, scale: 0.96 },
      { id: 'hare', face: 'happy', x: 640, scale: 1.0 },
      { id: 'mirai', face: 'happy', x: 970, scale: 0.96 },
    ],
  },
  'end-rin': {
    bg: 'gate',
    time: 'dusk',
    title: '索引之外的心意',
    overlay: 'radial-gradient(circle at 50% 30%, rgba(247,184,200,0.35), transparent 65%)',
    chars: [{ id: 'rin', face: 'blush', x: 640, scale: 1.1 }],
  },
  'end-hare': {
    bg: 'broadcast',
    time: 'dusk',
    title: '一句話的告白',
    overlay: 'radial-gradient(circle at 50% 30%, rgba(255,210,120,0.3), transparent 65%)',
    chars: [{ id: 'hare', face: 'happy', x: 640, scale: 1.1 }],
  },
  'end-mirai': {
    bg: 'planetarium',
    time: 'night',
    title: '被你引用的我',
    overlay: 'radial-gradient(circle at 50% 28%, rgba(80,220,235,0.3), transparent 65%)',
    chars: [{ id: 'mirai', face: 'blush', x: 640, scale: 1.1 }],
  },
  'end-normal': {
    bg: 'clubroom',
    time: 'dusk',
    title: '404 社辦的明天',
    overlay: 'radial-gradient(circle at 50% 30%, rgba(255,235,200,0.28), transparent 70%)',
    chars: [
      { id: 'sensei', face: 'smile', x: 420, scale: 0.96 },
      { id: 'rin', face: 'smile', x: 840, scale: 0.96 },
    ],
  },
  'end-bad': {
    bg: 'clubroom',
    time: 'night',
    title: '404 Not Found',
    overlay: 'radial-gradient(circle at 50% 50%, rgba(20,24,48,0.28), rgba(10,12,26,0.55))',
    chars: [{ id: 'sensei', face: 'sad', x: 640, scale: 1.0 }],
  },
  'end-blackhat': {
    bg: 'council',
    time: 'dusk',
    title: '人工處罰的代價',
    overlay: 'radial-gradient(circle at 50% 30%, rgba(214,51,74,0.25), transparent 70%)',
    chars: [
      { id: 'kuro', face: 'shock', x: 420, scale: 0.98 },
      { id: 'rin', face: 'smile', x: 840, scale: 0.98 },
    ],
  },
}

/** Event CG (1280x720): uses bespoke artwork from manifest when present, otherwise composes background + sprites. */
export function CgArt({ id }: { id: CgId }) {
  const cfg = CG_CONFIG[id]
  const manifest = useArtManifest()
  const entry = manifest[`cg/${id}`]
  const cgSrc = typeof entry === 'string' ? entry : entry ? `/art/cg/${id}.png` : null

  return (
    <div className="relative h-full w-full overflow-hidden" data-testid={`cg-${id}`}>
      {cgSrc ? (
        <img src={cgSrc} alt={cfg.title} draggable={false} className="h-full w-full object-cover" />
      ) : (
        <>
          <Background id={cfg.bg} time={cfg.time} />
          <div className="pointer-events-none absolute inset-0" style={{ background: cfg.overlay }} />

          {(id === 'date-rin-3' || id === 'end-true') && (
            <svg viewBox="0 0 1280 720" className="pointer-events-none absolute inset-0 h-full w-full">
              {[
                [240, 140, '#ff8aa8'],
                [1020, 160, '#ffd466'],
                [640, 105, '#7de3f4'],
              ].map(([cx, cy, color], idx) => (
                <g key={idx} transform={`translate(${cx} ${cy})`} stroke={String(color)} strokeWidth="3" opacity="0.85">
                  {Array.from({ length: 12 }, (_, a) => {
                    const rad = (a * Math.PI) / 6
                    return <line key={a} x1={Math.cos(rad) * 18} y1={Math.sin(rad) * 18} x2={Math.cos(rad) * 62} y2={Math.sin(rad) * 62} strokeLinecap="round" />
                  })}
                </g>
              ))}
            </svg>
          )}

          {cfg.chars.map((c) => {
            const h = 660 * (c.scale ?? 1)
            const w = h * 0.6
            return (
              <div
                key={c.id}
                className="pointer-events-none absolute"
                style={{
                  left: c.x - w / 2,
                  top: 720 - h + 65,
                  width: w,
                  height: h,
                }}
              >
                <CharacterSprite id={c.id} face={c.face} />
              </div>
            )
          })}
        </>
      )}

      <div className="pointer-events-none absolute inset-0 border-[10px] border-white/25" />
      <div className="pointer-events-none absolute right-6 top-5 rounded-full border border-white/25 bg-[#0f1428]/75 px-5 py-1.5 font-title text-lg text-white shadow-lg backdrop-blur-md">
        {cfg.title}
      </div>
    </div>
  )
}
