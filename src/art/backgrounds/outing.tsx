import { StarParticles } from './Particles'

export function OutingBackground({ id, night }: { id: string; night: boolean }) {
  switch (id) {
    case 'street':
      return (
        <g>
          <rect width="1280" height="720" fill="url(#sky-soft)" />
          {night && <StarParticles />}
          <rect x="0" y="540" width="1280" height="180" fill="#d9cfc9" />
          {/* Shops */}
          <rect x="60" y="210" width="360" height="330" fill="#f7e4d4" stroke="#8c756c" strokeWidth="4" />
          <rect x="440" y="170" width="400" height="370" fill="#f5eedf" stroke="#8c756c" strokeWidth="4" />
          <rect x="860" y="230" width="360" height="310" fill="#e9eff5" stroke="#8c756c" strokeWidth="4" />
          {/* Awnings */}
          <path d="M50 320 H430 L415 365 H65 Z" fill="#e87a8c" stroke="#7a3e49" strokeWidth="3" />
          <path d="M430 300 H850 L835 350 H445 Z" fill="#6ea6d6" stroke="#3c5e7d" strokeWidth="3" />
          <path d="M850 330 H1230 L1215 375 H865 Z" fill="#f0a85b" stroke="#8a5a28" strokeWidth="3" />
          <rect x="525" y="220" width="230" height="55" rx="6" fill="#fffaf0" stroke="#3c5e7d" strokeWidth="3" />
          <text x="640" y="257" textAnchor="middle" fontSize="26" fontWeight="700" fill="#3b3550">青葉書店</text>
          {/* Warm glowing shop windows */}
          <rect x="110" y="395" width="240" height="115" fill={night ? '#ffe599' : '#c9e6f5'} stroke="#8c756c" strokeWidth="3" />
          <rect x="510" y="385" width="260" height="125" fill={night ? '#ffe599' : '#d8ecf7'} stroke="#8c756c" strokeWidth="3" />
        </g>
      )

    case 'planetarium':
      return (
        <g>
          <defs>
            <radialGradient id="dome-sky" cx="50%" cy="35%" r="70%">
              <stop offset="0" stopColor="#433878" />
              <stop offset="0.55" stopColor="#211c48" />
              <stop offset="1" stopColor="#100e26" />
            </radialGradient>
          </defs>
          <rect width="1280" height="720" fill="url(#dome-sky)" />
          <StarParticles />
          {/* Constellation lines */}
          <g stroke="#6cf0f5" strokeWidth="2" opacity="0.65">
            <polyline points="280,220 380,175 490,235 610,165 730,210" fill="none" />
            <polyline points="820,240 920,170 1030,220" fill="none" />
          </g>
          <circle cx="610" cy="165" r="5" fill="#9cf9ff" />
          <circle cx="380" cy="175" r="5" fill="#9cf9ff" />
          <circle cx="920" cy="170" r="5" fill="#9cf9ff" />
          {/* Projector & seats silhouette */}
          <path d="M0 575 Q640 520 1280 575 L1280 720 L0 720 Z" fill="#171430" />
          <circle cx="640" cy="545" r="52" fill="#2c2854" stroke="#7d72b8" strokeWidth="3" />
          <circle cx="640" cy="545" r="18" fill="#5ce8ed" opacity="0.6" />
        </g>
      )

    case 'beach':
      return (
        <g>
          <rect width="1280" height="720" fill="url(#sky-soft)" />
          {night && <StarParticles />}
          {/* Ocean */}
          <rect x="0" y="385" width="1280" height="145" fill={night ? '#264f78' : '#5eb9e6'} />
          <path d="M0 430 Q320 415 640 430 T1280 430" stroke="rgba(255,255,255,0.5)" strokeWidth="4" fill="none" />
          <path d="M0 475 Q320 460 640 475 T1280 475" stroke="rgba(255,255,255,0.45)" strokeWidth="4" fill="none" />
          {/* Foam & Sandy shore */}
          <path d="M0 525 Q640 495 1280 525 L1280 720 L0 720 Z" fill="#f7e2b5" />
          <path d="M0 525 Q640 495 1280 525" stroke="#ffffff" strokeWidth="8" opacity="0.85" fill="none" />
          {/* Clouds */}
          <ellipse cx="260" cy="160" rx="110" ry="38" fill="rgba(255,255,255,0.75)" />
          <ellipse cx="960" cy="135" rx="140" ry="44" fill="rgba(255,255,255,0.75)" />
        </g>
      )

    case 'festival':
      return (
        <g>
          <rect width="1280" height="720" fill="url(#sky-soft)" />
          {night && <StarParticles />}
          <rect x="0" y="540" width="1280" height="180" fill="#e5d0bc" />
          {/* Stage */}
          <rect x="180" y="425" width="920" height="135" fill="#7c5642" stroke="#473024" strokeWidth="4" />
          <rect x="160" y="410" width="960" height="24" rx="4" fill="#c7956d" stroke="#473024" strokeWidth="3" />
          {/* Banner */}
          <rect x="380" y="135" width="520" height="92" rx="14" fill="#fffaf0" stroke="#d6334a" strokeWidth="6" />
          <text x="640" y="194" textAnchor="middle" fontSize="42" fontWeight="700" fill="#d6334a">青葉 搜尋祭</text>
          {/* Lantern garlands */}
          <path d="M0 95 Q640 165 1280 95" fill="none" stroke="#473024" strokeWidth="3" />
          {[140, 290, 440, 840, 990, 1140].map((x, idx) => (
            <g key={x} transform={`translate(${x}, ${idx < 3 ? 115 + idx * 14 : 115 + (5 - idx) * 14})`}>
              <ellipse cx="0" cy="24" rx="22" ry="28" fill={idx % 2 === 0 ? '#ff7c8e' : '#ffd263'} stroke="#473024" strokeWidth="2.5" />
            </g>
          ))}
        </g>
      )

    case 'rain':
      return (
        <g>
          <rect width="1280" height="720" fill="#7d90a6" />
          <path d="M0 530 Q640 500 1280 530 L1280 720 L0 720 Z" fill="#5b6b7d" />
          <ellipse cx="420" cy="610" rx="85" ry="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
          <ellipse cx="890" cy="635" rx="60" ry="12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
        </g>
      )

    default:
      // home
      return (
        <g>
          <rect width="1280" height="720" fill="#f5e9dc" />
          <rect x="0" y="555" width="1280" height="165" fill="#d6b490" />
          <rect x="850" y="120" width="280" height="250" fill={night ? '#222b4d' : '#bce2f7'} stroke="#8f745b" strokeWidth="6" />
          <line x1="990" y1="120" x2="990" y2="370" stroke="#8f745b" strokeWidth="4" />
          <rect x="110" y="420" width="380" height="145" rx="14" fill="#9fd3f0" stroke="#5b788c" strokeWidth="4" />
          <rect x="130" y="390" width="105" height="45" rx="12" fill="#fffaf0" stroke="#5b788c" strokeWidth="3" />
          <rect x="610" y="445" width="260" height="24" rx="4" fill="#b88456" stroke="#63452c" strokeWidth="3" />
          <rect x="680" y="370" width="120" height="75" rx="6" fill="#3a3d52" />
        </g>
      )
  }
}
