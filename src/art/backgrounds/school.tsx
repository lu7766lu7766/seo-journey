import { StarParticles } from './Particles'

export function SchoolBackground({ id, night }: { id: string; night: boolean }) {
  switch (id) {
    case 'gate':
      return (
        <g>
          {/* Sky + school building */}
          <rect width="1280" height="720" fill="url(#sky-soft)" />
          {night && <StarParticles />}
          <path d="M0 530 Q640 490 1280 530 L1280 720 L0 720 Z" fill="#e8dfd6" />
          {/* Main school building */}
          <rect x="260" y="190" width="760" height="330" fill="#f7efe5" stroke="#85788f" strokeWidth="3" />
          <rect x="480" y="130" width="320" height="80" fill="#f0e4d6" stroke="#85788f" strokeWidth="3" />
          <circle cx="640" cy="170" r="24" fill="#fffaf2" stroke="#6f627a" strokeWidth="3" />
          <path d="M640 154 V170 L652 178" stroke="#6f627a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Windows */}
          {[0, 1, 2, 3, 4, 5, 6].map((col) =>
            [0, 1].map((row) => (
              <rect
                key={`${col}-${row}`}
                x={300 + col * 102}
                y={235 + row * 105}
                width="64"
                height="72"
                rx="4"
                fill={night ? '#ffe18c' : '#b7dcf2'}
                stroke="#85788f"
                strokeWidth="2.5"
              />
            )),
          )}
          {/* Brick gate pillars */}
          <rect x="190" y="340" width="90" height="250" fill="#c97d72" stroke="#6c4340" strokeWidth="3" />
          <rect x="1000" y="340" width="90" height="250" fill="#c97d72" stroke="#6c4340" strokeWidth="3" />
          <rect x="180" y="330" width="110" height="24" rx="4" fill="#e3d5cb" stroke="#6c4340" strokeWidth="2.5" />
          <rect x="990" y="330" width="110" height="24" rx="4" fill="#e3d5cb" stroke="#6c4340" strokeWidth="2.5" />
          <rect x="206" y="400" width="58" height="90" rx="4" fill="#fffaf2" stroke="#6c4340" strokeWidth="2" />
          <text x="235" y="438" textAnchor="middle" fontSize="16" fontWeight="700" fill="#5b3d3a">青葉</text>
          <text x="235" y="464" textAnchor="middle" fontSize="16" fontWeight="700" fill="#5b3d3a">學園</text>
          {/* Sakura tree canopies */}
          <circle cx="130" cy="180" r="170" fill="#f9bfd0" opacity="0.9" />
          <circle cx="240" cy="140" r="120" fill="#fcd3df" opacity="0.88" />
          <circle cx="1150" cy="190" r="165" fill="#f9bfd0" opacity="0.9" />
          <circle cx="1040" cy="145" r="115" fill="#fcd3df" opacity="0.88" />
        </g>
      )

    case 'classroom':
      return (
        <g>
          <rect width="1280" height="720" fill="#f5ede2" />
          <rect x="0" y="540" width="1280" height="180" fill="#d9b896" />
          {/* Chalkboard */}
          <rect x="280" y="95" width="720" height="270" rx="6" fill="#2c5e4b" stroke="#9d6d47" strokeWidth="14" />
          <text x="640" y="185" textAnchor="middle" fontSize="34" fill="rgba(255,255,255,0.65)">新學期 · 搜尋祭說明</text>
          <line x1="420" y1="220" x2="860" y2="220" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeDasharray="8 8" />
          {/* Windows on left */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={28 + i * 74} y={90} width="62" height="320" fill={night ? '#253359' : '#bde4fa'} stroke="#9e8772" strokeWidth="4" />
              <line x1={28 + i * 74} y1={240} x2={90 + i * 74} y2={240} stroke="#9e8772" strokeWidth="3" />
            </g>
          ))}
          {/* Desks */}
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${240 + i * 220}, 455)`}>
              <rect x="0" y="0" width="160" height="20" rx="4" fill="#d6a574" stroke="#6c4d32" strokeWidth="2.5" />
              <rect x="18" y="20" width="12" height="95" fill="#7c7585" />
              <rect x="130" y="20" width="12" height="95" fill="#7c7585" />
            </g>
          ))}
        </g>
      )

    case 'clubroom':
      return (
        <g>
          {/* 404 Clubroom */}
          <rect width="1280" height="720" fill="#efe6dc" />
          <rect x="0" y="545" width="1280" height="175" fill="#c9a57e" />
          {/* Door on left with 404 plaque */}
          <rect x="42" y="135" width="185" height="410" fill="#c7976b" stroke="#684a34" strokeWidth="4" />
          <rect x="86" y="190" width="96" height="44" rx="6" fill="#fffaf0" stroke="#684a34" strokeWidth="3" />
          <text x="134" y="221" textAnchor="middle" fontSize="24" fontWeight="700" fill="#3b3550">404</text>
          <circle cx="204" cy="355" r="9" fill="#f0c762" stroke="#684a34" strokeWidth="2" />
          {/* Window */}
          <rect x="970" y="110" width="250" height="280" fill={night ? '#263259' : '#bce3f8'} stroke="#7f6a58" strokeWidth="6" />
          <line x1="1095" y1="110" x2="1095" y2="390" stroke="#7f6a58" strokeWidth="4" />
          <line x1="970" y1="250" x2="1220" y2="250" stroke="#7f6a58" strokeWidth="4" />
          {/* Whiteboard with SEO/AEO/GEO */}
          <rect x="310" y="110" width="580" height="270" rx="8" fill="#ffffff" stroke="#8992a6" strokeWidth="8" />
          <text x="360" y="175" fontSize="28" fontWeight="700" fill="#1f3a6e">SEO</text>
          <text x="545" y="175" fontSize="28" fontWeight="700" fill="#f28c28">AEO</text>
          <text x="730" y="175" fontSize="28" fontWeight="700" fill="#7c6bc4">GEO</text>
          <path d="M350 220 H840 M350 265 H720 M350 310 H790" stroke="#cfd6e3" strokeWidth="6" strokeLinecap="round" />
          {/* Club table & old PC */}
          <rect x="330" y="455" width="600" height="26" rx="5" fill="#d9ab7c" stroke="#684a34" strokeWidth="3" />
          <rect x="370" y="481" width="18" height="100" fill="#684a34" />
          <rect x="872" y="481" width="18" height="100" fill="#684a34" />
          {/* Old monitor */}
          <rect x="520" y="355" width="150" height="100" rx="8" fill="#e0ddd2" stroke="#63616e" strokeWidth="3" />
          <rect x="536" y="370" width="118" height="72" rx="4" fill="#2c445c" />
          <text x="595" y="414" textAnchor="middle" fontSize="22" fill="#9fd3f0">&lt;html&gt;</text>
          {/* Mug */}
          <rect x="740" y="418" width="32" height="36" rx="5" fill="#fffaf0" stroke="#684a34" strokeWidth="2.5" />
        </g>
      )

    case 'corridor':
      return (
        <g>
          <rect width="1280" height="720" fill="#efe9df" />
          <polygon points="0,720 340,480 940,480 1280,720" fill="#d3b28e" />
          <polygon points="0,0 340,140 940,140 1280,0" fill="#e4ddd3" />
          <rect x="340" y="140" width="600" height="340" fill="#e6dfd3" stroke="#998e82" strokeWidth="3" />
          {/* Perspective windows left */}
          <polygon points="40,90 280,155 280,450 40,545" fill={night ? '#263459' : '#b7dff5'} stroke="#8a7c6e" strokeWidth="5" />
          {/* Classroom doors right */}
          <polygon points="990,175 1170,120 1170,565 990,485" fill="#be8d64" stroke="#6e4f38" strokeWidth="4" />
        </g>
      )

    case 'rooftop':
      return (
        <g>
          <rect width="1280" height="720" fill="url(#sky-soft)" />
          {night && <StarParticles />}
          {/* Distant city skyline */}
          <path d="M0 490 L0 390 H110 V440 H190 V360 H310 V430 H440 V350 H560 V440 H720 V380 H840 V450 H980 V365 H1120 V430 H1280 V490 Z" fill={night ? '#222b47' : '#a7bdd6'} opacity="0.65" />
          {/* Chain-link fence */}
          <g stroke="rgba(255,255,255,0.45)" strokeWidth="2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <line key={i} x1={i * 105} y1="260" x2={i * 105} y2="510" />
            ))}
            <line x1="0" y1="260" x2="1280" y2="260" stroke="#7d8da3" strokeWidth="6" />
            <line x1="0" y1="385" x2="1280" y2="385" stroke="#7d8da3" strokeWidth="3" />
          </g>
          {/* Rooftop concrete floor & ledge */}
          <rect x="0" y="510" width="1280" height="210" fill="#cbd0db" />
          <rect x="0" y="492" width="1280" height="24" fill="#9ea6b8" />
        </g>
      )

    case 'library':
      return (
        <g>
          <rect width="1280" height="720" fill="#efe3d0" />
          <rect x="0" y="560" width="1280" height="160" fill="#b98f66" />
          {/* Tall bookshelves */}
          {[70, 320, 740, 990].map((x) => (
            <g key={x}>
              <rect x={x} y="85" width="220" height="475" fill="#825b3d" stroke="#4d3423" strokeWidth="4" />
              {[0, 1, 2, 3].map((row) => (
                <g key={row}>
                  <rect x={x + 12} y={115 + row * 108} width="196" height="86" fill="#63432b" />
                  {[0, 1, 2, 3, 4, 5, 6].map((b) => (
                    <rect
                      key={b}
                      x={x + 18 + b * 26}
                      y={128 + row * 108 + (b % 2) * 6}
                      width="20"
                      height={70 - (b % 2) * 6}
                      rx="2"
                      fill={['#d66d75', '#6fa8dc', '#90c79e', '#f2b866', '#9a8cd0'][b % 5]}
                    />
                  ))}
                </g>
              ))}
            </g>
          ))}
          {/* Reading table & lamp */}
          <rect x="460" y="500" width="360" height="24" rx="5" fill="#a8764c" stroke="#4d3423" strokeWidth="3" />
          <path d="M625 450 L655 450 L668 480 L612 480 Z" fill="#81b59a" stroke="#4d3423" strokeWidth="2.5" />
          <rect x="636" y="480" width="8" height="20" fill="#4d3423" />
        </g>
      )

    case 'broadcast':
      return (
        <g>
          <rect width="1280" height="720" fill="#e5d9cf" />
          {/* Acoustic wall */}
          <rect x="60" y="80" width="1160" height="440" rx="12" fill="#d7c7ba" stroke="#7d6e68" strokeWidth="4" />
          {/* Studio window */}
          <rect x="260" y="135" width="760" height="250" rx="8" fill="#2e3547" stroke="#5b5766" strokeWidth="8" />
          {/* ON AIR sign */}
          <rect x="520" y="75" width="240" height="58" rx="10" fill="#2d1d24" stroke="#55404b" strokeWidth="3" />
          <text x="640" y="114" textAnchor="middle" fontSize="32" fontWeight="700" fill="#ff5768">ON AIR</text>
          {/* Console desk & condenser mic */}
          <rect x="220" y="485" width="840" height="235" rx="12" fill="#6d5d5c" stroke="#3c3338" strokeWidth="4" />
          <rect x="460" y="525" width="360" height="90" rx="8" fill="#3a3d4f" />
          <circle cx="520" cy="570" r="16" fill="#ff9f43" />
          <circle cx="580" cy="570" r="16" fill="#54a0ff" />
          <rect x="635" y="405" width="12" height="105" fill="#4a4d5e" />
          <rect x="622" y="365" width="38" height="54" rx="18" fill="#adb5bd" stroke="#3c3338" strokeWidth="3" />
        </g>
      )

    case 'council':
      return (
        <g>
          <rect width="1280" height="720" fill="#dce4f2" />
          <rect x="0" y="545" width="1280" height="175" fill="#b79b7e" />
          {/* Tall formal windows */}
          {[140, 440, 880].map((x) => (
            <rect key={x} x={x} y="90" width="210" height="330" fill={night ? '#223154' : '#b4d9f2'} stroke="#5c6882" strokeWidth="6" />
          ))}
          {/* Plaque */}
          <rect x="520" y="110" width="240" height="60" rx="6" fill="#2a3b61" stroke="#c9a554" strokeWidth="3" />
          <text x="640" y="150" textAnchor="middle" fontSize="28" fontWeight="700" fill="#fffaf0">學生會室</text>
          {/* Neat desk */}
          <rect x="330" y="470" width="620" height="120" rx="6" fill="#70513d" stroke="#3f2c21" strokeWidth="4" />
          <rect x="410" y="438" width="90" height="32" fill="#fffaf0" stroke="#9ea6b8" strokeWidth="2" />
        </g>
      )

    default:
      // infirmary
      return (
        <g>
          <defs>
            <linearGradient id="inf-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f4fbf9" />
              <stop offset="1" stopColor="#dfefea" />
            </linearGradient>
            <linearGradient id="inf-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d4e6e0" />
              <stop offset="1" stopColor="#b8d1c8" />
            </linearGradient>
          </defs>
          <rect width="1280" height="720" fill="url(#inf-wall)" />
          <rect x="0" y="555" width="1280" height="165" fill="url(#inf-floor)" />
          {/* Sunlit window */}
          <rect x="490" y="85" width="240" height="310" fill={night ? '#203052' : '#cbeeff'} stroke="#87a69f" strokeWidth="5" />
          <polygon points="490,395 730,395 920,720 350,720" fill="rgba(255,255,245,0.22)" />
          {/* Curtain & Hospital bed */}
          <rect x="75" y="95" width="385" height="450" fill="#e5f5f0" stroke="#99bfb5" strokeWidth="3" />
          <rect x="120" y="425" width="445" height="118" rx="12" fill="#ffffff" stroke="#7ea199" strokeWidth="4" />
          <rect x="135" y="395" width="115" height="46" rx="14" fill="#f7fbfa" stroke="#7ea199" strokeWidth="3" />
          <rect x="255" y="430" width="310" height="94" rx="8" fill="#a8e2cf" opacity="0.82" />
          {/* Medicine cabinet */}
          <rect x="810" y="135" width="320" height="365" rx="8" fill="#ffffff" stroke="#7ea199" strokeWidth="4" />
          <path d="M970 205 V255 M945 230 H995" stroke="#e06674" strokeWidth="14" strokeLinecap="round" />
        </g>
      )
  }
}
