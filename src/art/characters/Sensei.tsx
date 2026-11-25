import type { Face } from '@/content/characters'
import {
  AnimeEyes,
  BlushAndEmotes,
  CharBreathWrap,
  Eyebrows,
  FaceBase,
  Mouth,
  OUTLINE,
  SKIN_BASE,
  useBlink,
  useMouthSpeak,
} from './shared'

/** 索 千尋老師：成年女性、栗棕低馬尾、白襯衫＋焦糖色開襟毛衣、手拿熱咖啡馬克杯 */
export function SenseiSprite({ face, speaking }: { face: Face; speaking?: boolean }) {
  const blinking = useBlink(face === 'happy')
  const mouthOpen = useMouthSpeak(speaking)
  const hairBase = '#6d4c41'
  const hairDark = '#4a3128'
  const hairHi = '#967164'

  return (
    <svg viewBox="0 0 600 1000" style={{ height: '100%', width: 'auto' }} role="img" aria-label={`索 千尋 ${face}`}>
      <defs>
        <linearGradient id="sensei-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hairHi} />
          <stop offset="0.45" stopColor={hairBase} />
          <stop offset="1" stopColor={hairDark} />
        </linearGradient>
      </defs>
      <CharBreathWrap>
        {/* Low side ponytail resting over shoulder */}
        <path
          d="M210 265 C155 320, 140 480, 165 620 C192 595, 212 520, 218 420 Z"
          fill="url(#sensei-hair)"
          stroke={OUTLINE}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path d="M180 170 C158 245, 165 330, 196 365 L404 365 C435 330, 442 245, 420 170 C395 96, 205 96, 180 170 Z" fill="url(#sensei-hair)" stroke={OUTLINE} strokeWidth="3.2" />

        {/* Adult body: white blouse + caramel knit cardigan + dark pencil skirt */}
        <g>
          {/* Sleeves */}
          <path d="M190 430 C138 465, 118 595, 134 735 L194 740 C194 630, 204 530, 222 475 Z" fill="#c7956d" stroke={OUTLINE} strokeWidth="3.2" />
          {/* Right arm raised holding coffee mug */}
          <path d="M410 430 C465 468, 494 565, 466 645 L395 625 L385 520 Z" fill="#c7956d" stroke={OUTLINE} strokeWidth="3.2" strokeLinejoin="round" />

          {/* White blouse torso */}
          <path d="M210 422 L390 422 L405 765 L195 765 Z" fill="#fffaf4" stroke={OUTLINE} strokeWidth="3.2" />
          {/* Open blouse collar */}
          <path d="M254 418 L300 505 L346 418" fill="none" stroke={OUTLINE} strokeWidth="2.6" />
          {/* Caramel cardigan sides */}
          <path d="M192 430 L264 430 L254 765 L176 765 Z" fill="#c7956d" stroke={OUTLINE} strokeWidth="3.2" />
          <path d="M408 430 L336 430 L346 765 L424 765 Z" fill="#c7956d" stroke={OUTLINE} strokeWidth="3.2" />
          {/* Dark skirt */}
          <path d="M180 762 Q300 778 420 762 L440 1005 L160 1005 Z" fill="#3a3347" stroke={OUTLINE} strokeWidth="3.4" />
          {/* Coffee mug + hand */}
          <g transform="translate(382 575)">
            <path d="M62 24 C84 24, 84 58, 62 58" fill="none" stroke="#fff4ea" strokeWidth="7" />
            <path d="M62 24 C84 24, 84 58, 62 58" fill="none" stroke={OUTLINE} strokeWidth="2.8" />
            <rect x="8" y="14" width="56" height="58" rx="10" fill="#fff4ea" stroke={OUTLINE} strokeWidth="3" />
            <rect x="14" y="28" width="44" height="16" rx="4" fill="#d98b5f" opacity="0.45" />
            {/* Hand */}
            <ellipse cx="64" cy="44" rx="16" ry="20" fill={SKIN_BASE} stroke={OUTLINE} strokeWidth="2.6" />
            {/* Steam */}
            <path d="M24 2 Q18 -14 26 -28 M42 4 Q48 -12 40 -26" fill="none" stroke="#ffffff" strokeWidth="3.2" opacity="0.7" strokeLinecap="round" />
          </g>
        </g>

        {/* Face */}
        <FaceBase jawWidth={82} />
        <BlushAndEmotes face={face} />
        <AnimeEyes face={face} irisTop="#6e4b3a" irisBottom="#c49474" blinking={blinking} />
        <Eyebrows face={face} color={hairDark} />
        <Mouth face={face} mouthOpen={mouthOpen} />

        {/* Soft reading glasses */}
        <g stroke="#5c475e" strokeWidth="2.8" fill="rgba(255,255,255,0.12)">
          <rect x="229" y="246" width="54" height="36" rx="10" />
          <rect x="317" y="246" width="54" height="36" rx="10" />
          <line x1="283" y1="262" x2="317" y2="262" />
        </g>

        {/* Parted mature bangs */}
        <path
          d="M180 198 C186 112, 238 88, 300 88 C362 88, 414 112, 420 198 L404 260 L376 196 L332 230 L300 185 L268 230 L224 196 L196 260 Z"
          fill="url(#sensei-hair)"
          stroke={OUTLINE}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path d="M228 142 Q300 124 372 142" fill="none" stroke="#c29b8d" strokeWidth="5" opacity="0.45" strokeLinecap="round" />
      </CharBreathWrap>
    </svg>
  )
}
