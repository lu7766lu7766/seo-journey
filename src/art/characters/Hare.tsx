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

/** 夏川 晴：橘色短鮑伯＋側邊小馬尾、脖子掛耳機、歪歪的黃色領結 */
export function HareSprite({ face, speaking }: { face: Face; speaking?: boolean }) {
  const blinking = useBlink(face === 'happy')
  const mouthOpen = useMouthSpeak(speaking)
  const hairBase = '#f28b30'
  const hairDark = '#c96418'
  const hairHi = '#ffb868'

  return (
    <svg viewBox="0 0 600 1000" style={{ height: '100%', width: 'auto' }} role="img" aria-label={`夏川 晴 ${face}`}>
      <defs>
        <linearGradient id="hare-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hairHi} />
          <stop offset="0.4" stopColor={hairBase} />
          <stop offset="1" stopColor={hairDark} />
        </linearGradient>
      </defs>
      <CharBreathWrap>
        {/* Bouncy side mini-ponytail (viewer right) */}
        <path
          d="M402 182 C468 175, 505 245, 474 342 C455 310, 442 295, 425 275 C442 325, 446 378, 418 415 C395 365, 392 268, 392 200 Z"
          fill="url(#hare-hair)"
          stroke={OUTLINE}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Short flared bob back hair */}
        <path
          d="M178 182 C152 260, 146 355, 178 408 Q220 390 232 365 L368 365 Q380 390 422 408 C454 355, 448 260, 422 182 C395 100, 205 100, 178 182 Z"
          fill="url(#hare-hair)"
          stroke={OUTLINE}
          strokeWidth="3.3"
          strokeLinejoin="round"
        />

        {/* Uniform with slightly crooked yellow ribbon */}
        <AobaUniform ribbonColor="#f5be2e" ribbonAccent="#ffd95a" crooked />

        {/* Face */}
        <FaceBase jawWidth={83} />
        <BlushAndEmotes face={face} />
        <AnimeEyes face={face} irisTop="#b85a12" irisBottom="#f8c84e" blinking={blinking} />
        <Eyebrows face={face} color={hairDark} />
        <Mouth face={face} mouthOpen={mouthOpen} />

        {/* Fluffy bangs & ahoge */}
        <path
          d="M180 200 C186 115, 240 88, 300 88 C360 88, 414 115, 420 200 L405 235 L376 196 L354 242 L322 186 L296 244 L268 184 L242 240 L218 194 L194 236 Z"
          fill="url(#hare-hair)"
          stroke={OUTLINE}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Side fluffy bob tips */}
        <path d="M182 205 C164 275, 170 340, 204 385 C215 340, 222 285, 218 232 Z" fill="url(#hare-hair)" stroke={OUTLINE} strokeWidth="3" />
        <path d="M418 205 C436 275, 430 340, 396 385 C385 340, 378 285, 382 232 Z" fill="url(#hare-hair)" stroke={OUTLINE} strokeWidth="3" />
        {/* Energetic ahoge */}
        <path d="M298 92 C288 48, 338 34, 344 64 C324 58, 312 72, 314 92 Z" fill={hairBase} stroke={OUTLINE} strokeWidth="2.8" strokeLinejoin="round" />
        {/* Highlight */}
        <path d="M225 144 Q265 128 300 140 Q335 128 375 144" fill="none" stroke="#ffe4a3" strokeWidth="5.5" opacity="0.65" strokeLinecap="round" />

        {/* Yellow scrunchy on side mini-ponytail */}
        <circle cx="408" cy="186" r="11" fill="#ffd24a" stroke={OUTLINE} strokeWidth="2.6" />

        {/* Headphones around neck */}
        <g>
          <path d="M242 392 Q300 456 358 392" fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
          <path d="M242 392 Q300 456 358 392" fill="none" stroke={OUTLINE} strokeWidth="14" strokeLinecap="round" opacity="0.2" />
          <rect x="218" y="388" width="24" height="44" rx="10" fill="#ff9438" stroke={OUTLINE} strokeWidth="2.8" transform="rotate(-14 230 410)" />
          <rect x="358" y="388" width="24" height="44" rx="10" fill="#ff9438" stroke={OUTLINE} strokeWidth="2.8" transform="rotate(14 370 410)" />
        </g>
      </CharBreathWrap>
    </svg>
  )
}
