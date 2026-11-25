import { useEffect, useId, useState } from 'react'
import type { Face } from '@/content/characters'

export const OUTLINE = '#2a2238'
export const SKIN_BASE = '#ffe8dc'
export const SKIN_SHADOW = '#f3c5b7'
export const SKIN_HIGHLIGHT = '#fff7f3'

/** Random natural blink every 3–6 seconds. */
export function useBlink(disabled = false): boolean {
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    if (disabled) {
      setClosed(false)
      return
    }
    let alive = true
    let t1: ReturnType<typeof setTimeout>
    let t2: ReturnType<typeof setTimeout>
    const schedule = () => {
      const delay = 3000 + Math.random() * 3000
      t1 = setTimeout(() => {
        if (!alive) return
        setClosed(true)
        t2 = setTimeout(() => {
          if (!alive) return
          setClosed(false)
          schedule()
        }, 135)
      }, delay)
    }
    schedule()
    return () => {
      alive = false
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [disabled])
  return closed
}

/** Mouth open/close cycle when speaking. */
export function useMouthSpeak(speaking?: boolean): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!speaking) {
      setOpen(false)
      return
    }
    const iv = setInterval(() => setOpen((v) => !v), 155)
    return () => clearInterval(iv)
  }, [speaking])
  return open
}

export function CharBreathWrap({ children }: { children: React.ReactNode }) {
  return (
    <g className="char-breath" style={{ transformOrigin: '300px 950px' }}>
      {children}
    </g>
  )
}

export interface UniformProps {
  ribbonColor: string
  ribbonAccent: string
  crooked?: boolean
  armband?: boolean
  oversizedCardigan?: string
  sleeveColor?: string
}

