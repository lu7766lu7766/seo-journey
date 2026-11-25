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

/** 黑川 翔：鄰校學生、字面上的黑色棒球帽、深色帽 T、輕浮反派感 */
export function KuroSprite({ face, speaking }: { face: Face; speaking?: boolean }) {
  const blinking = useBlink(face === 'happy')
  const mouthOpen = useMouthSpeak(speaking)
  const hairBase = '#34364a'

  return (
    <svg viewBox="0 0 600 1000" style={{ height: '100%', width: 'auto' }} role="img" aria-label={`黑川 翔 ${face}`}>
      <defs>
        <linearGradient id="kuro-hoodie" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3d52" />
          <stop offset="1" stopColor="#202230" />
        </linearGradient>
      </defs>
      <CharBreathWrap>
        {/* Back hair */}
        <path d="M196 190 C182 260, 186 330, 212 368 L388 368 C414 330, 418 260, 404 190 Z" fill={hairBase} stroke={OUTLINE} strokeWidth="3.2" />

        {/* Broader male hoodie silhouette */}
        <g>
          <path d="M172 425 C120 462, 100 605, 118 770 L185 775 L195 480 Z" fill="url(#kuro-hoodie)" stroke={OUTLINE} strokeWidth="3.4" />
          <path d="M428 425 C480 462, 500 605, 482 770 L415 775 L405 480 Z" fill="url(#kuro-hoodie)" stroke={OUTLINE} strokeWidth="3.4" />
          <path d="M175 422 Q300 400 425 422 L442 785 L158 785 Z" fill="url(#kuro-hoodie)" stroke={OUTLINE} strokeWidth="3.5" />
          {/* Inner white tee + hoodie collar & strings */}
          <path d="M242 415 L300 482 L358 415 Z" fill="#eceef5" stroke={OUTLINE} strokeWidth="2.8" />
          <path d="M210 416 Q300 488 390 416" fill="none" stroke={OUTLINE} strokeWidth="4" />
          <path d="M276 472 L272 565 M324 472 L328 565" stroke="#e4e7f2" strokeWidth="4.5" strokeLinecap="round" />
          {/* Pocket */}
          <path d="M218 675 L382 675 L402 762 L198 762 Z" fill="#27293a" stroke={OUTLINE} strokeWidth="2.8" />
          {/* Dark jeans */}
          <path d="M162 785 L438 785 L455 1005 L145 1005 Z" fill="#1b1e2b" stroke={OUTLINE} strokeWidth="3.4" />
          {/* Hands */}
          <path d="M122 765 C120 795, 134 824, 156 824 C174 824, 180 795, 178 765 Z" fill={SKIN_BASE} stroke={OUTLINE} strokeWidth="2.8" />
          <path d="M478 765 C480 795, 466 824, 444 824 C426 824, 420 795, 422 765 Z" fill={SKIN_BASE} stroke={OUTLINE} strokeWidth="2.8" />
        </g>

        {/* Face */}
        <FaceBase jawWidth={86} />
        <BlushAndEmotes face={face} />
        <AnimeEyes face={face} irisTop="#4b4f6e" irisBottom="#9ea3c4" blinking={blinking} sharp />
        <Eyebrows face={face} color={hairBase} />
        <Mouth face={face} mouthOpen={mouthOpen} />

        {/* Messy hair peeking out under cap */}
        <path
          d="M196 196 L214 238 L242 192 L266 232 L296 186 L326 230 L352 190 L382 236 L404 196 Z"
          fill={hairBase}
          stroke={OUTLINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Signature Black Baseball Cap */}
        <g>
          {/* Cap dome */}
          <path
            d="M188 186 C188 92, 412 92, 412 186 Z"
            fill="#1e1f29"
            stroke={OUTLINE}
            strokeWidth="3.5"
          />
          <path d="M300 105 L300 180 M240 120 Q242 150 240 180 M360 120 Q358 150 360 180" stroke="#36384a" strokeWidth="2.5" fill="none" />
          {/* Cap button */}
          <circle cx="300" cy="108" r="7" fill="#3a3d52" stroke={OUTLINE} strokeWidth="2.4" />
          {/* Cap emblem */}
          <path d="M292 140 L306 140 L298 154 L310 154 L290 174 L296 158 L286 158 Z" fill="#f0c44d" />
          {/* Cap brim */}
          <path
            d="M182 184 Q300 156 446 192 Q458 202 440 208 Q305 180 184 196 Z"
            fill="#14151c"
            stroke={OUTLINE}
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <path d="M220 182 Q315 166 420 192" stroke="#4f536e" strokeWidth="3" fill="none" opacity="0.6" />
        </g>
      </CharBreathWrap>
    </svg>
  )
}
