import type { Face } from '@/content/characters'
import {
  AnimeEyes,
  AobaUniform,
  BlushAndEmotes,
  CharBreathWrap,
  Eyebrows,
  FaceBase,
  Mouth,
  OUTLINE,
  useBlink,
  useMouthSpeak,
} from './shared'

/** 白鷺 凜：鮮明藍色長髮（SVG 備援版畫得偏深）、紅色髮箍與領口緞帶、學生會臂章、銳利藍眼 */
export function RinSprite({ face, speaking }: { face: Face; speaking?: boolean }) {
  const blinking = useBlink(face === 'happy')
  const mouthOpen = useMouthSpeak(speaking)
  const hairBase = '#1c2440'
  const hairDark = '#11162b'
  const hairHi = '#3c4c7a'

  return (
    <svg viewBox="0 0 600 1000" style={{ height: '100%', width: 'auto' }} role="img" aria-label={`白鷺 凜 ${face}`}>
      <defs>
        <linearGradient id="rin-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hairHi} />
          <stop offset="0.35" stopColor={hairBase} />
          <stop offset="1" stopColor={hairDark} />
        </linearGradient>
      </defs>
      <CharBreathWrap>
        {/* Long straight back hair */}
        <path
          d="M170 185 C145 360, 128 650, 146 935 L235 955 L365 955 L454 935 C472 650, 455 360, 430 185 C405 100, 195 100, 170 185 Z"
          fill="url(#rin-hair)"
          stroke={OUTLINE}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M168 350 Q158 640 168 920" stroke={hairHi} strokeWidth="4" opacity="0.35" fill="none" />
        <path d="M432 350 Q442 640 432 920" stroke={hairHi} strokeWidth="4" opacity="0.35" fill="none" />

        {/* Uniform with red ribbon & student council armband */}
        <AobaUniform ribbonColor="#d6334a" ribbonAccent="#ef586e" armband />

        {/* Face */}
        <FaceBase jawWidth={81} />
        <BlushAndEmotes face={face} />
        <AnimeEyes face={face} irisTop="#29488a" irisBottom="#78a6e8" blinking={blinking} sharp />
        <Eyebrows face={face} color={hairBase} />
        <Mouth face={face} mouthOpen={mouthOpen} />

        {/* Side locks + sleek bangs */}
        <path
          d="M190 160 C166 235, 165 385, 192 505 C215 445, 224 345, 220 245 Z"
          fill="url(#rin-hair)"
          stroke={OUTLINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M410 160 C434 235, 435 385, 408 505 C385 445, 376 345, 380 245 Z"
          fill="url(#rin-hair)"
          stroke={OUTLINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Crown & neat hime-cut bangs */}
        <path
          d="M178 195 C186 110, 240 86, 300 86 C360 86, 414 110, 422 195 L406 238 L374 185 L350 236 L326 178 L298 238 L274 180 L246 236 L222 186 L194 236 Z"
          fill="url(#rin-hair)"
          stroke={OUTLINE}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Hair specular highlight arc */}
        <path d="M224 148 Q265 130 300 144 Q335 130 376 148" fill="none" stroke="#85a6f2" strokeWidth="5.5" opacity="0.45" strokeLinecap="round" />

        {/* Red ribbon headband */}
        <path d="M192 168 Q300 118 408 168" fill="none" stroke="#d6334a" strokeWidth="10" strokeLinecap="round" />
        <g transform="translate(215 136) rotate(-18)">
          <path d="M0 0 C-26 -18, -32 14, -4 8 Z" fill="#ef4e66" stroke={OUTLINE} strokeWidth="2.4" />
          <path d="M0 0 C26 -18, 32 14, 4 8 Z" fill="#ef4e66" stroke={OUTLINE} strokeWidth="2.4" />
          <circle cx="0" cy="4" r="6" fill="#b82339" stroke={OUTLINE} strokeWidth="2.2" />
        </g>
      </CharBreathWrap>
    </svg>
  )
}
