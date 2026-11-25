import { StarParticles } from './Particles'

export function OutingBackground({ id, night }: { id: string; night: boolean }) {
  switch (id) {
    case 'street':
      return (
        <g>
          <defs>
            <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={night ? '#121836' : '#58a8e8'} />
              <stop offset="0.65" stopColor={night ? '#28315e' : '#bfe4ff'} />
              <stop offset="1" stopColor="#ffe8d6" />
            </linearGradient>
            <linearGradient id="st-road" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b8adb5" />
              <stop offset="1" stopColor="#857b88" />
            </linearGradient>
            <filter id="st-glow"><feGaussianBlur stdDeviation="12" /></filter>
          </defs>
          <rect width="1280" height="720" fill="url(#st-sky)" />
          {night && <StarParticles />}
          {/* Sun / twilight glow */}
          <circle cx="980" cy="140" r="140" fill="#fff5d6" opacity={night ? 0.08 : 0.42} filter="url(#st-glow)" />
          {/* Distant skyline */}
          <path d="M0 500 H180 V380 H260 V440 H410 V350 H520 V430 H880 V360 H990 V420 H1140 V370 H1280 V520 H0 Z" fill={night ? '#1b2244' : '#96adc9'} opacity="0.55" />
          {/* Paved stone shopping arcade */}
          <rect x="0" y="515" width="1280" height="205" fill="url(#st-road)" />
          <path d="M0 560 H1280 M0 615 H1280 M0 675 H1280" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
          {/* Shops */}
          <rect x="40" y="195" width="380" height="325" fill="#f7e3d4" stroke="#6c5856" strokeWidth="3" />
          <rect x="435" y="145" width="415" height="375" fill="#f8efe2" stroke="#5d4d4c" strokeWidth="3" />
          <rect x="865" y="210" width="375" height="310" fill="#e7eff7" stroke="#5c6478" strokeWidth="3" />
          {/* Roofs & Awnings */}
          <path d="M30 310 H430 L412 362 H48 Z" fill="#d95f76" stroke="#6e2e3d" strokeWidth="2.5" />
          <path d="M425 288 H860 L842 344 H443 Z" fill="#3b6ea5" stroke="#224066" strokeWidth="2.5" />
          <path d="M855 320 H1250 L1232 372 H873 Z" fill="#e89444" stroke="#7d4a1b" strokeWidth="2.5" />
          {/* Storefront signage */}
          <rect x="520" y="205" width="245" height="58" rx="6" fill="#233252" stroke="#e8c474" strokeWidth="2.5" />
          <text x="642" y="244" textAnchor="middle" fontSize="28" fontWeight="700" fill="#fffaf0">青葉書店</text>
          {/* Warm glowing shop windows */}
          <rect x="95" y="388" width="270" height="118" rx="4" fill={night ? '#ffd573' : '#d2ebf7'} stroke="#6c5856" strokeWidth="3" />
          <rect x="495" y="375" width="295" height="130" rx="4" fill={night ? '#ffd573' : '#e0f0f8'} stroke="#5d4d4c" strokeWidth="3" />
          <rect x="920" y="395" width="260" height="110" rx="4" fill={night ? '#ffd573' : '#cfe5f5'} stroke="#5c6478" strokeWidth="3" />
          {/* Overhead power lines */}
          <path d="M0 95 Q640 165 1280 85 M0 120 Q640 190 1280 112" stroke="rgba(45,42,64,0.45)" strokeWidth="2" fill="none" />
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
              <stop offset="0" stopColor={night ? '#16173a' : '#73b3f0'} />
              <stop offset="1" stopColor={night ? '#3d2a5c' : '#ffe3bd'} />
            </linearGradient>
            <radialGradient id="fst-lantern" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="rgba(255, 198, 92, 0.72)" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="1280" height="720" fill="url(#fst-sky)" />
          {night && <StarParticles />}
          <rect x="0" y="535" width="1280" height="185" fill="#d6beaa" />
          {/* Courtyard buildings */}
          <rect x="30" y="210" width="230" height="325" fill="#e6d6c8" stroke="#6d564c" strokeWidth="3" />
          <rect x="1020" y="210" width="230" height="325" fill="#e6d6c8" stroke="#6d564c" strokeWidth="3" />
          {/* Wooden festival stage */}
          <rect x="190" y="400" width="900" height="150" fill="#6b4534" stroke="#3b2218" strokeWidth="4" />
          <rect x="170" y="388" width="940" height="24" rx="4" fill="#c98e62" stroke="#3b2218" strokeWidth="3" />
          {/* Search Festival Banner */}
          <rect x="390" y="138" width="500" height="88" rx="12" fill="#fffaf2" stroke="#d6334a" strokeWidth="6" />
          <text x="640" y="196" textAnchor="middle" fontSize="42" fontWeight="700" fill="#d6334a">青葉 搜尋祭</text>
          {/* Glowing paper lanterns */}
          <path d="M0 90 Q640 165 1280 90" fill="none" stroke="#3b2218" strokeWidth="3" />
          {[130, 290, 450, 830, 990, 1150].map((x, idx) => {
            const y = idx < 3 ? 115 + idx * 14 : 115 + (5 - idx) * 14
            return (
              <g key={x} transform={`translate(${x}, ${y})`}>
                <circle cx="0" cy="24" r="56" fill="url(#fst-lantern)" />
                <ellipse cx="0" cy="24" rx="22" ry="28" fill={idx % 2 === 0 ? '#ff6f85' : '#ffd25a'} stroke="#47281e" strokeWidth="2.5" />
              </g>
            )
          })}
        </g>
      )

    case 'rain':
      return (
        <g>
          <defs>
            <linearGradient id="rn-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#465973" />
              <stop offset="0.65" stopColor="#7289a3" />
              <stop offset="1" stopColor="#9ab0c7" />
            </linearGradient>
            <linearGradient id="rn-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#526278" />
              <stop offset="1" stopColor="#354152" />
            </linearGradient>
            <filter id="rn-mist"><feGaussianBlur stdDeviation="20" /></filter>
          </defs>
          <rect width="1280" height="720" fill="url(#rn-sky)" />
          {/* Misty foliage silhouettes */}
          <circle cx="190" cy="260" r="190" fill="#3a4c63" opacity="0.5" filter="url(#rn-mist)" />
          <circle cx="1090" cy="240" r="200" fill="#3a4c63" opacity="0.5" filter="url(#rn-mist)" />
          {/* School overhang eaves */}
          <polygon points="0,0 1280,0 1280,120 0,75" fill="#2c3547" />
          {/* Wet pavement + reflections */}
          <rect x="0" y="515" width="1280" height="205" fill="url(#rn-floor)" />
          <ellipse cx="380" cy="600" rx="115" ry="18" fill="rgba(210,235,255,0.22)" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
          <ellipse cx="890" cy="632" rx="85" ry="14" fill="rgba(210,235,255,0.2)" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
        </g>
      )

    default:
      return null
  }
}