/** Aoba Academy navy blazer uniform (waist-up, centered at x=300). */
export function AobaUniform({
  ribbonColor,
  ribbonAccent,
  crooked = false,
  armband = false,
  oversizedCardigan,
}: UniformProps) {
  const gid = useId().replace(/:/g, '')
  const jacket = oversizedCardigan ?? '#25335c'
  const jacketDark = oversizedCardigan ? '#cbbfe2' : '#192344'
  const jacketHi = oversizedCardigan ? '#ffffff' : '#3a4e86'

  return (
    <g>
      <defs>
        <linearGradient id={`u-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={jacketHi} />
          <stop offset="0.35" stopColor={jacket} />
          <stop offset="1" stopColor={jacketDark} />
        </linearGradient>
      </defs>

      {/* Arms / sleeves */}
      <path
        d="M192 435 C140 465, 118 590, 128 760 L188 765 C186 640, 198 535, 222 475 Z"
        fill={`url(#u-${gid})`}
        stroke={OUTLINE}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M408 435 C460 465, 482 590, 472 760 L412 765 C414 640, 402 535, 378 475 Z"
        fill={`url(#u-${gid})`}
        stroke={OUTLINE}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />

      {/* Hands peeking below sleeves */}
      <path d="M132 758 C128 790, 140 822, 162 824 C180 825, 186 792, 184 762 Z" fill={SKIN_BASE} stroke={OUTLINE} strokeWidth="2.8" />
      <path d="M468 758 C472 790, 460 822, 438 824 C420 825, 414 792, 416 762 Z" fill={SKIN_BASE} stroke={OUTLINE} strokeWidth="2.8" />

      {/* Torso blazer */}
      <path
        d="M195 432 Q300 412 405 432 L428 765 Q300 785 172 765 Z"
        fill={`url(#u-${gid})`}
        stroke={OUTLINE}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Blazer cel-shading */}
      <path d="M198 445 L220 755 L176 758 Z" fill={jacketDark} opacity="0.35" />
      <path d="M402 445 L380 755 L424 758 Z" fill={jacketDark} opacity="0.35" />

      {/* White inner shirt + collar */}
      <path d="M248 418 L300 545 L352 418 Q300 432 248 418 Z" fill="#ffffff" stroke={OUTLINE} strokeWidth="2.8" />
      <path d="M255 415 L292 482 L262 496 L236 435 Z" fill="#f7f9ff" stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M345 415 L308 482 L338 496 L364 435 Z" fill="#f7f9ff" stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round" />

      {/* Blazer lapels */}
      <path d="M232 428 L286 565 L245 568 L208 465 Z" fill={jacketHi} opacity="0.45" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M368 428 L314 565 L355 568 L392 465 Z" fill={jacketHi} opacity="0.45" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />

      {/* Gold buttons */}
      <circle cx="300" cy="605" r="7" fill="#f5cf6b" stroke={OUTLINE} strokeWidth="2" />
      <circle cx="300" cy="665" r="7" fill="#f5cf6b" stroke={OUTLINE} strokeWidth="2" />

      {/* Pleated skirt top */}
      <path d="M172 762 Q300 780 428 762 L462 1005 L138 1005 Z" fill="#2c3556" stroke={OUTLINE} strokeWidth="3.5" />
      {/* Skirt pleats & plaid lines */}
      <path d="M225 770 L205 1005 M275 773 L268 1005 M325 773 L332 1005 M375 770 L395 1005" stroke="#1b223b" strokeWidth="3" />
      <path d="M162 855 Q300 872 438 855 M150 925 Q300 944 450 925" stroke="rgba(255,255,255,0.16)" strokeWidth="4" fill="none" />

      {/* Ribbon tie */}
      <g transform={crooked ? 'translate(300 472) rotate(11) translate(-300 -472)' : undefined}>
        <path d="M294 470 L272 542 L296 534 Z" fill={ribbonColor} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M306 470 L328 542 L304 534 Z" fill={ribbonColor} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M296 468 C264 446, 254 494, 294 480 Z" fill={ribbonAccent} stroke={OUTLINE} strokeWidth="2.3" />
        <path d="M304 468 C336 446, 346 494, 306 480 Z" fill={ribbonAccent} stroke={OUTLINE} strokeWidth="2.3" />
        <rect x="291" y="462" width="18" height="17" rx="5" fill={ribbonColor} stroke={OUTLINE} strokeWidth="2.2" />
      </g>

      {/* Student Council Armband */}
      {armband && (
        <g transform="rotate(-10 162 555)">
          <rect x="133" y="534" width="60" height="40" rx="5" fill="#d6334a" stroke={OUTLINE} strokeWidth="2.6" />
          <line x1="138" y1="544" x2="188" y2="544" stroke="#fff4d6" strokeWidth="2.5" />
          <text x="163" y="566" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fffaf0">生徒会</text>
        </g>
      )}
    </g>
  )
}

/** Neck and anime head contour. */
export function FaceBase({ jawWidth = 84 }: { jawWidth?: number }) {
  return (
    <g>
      {/* Neck */}
      <path d="M273 345 L273 434 Q300 452 327 434 L327 345 Z" fill={SKIN_BASE} stroke={OUTLINE} strokeWidth="3" />
      <path d="M275 348 Q300 385 325 348 L325 378 Q300 398 275 378 Z" fill={SKIN_SHADOW} />
      {/* Ears */}
      <ellipse cx={300 - jawWidth - 4} cy="272" rx="11" ry="20" fill={SKIN_BASE} stroke={OUTLINE} strokeWidth="2.6" />
      <ellipse cx={300 + jawWidth + 4} cy="272" rx="11" ry="20" fill={SKIN_BASE} stroke={OUTLINE} strokeWidth="2.6" />
      {/* Head */}
      <path
        d={`M${300 - jawWidth} 200 C${300 - jawWidth - 6} 280, ${300 - jawWidth * 0.65} 342, 300 364 C${300 + jawWidth * 0.65} 342, ${300 + jawWidth + 6} 280, ${300 + jawWidth} 200 C${300 + jawWidth - 6} 135, ${300 - jawWidth + 6} 135, ${300 - jawWidth} 200 Z`}
        fill={SKIN_BASE}
        stroke={OUTLINE}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      {/* Subtle chin & forehead soft shading */}
      <path
        d={`M${300 - jawWidth + 14} 175 Q300 158 ${300 + jawWidth - 14} 175 Q300 194 ${300 - jawWidth + 14} 175 Z`}
        fill={SKIN_SHADOW}
        opacity="0.35"
      />
    </g>
  )
}

export interface EyesProps {
  face: Face
  irisTop: string
  irisBottom: string
  blinking: boolean
  sharp?: boolean
}

export function AnimeEyes({ face, irisTop, irisBottom, blinking, sharp }: EyesProps) {
  const gid = useId().replace(/:/g, '')
  const drawClosedHappy = face === 'happy'
  const drawBlink = blinking && face !== 'surprised' && face !== 'shock' && face !== 'happy'

  if (drawClosedHappy) {
    return (
      <g stroke={OUTLINE} strokeWidth="4.4" strokeLinecap="round" fill="none">
        <path d="M236 266 Q256 244 276 266" />
        <path d="M324 266 Q344 244 364 266" />
      </g>
    )
  }

  if (drawBlink) {
    return (
      <g stroke={OUTLINE} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M235 266 Q257 274 279 264" />
        <path d="M321 264 Q343 274 365 266" />
      </g>
    )
  }

  const eyeH = face === 'surprised' || face === 'shock' ? 27 : face === 'smug' || face === 'think' ? 18 : 23
  const pupilR = face === 'shock' ? 5 : face === 'surprised' ? 7 : 9.5
  const pupilShiftX = face === 'think' ? 4 : 0
  const pupilShiftY = face === 'think' ? -3 : 0
  const lidY = face === 'smug' ? 250 : face === 'think' ? 248 : 240

  const renderEye = (cx: number, isLeft: boolean) => {
    const dir = isLeft ? 1 : -1
    const upperTilt = face === 'angry' ? 7 * dir : face === 'sad' ? -6 * dir : sharp ? 2 * dir : 0
    return (
      <g key={cx}>
        {/* Sclera */}
        <ellipse cx={cx} cy={264} rx={21} ry={eyeH} fill="#ffffff" stroke={OUTLINE} strokeWidth="2.2" />
        {/* Upper sclera shadow */}
        <path
          d={`M${cx - 20} ${264 - eyeH * 0.45} Q${cx} ${264 - eyeH * 0.9} ${cx + 20} ${264 - eyeH * 0.45} L${cx + 20} ${264 - eyeH * 0.15} Q${cx} ${264 - eyeH * 0.45} ${cx - 20} ${264 - eyeH * 0.15} Z`}
          fill="#d9d8eb"
          opacity="0.7"
        />
        {/* Iris */}
        <ellipse cx={cx + pupilShiftX} cy={264 + pupilShiftY} rx={14.5} ry={Math.min(eyeH - 2, 18.5)} fill={`url(#iris-${gid})`} />
        {/* Pupil */}
        <circle cx={cx + pupilShiftX} cy={265 + pupilShiftY} r={pupilR} fill={OUTLINE} opacity={face === 'shock' ? 0.55 : 0.85} />
        {face === 'shock' && <circle cx={cx} cy={265} r={11} fill="none" stroke={OUTLINE} strokeWidth="2" opacity="0.6" />}
        {/* Lower iris glow */}
        <ellipse cx={cx + pupilShiftX} cy={274 + pupilShiftY} rx={8.5} ry={4.2} fill="#ffffff" opacity="0.48" />
        {/* Specular highlights */}
        {face !== 'shock' && (
          <>
            <circle cx={cx - 6 + pupilShiftX} cy={255 + pupilShiftY} r={4.6} fill="#ffffff" />
            <circle cx={cx + 7 + pupilShiftX} cy={272 + pupilShiftY} r={2.3} fill="#ffffff" />
          </>
        )}
        {/* Skin eyelid mask for smug/think */}
        {(face === 'smug' || face === 'think') && (
          <path d={`M${cx - 23} ${lidY - 12} L${cx + 23} ${lidY - 12} L${cx + 23} ${lidY + 6} Q${cx} ${lidY + 2} ${cx - 23} ${lidY + 6} Z`} fill={SKIN_BASE} />
        )}
        {/* Upper eyelash */}
        <path
          d={`M${cx - 23} ${253 - upperTilt} Q${cx} ${235} ${cx + 23} ${253 + upperTilt}`}
          fill="none"
          stroke={OUTLINE}
          strokeWidth={sharp ? '5.2' : '4.5'}
          strokeLinecap="round"
        />
        {/* Outer lash wing */}
        <path
          d={`M${cx + (isLeft ? -23 : 23)} ${252 - (isLeft ? upperTilt : -upperTilt)} l${isLeft ? -5 : 5} -4`}
          stroke={OUTLINE}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Lower lash subtle */}
        <path d={`M${cx - 12} ${264 + eyeH + 1} Q${cx} ${264 + eyeH + 3} ${cx + 12} ${264 + eyeH + 1}`} fill="none" stroke={OUTLINE} strokeWidth="1.8" opacity="0.55" strokeLinecap="round" />
      </g>
    )
  }

  return (
    <g>
      <defs>
        <linearGradient id={`iris-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={irisTop} />
          <stop offset="1" stopColor={irisBottom} />
        </linearGradient>
      </defs>
      {renderEye(256, true)}
      {renderEye(344, false)}
    </g>
  )
}

export function Eyebrows({ face, color }: { face: Face; color: string }) {
  if (face === 'angry') {
    return (
      <g stroke={color} strokeWidth="3.6" strokeLinecap="round" fill="none">
        <path d="M234 228 L276 240" />
        <path d="M366 228 L324 240" />
      </g>
    )
  }
  if (face === 'sad' || face === 'blush') {
    return (
      <g stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M234 239 Q255 234 274 227" />
        <path d="M366 239 Q345 234 326 227" />
      </g>
    )
  }
  if (face === 'surprised' || face === 'shock') {
    return (
      <g stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M234 224 Q255 213 276 223" />
        <path d="M324 223 Q345 213 366 224" />
      </g>
    )
  }
  if (face === 'think') {
    return (
      <g stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M234 233 Q255 227 275 232" />
        <path d="M325 225 Q345 218 366 224" />
      </g>
    )
  }
  return (
    <g stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none">
      <path d="M234 233 Q256 225 276 232" />
      <path d="M324 232 Q344 225 366 233" />
    </g>
  )
}

export function Mouth({ face, mouthOpen }: { face: Face; mouthOpen: boolean }) {
  if (mouthOpen) {
    return (
      <g>
        <ellipse cx="300" cy="316" rx="10" ry="8.5" fill="#d96b78" stroke={OUTLINE} strokeWidth="2.4" />
        <path d="M293 319 Q300 314 307 319 Q300 324 293 319 Z" fill="#ff9eaa" />
      </g>
    )
  }
  switch (face) {
    case 'happy':
      return (
        <g>
          <path d="M284 310 Q300 330 316 310 Z" fill="#e56f7d" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M291 318 Q300 314 309 318 Q300 323 291 318 Z" fill="#ffa3b0" />
        </g>
      )
    case 'smile':
      return <path d="M286 314 Q300 324 314 313" fill="none" stroke={OUTLINE} strokeWidth="2.8" strokeLinecap="round" />
    case 'smug':
      return <path d="M287 316 Q303 322 317 310" fill="none" stroke={OUTLINE} strokeWidth="2.8" strokeLinecap="round" />
    case 'blush':
      return <path d="M291 316 Q296 312 300 316 Q304 320 309 315" fill="none" stroke={OUTLINE} strokeWidth="2.6" strokeLinecap="round" />
    case 'surprised':
      return <ellipse cx="300" cy="316" rx="7" ry="9" fill="#e07482" stroke={OUTLINE} strokeWidth="2.4" />
    case 'shock':
      return <ellipse cx="300" cy="318" rx="10" ry="12" fill="#d96b78" stroke={OUTLINE} strokeWidth="2.6" />
    case 'angry':
      return <path d="M288 319 Q300 311 312 319" fill="none" stroke={OUTLINE} strokeWidth="2.8" strokeLinecap="round" />
    case 'sad':
      return <path d="M290 320 Q300 314 310 320" fill="none" stroke={OUTLINE} strokeWidth="2.6" strokeLinecap="round" />
    case 'think':
      return <path d="M293 317 L308 315" fill="none" stroke={OUTLINE} strokeWidth="2.6" strokeLinecap="round" />
    default:
      return <path d="M291 316 Q300 319 309 316" fill="none" stroke={OUTLINE} strokeWidth="2.6" strokeLinecap="round" />
  }
}

export function BlushAndEmotes({ face }: { face: Face }) {
  const showBlush = face === 'blush' || face === 'happy' || face === 'smile'
  return (
    <g>
      {/* Cute nose dot */}
      <path d="M299 289 L298 294" stroke="#d49f94" strokeWidth="2.2" strokeLinecap="round" />
      {showBlush && (
        <g opacity={face === 'blush' ? 0.78 : 0.42}>
          <ellipse cx="242" cy="292" rx="16" ry="8" fill="#ff8ea3" />
          <ellipse cx="358" cy="292" rx="16" ry="8" fill="#ff8ea3" />
          {face === 'blush' && (
            <g stroke="#e85c77" strokeWidth="2" strokeLinecap="round">
              <line x1="234" y1="288" x2="230" y2="296" />
              <line x1="242" y1="288" x2="238" y2="296" />
              <line x1="250" y1="288" x2="246" y2="296" />
              <line x1="352" y1="288" x2="348" y2="296" />
              <line x1="360" y1="288" x2="356" y2="296" />
              <line x1="368" y1="288" x2="364" y2="296" />
            </g>
          )}
        </g>
      )}
      {/* Sweat drop */}
      {(face === 'surprised' || face === 'shock') && (
        <path
          d="M388 212 C382 225, 381 234, 388 236 C395 234, 394 225, 388 212 Z"
          fill="#a9e2ff"
          stroke={OUTLINE}
          strokeWidth="2"
        />
      )}
      {/* Anger mark */}
      {face === 'angry' && (
        <g stroke="#e0465e" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M366 196 Q373 203 380 196" />
          <path d="M366 212 Q373 205 380 212" />
          <path d="M363 199 Q370 204 363 209" />
          <path d="M383 199 Q376 204 383 209" />
        </g>
      )}
    </g>
  )
}
