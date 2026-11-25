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

/** 星野 未來：銀白到淡紫漸層長髮、發光青色星形髮夾、略大的淺紫針織外套 */
export function MiraiSprite({ face, speaking }: { face: Face; speaking?: boolean }) {
  const blinking = useBlink(face === 'happy')
  const mouthOpen = useMouthSpeak(speaking)

  return (
    <svg viewBox="0 0 600 1000" style={{ height: '100%', width: 'auto' }} role="img" aria-label={`星野 未來 ${face}`}>
      <defs>
        <linearGradient id="mirai-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f4ff" />
          <stop offset="0.45" stopColor="#dcd5f7" />
          <stop offset="1" stopColor="#b5a6e8" />
        </linearGradient>
        <filter id="star-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <CharBreathWrap>
        {/* Long flowing silver-lavender back hair */}
        <path
          d="M168 188 C134 380, 122 650, 154 910 C195 940, 225 918, 250 935 C280 950, 320 950, 350 935 C375 918, 405 940, 446 910 C478 650, 466 380, 432 188 C405 100, 195 100, 168 188 Z"
          fill="url(#mirai-hair)"
          stroke={OUTLINE}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />

        {/* Oversized pale-lavender outer jacket over uniform */}
        <AobaUniform ribbonColor="#3fd0d4" ribbonAccent="#82ecee" oversizedCardigan="#ede8fc" />

        {/* Face (slightly petite) */}
        <FaceBase jawWidth={78} />
        <BlushAndEmotes face={face} />
        <AnimeEyes face={face} irisTop="#6e63b8" irisBottom="#5ae5e8" blinking={blinking} />
        <Eyebrows face={face} color="#796cb3" />
        <Mouth face={face} mouthOpen={mouthOpen} />

        {/* Wispy framing strands */}
        <path d="M188 168 C162 270, 168 415, 200 535 C218 440, 224 335, 222 240 Z" fill="url(#mirai-hair)" stroke={OUTLINE} strokeWidth="2.8" />
        <path d="M412 168 C438 270, 432 415, 400 535 C382 440, 376 335, 378 240 Z" fill="url(#mirai-hair)" stroke={OUTLINE} strokeWidth="2.8" />
        {/* Delicate split bangs */}
        <path
          d="M182 195 C190 112, 240 88, 300 88 C360 88, 410 112, 418 195 L398 242 L370 198 L345 245 L322 192 L302 252 L280 192 L254 244 L230 198 L202 242 Z"
          fill="url(#mirai-hair)"
          stroke={OUTLINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M230 144 Q300 124 370 144" fill="none" stroke="#ffffff" strokeWidth="6" opacity="0.75" strokeLinecap="round" />

        {/* Glowing cyan star hairpin */}
        <g filter="url(#star-glow)" transform="translate(362 178) rotate(12)">
          <path
            d="M0 -18 L5 -5 L18 0 L5 5 L0 18 L-5 5 L-18 0 L-5 -5 Z"
            fill="#4ef0f4"
            stroke="#1f6f8b"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="0" cy="0" r="4" fill="#ffffff" />
        </g>
      </CharBreathWrap>
    </svg>
  )
}
