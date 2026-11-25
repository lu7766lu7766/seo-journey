/** Lightweight SVG/CSS particle overlays (<= 36 items each). */

const SAKURA_ITEMS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: ((i * 59) % 100),
  delay: -((i * 0.7) % 8),
  dur: 6 + (i % 5) * 1.4,
  size: 10 + (i % 4) * 3,
}))

export function SakuraParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {SAKURA_ITEMS.map((p) => (
        <span
          key={p.id}
          className="sakura-petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.75,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  )
}

const STARS = Array.from({ length: 34 }, (_, i) => ({
  id: i,
  cx: 30 + ((i * 173) % 1220),
  cy: 20 + ((i * 89) % 340),
  r: 1.2 + (i % 3) * 0.9,
  op: 0.4 + (i % 4) * 0.15,
}))

export function StarParticles() {
  return (
    <g>
      {STARS.map((s) => (
        <circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill="#fffdf0" opacity={s.op} />
      ))}
    </g>
  )
}
