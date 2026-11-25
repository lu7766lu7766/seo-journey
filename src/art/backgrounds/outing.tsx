import { StarParticles } from './Particles'

export function OutingBackground({ id, night }: { id: string; night: boolean }) {
  switch (id) {
    case 'street':
      return (
        <g>
          <defs>
            <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={night ? '#0b1029' : '#3a8ee6'} />
              <stop offset="0.55" stopColor={night ? '#202b59' : '#a8dcff'} />
              <stop offset="1" stopColor={night ? '#2c254d' : '#ffdfbf'} />
            </linearGradient>
            <linearGradient id="st-road" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={night ? '#2a2a42' : '#c4b8bf'} />
              <stop offset="1" stopColor={night ? '#161628' : '#7f7585'} />
            </linearGradient>
            <radialGradient id="st-sun" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="rgba(255, 240, 195, 0.85)" />
              <stop offset="0.5" stopColor="rgba(255, 200, 145, 0.25)" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
            <filter id="st-glow"><feGaussianBlur stdDeviation="14" /></filter>
          </defs>
          <rect width="1280" height="720" fill="url(#st-sky)" />
          {night && <StarParticles />}
          {/* Volumetric clouds & warm sun glow */}
          <ellipse cx="300" cy="115" rx="180" ry="38" fill="rgba(255,255,255,0.55)" opacity={night ? 0.12 : 0.85} />
          <ellipse cx="420" cy="100" rx="120" ry="32" fill="rgba(255,255,255,0.75)" opacity={night ? 0.12 : 0.9} />
          <circle cx="980" cy="145" r="210" fill="url(#st-sun)" opacity={night ? 0.12 : 0.9} />
          {/* Distant city skyline with atmospheric haze */}
          <path d="M0 500 H180 V380 H260 V440 H410 V350 H520 V430 H880 V360 H990 V420 H1140 V370 H1280 V520 H0 Z" fill={night ? '#151b38' : '#89a3c4'} opacity="0.62" />
          {/* Paved stone shopping arcade with sunlight wash */}
          <rect x="0" y="515" width="1280" height="205" fill="url(#st-road)" />
          <ellipse cx="640" cy="610" rx="460" ry="70" fill="rgba(255, 224, 180, 0.25)" />
          <path d="M0 560 H1280 M0 615 H1280 M0 675 H1280" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
          {/* Shops with richer eaves & window reflections */}
          <rect x="40" y="195" width="380" height="325" fill="#f7e3d4" stroke="#5e4b4a" strokeWidth="3" />
          <rect x="435" y="145" width="415" height="375" fill="#f9f0e4" stroke="#4f4140" strokeWidth="3" />
          <rect x="865" y="210" width="375" height="310" fill="#e7eff7" stroke="#4e5668" strokeWidth="3" />
          <path d="M30 310 H430 L412 362 H48 Z" fill="#d95f76" stroke="#6e2e3d" strokeWidth="2.5" />
          <path d="M425 288 H860 L842 344 H443 Z" fill="#3b6ea5" stroke="#224066" strokeWidth="2.5" />
          <path d="M855 320 H1250 L1232 372 H873 Z" fill="#e89444" stroke="#7d4a1b" strokeWidth="2.5" />
          {/* Storefront signage */}
          <rect x="520" y="205" width="245" height="58" rx="6" fill="#233252" stroke="#e8c474" strokeWidth="2.5" />
          <text x="642" y="244" textAnchor="middle" fontSize="28" fontWeight="700" fill="#fffaf0">青葉書店</text>
          {/* Warm glowing shop windows + diagonal specular streaks */}
          {[
            [95, 388, 270, 118, '#6c5856'],
            [495, 375, 295, 130, '#5d4d4c'],
            [920, 395, 260, 110, '#5c6478'],
          ].map(([wx, wy, ww, wh, st], idx) => (
            <g key={idx}>
              <rect x={wx} y={wy} width={ww} height={wh} rx="4" fill={night ? '#ffd573' : '#d5ecfa'} stroke={String(st)} strokeWidth="3" />
              <polygon
                points={`${Number(wx) + 25},${wy} ${Number(wx) + 75},${wy} ${Number(wx) + 35},${Number(wy) + Number(wh)} ${Number(wx)},${Number(wy) + Number(wh)}`}
                fill="rgba(255,255,255,0.35)"
              />
            </g>
          ))}
          {/* Hanging street lanterns & power lines */}
          <path d="M0 95 Q640 165 1280 85 M0 120 Q640 190 1280 112" stroke="rgba(45,42,64,0.45)" strokeWidth="2" fill="none" />
          {[220, 440, 840, 1060].map((lx) => (
            <g key={lx} transform={`translate(${lx}, 152)`}>
              <circle cx="0" cy="0" r="24" fill="rgba(255, 220, 140, 0.32)" filter="url(#st-glow)" />
              <circle cx="0" cy="0" r="7" fill="#fff4cc" stroke="#4f4140" strokeWidth="1.5" />
            </g>
          ))}
        </g>
      )

    case 'planetarium':
      return (
        <g>
          <defs>
            <radialGradient id="dome-sky" cx="50%" cy="32%" r="72%">
              <stop offset="0" stopColor="#4c3e9e" />
              <stop offset="0.45" stopColor="#1f194d" />
              <stop offset="1" stopColor="#09081a" />
            </radialGradient>
            <radialGradient id="nebula-glow" cx="35%" cy="30%" r="45%">
              <stop offset="0" stopColor="rgba(72, 224, 240, 0.34)" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="nebula-pink" cx="72%" cy="38%" r="42%">
              <stop offset="0" stopColor="rgba(214, 102, 230, 0.24)" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
            <filter id="pl-glow"><feGaussianBlur stdDeviation="6" /></filter>
          </defs>
          <rect width="1280" height="720" fill="url(#dome-sky)" />
          <rect width="1280" height="720" fill="url(#nebula-glow)" />
          <rect width="1280" height="720" fill="url(#nebula-pink)" />
          <StarParticles />
          {/* Glowing constellation network */}
          <g stroke="#6cf0f5" strokeWidth="2.2" opacity="0.72" filter="url(#pl-glow)">
            <polyline points="220,235 345,165 480,240 620,145 760,210 920,150 1070,225" fill="none" />
            <polyline points="345,165 410,305 565,280 620,145" fill="none" />
          </g>
          <g stroke="#b8fbff" strokeWidth="1.4" opacity="0.9">
            <polyline points="220,235 345,165 480,240 620,145 760,210 920,150 1070,225" fill="none" />
          </g>
          {[[220, 235], [345, 165], [480, 240], [620, 145], [760, 210], [920, 150], [1070, 225]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5.5" fill="#ffffff" />
          ))}
          {/* Curved dome sill & plush seating */}
          <path d="M0 545 Q640 480 1280 545 L1280 720 L0 720 Z" fill="#100e26" />
          <circle cx="640" cy="520" r="56" fill="#232048" stroke="#7d72c8" strokeWidth="3" />
          <circle cx="640" cy="520" r="24" fill="#5ce8ed" opacity="0.75" filter="url(#pl-glow)" />
          <circle cx="640" cy="520" r="14" fill="#d8feff" />
        </g>
      )

    case 'beach':
      return (
        <g>
          <defs>
            <linearGradient id="bch-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={night ? '#0f1838' : '#3a9be8'} />
              <stop offset="0.6" stopColor={night ? '#263469' : '#9ee0ff'} />
              <stop offset="1" stopColor="#fff3d9" />
            </linearGradient>
            <linearGradient id="bch-sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={night ? '#1c3b66' : '#268bd2'} />
              <stop offset="1" stopColor={night ? '#2a5a8a' : '#6be0ec'} />
            </linearGradient>
            <linearGradient id="bch-sand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#faecc8" />
              <stop offset="1" stopColor="#e8c796" />
            </linearGradient>
            <filter id="bch-blur"><feGaussianBlur stdDeviation="16" /></filter>
          </defs>
          <rect width="1280" height="720" fill="url(#bch-sky)" />
          {night && <StarParticles />}
          <circle cx="880" cy="210" r="110" fill="#fff7d6" opacity={night ? 0.12 : 0.75} filter="url(#bch-blur)" />
          {/* Distant coastal peninsula */}
          <path d="M0 375 L220 335 L420 375 Z" fill={night ? '#19264a' : '#6e9ec2'} opacity="0.7" />
          {/* Shimmering ocean */}
          <rect x="0" y="370" width="1280" height="165" fill="url(#bch-sea)" />
          <g stroke="rgba(255,255,255,0.6)" strokeWidth="3.5" strokeLinecap="round">
            <line x1="810" y1="395" x2="950" y2="395" />
            <line x1="770" y1="422" x2="990" y2="422" />
            <line x1="830" y1="452" x2="940" y2="452" />
          </g>
          {/* Foam & golden sand */}
          <path d="M0 520 Q320 495 640 518 T1280 515 L1280 720 L0 720 Z" fill="url(#bch-sand)" />
          <path d="M0 520 Q320 495 640 518 T1280 515" stroke="#ffffff" strokeWidth="10" opacity="0.88" fill="none" />
          {/* Luminous clouds */}
          <ellipse cx="260" cy="150" rx="140" ry="42" fill="rgba(255,255,255,0.8)" />
          <ellipse cx="340" cy="130" rx="95" ry="38" fill="rgba(255,255,255,0.9)" />
        </g>
      )

    case 'festival':
      return (
        <g>
          <defs>
            <linearGradient id="fst-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={night ? '#121338' : '#4d9ce8'} />
              <stop offset="0.6" stopColor={night ? '#2f2057' : '#a8d9ff'} />
              <stop offset="1" stopColor={night ? '#592e63' : '#ffe1bd'} />
            </linearGradient>
            <radialGradient id="fst-lantern" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="rgba(255, 210, 108, 0.85)" />
              <stop offset="0.5" stopColor="rgba(255, 130, 110, 0.25)" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="fst-spotlight" cx="50%" cy="15%" r="60%">
              <stop offset="0" stopColor="rgba(255, 244, 200, 0.45)" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="1280" height="720" fill="url(#fst-sky)" />
          {night && <StarParticles />}
          <rect width="1280" height="720" fill="url(#fst-spotlight)" />
          {/* Distant festive clouds / bokeh */}
          <ellipse cx="230" cy="145" rx="135" ry="32" fill="rgba(255,255,255,0.45)" opacity={night ? 0.14 : 0.8} />
          <ellipse cx="1050" cy="160" rx="150" ry="36" fill="rgba(255,255,255,0.45)" opacity={night ? 0.14 : 0.8} />
          <rect x="0" y="535" width="1280" height="185" fill={night ? '#45384b' : '#d6beaa'} />
          {/* Courtyard buildings */}
          <rect x="30" y="210" width="230" height="325" fill={night ? '#3d334c' : '#e6d6c8'} stroke="#5c4742" strokeWidth="3" />
          <rect x="1020" y="210" width="230" height="325" fill={night ? '#3d334c' : '#e6d6c8'} stroke="#5c4742" strokeWidth="3" />
          {[0, 1, 2].map((wIdx) => (
            <g key={wIdx}>
              <rect x={65 + wIdx * 58} y="250" width="38" height="58" rx="3" fill="#ffdf8a" opacity={night ? 0.82 : 0.45} />
              <rect x={1055 + wIdx * 58} y="250" width="38" height="58" rx="3" fill="#ffdf8a" opacity={night ? 0.82 : 0.45} />
            </g>
          ))}
          {/* Wooden festival stage with warm backdrop glow */}
          <rect x="190" y="400" width="900" height="150" fill="#6b4534" stroke="#3b2218" strokeWidth="4" />
          <rect x="170" y="388" width="940" height="24" rx="4" fill="#c98e62" stroke="#3b2218" strokeWidth="3" />
          <rect x="382" y="130" width="516" height="104" rx="16" fill="rgba(255,220,160,0.28)" />
          {/* Search Festival Banner */}
          <rect x="390" y="138" width="500" height="88" rx="12" fill="#fffaf2" stroke="#d6334a" strokeWidth="6" />
          <text x="640" y="196" textAnchor="middle" fontSize="42" fontWeight="700" fill="#d6334a">青葉 搜尋祭</text>
          {/* Glowing paper lanterns */}
          <path d="M0 90 Q640 165 1280 90" fill="none" stroke="#3b2218" strokeWidth="3" />
          {[130, 290, 450, 830, 990, 1150].map((x, idx) => {
            const y = idx < 3 ? 115 + idx * 14 : 115 + (5 - idx) * 14
            return (
              <g key={x} transform={`translate(${x}, ${y})`}>
                <circle cx="0" cy="24" r="68" fill="url(#fst-lantern)" />
                <ellipse cx="0" cy="24" rx="22" ry="28" fill={idx % 2 === 0 ? '#ff6f85' : '#ffd25a'} stroke="#47281e" strokeWidth="2.5" />
                <ellipse cx="-6" cy="18" rx="6" ry="12" fill="rgba(255,255,255,0.45)" />
              </g>
            )
          })}
          {/* Crowd silhouettes cheering below stage */}
          <path d="M0 720 V645 Q65 620 120 650 Q180 618 240 655 Q310 628 380 660 L1280 660 V720 Z" fill="#1b152b" opacity="0.32" />
        </g>
      )

    case 'rain':
      return (
        <g>
          <defs>
            <linearGradient id="rn-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2c3a54" />
              <stop offset="0.55" stopColor="#5b7291" />
              <stop offset="1" stopColor="#8da6c2" />
            </linearGradient>
            <linearGradient id="rn-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#46566e" />
              <stop offset="1" stopColor="#263142" />
            </linearGradient>
            <radialGradient id="rn-lamp" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="rgba(255, 224, 150, 0.72)" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
            <filter id="rn-mist"><feGaussianBlur stdDeviation="20" /></filter>
          </defs>
          <rect width="1280" height="720" fill="url(#rn-sky)" />
          {/* Warm distant streetlamps gleaming through mist */}
          <circle cx="290" cy="370" r="110" fill="url(#rn-lamp)" />
          <circle cx="990" cy="355" r="110" fill="url(#rn-lamp)" />
          {/* Misty foliage silhouettes */}
          <circle cx="190" cy="260" r="190" fill="#2c3d54" opacity="0.58" filter="url(#rn-mist)" />
          <circle cx="1090" cy="240" r="200" fill="#2c3d54" opacity="0.58" filter="url(#rn-mist)" />
          {/* School overhang eaves */}
          <polygon points="0,0 1280,0 1280,120 0,75" fill="#1e2738" />
          {/* Wet pavement + glowing puddle reflections */}
          <rect x="0" y="515" width="1280" height="205" fill="url(#rn-floor)" />
          <ellipse cx="290" cy="595" rx="52" ry="120" fill="rgba(255, 215, 130, 0.14)" filter="url(#rn-mist)" />
          <ellipse cx="380" cy="600" rx="125" ry="18" fill="rgba(210,235,255,0.24)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <ellipse cx="890" cy="632" rx="95" ry="14" fill="rgba(210,235,255,0.22)" stroke="rgba(255,255,255,0.48)" strokeWidth="2" />
        </g>
      )

    default:
      return null
  }
}
