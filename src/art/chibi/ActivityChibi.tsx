import { motion } from 'motion/react'
import { ACTIVITIES } from '@/content/activities'
import type { ActivityId } from '@/content/activityIds'
import { CHARACTERS, type CharId, type SpeakerId } from '@/content/characters'
import type { SlotOutcome } from '@/systems/schedule'
import { PAPER_INK_ACCENT, PolaroidAvatar } from '@/ui/material'
import { useArtManifest } from '../manifest'
import { activityBannerName, resolveUiSrc } from '../resolve'

export interface ActivityChibiProps {
  outcome: SlotOutcome
}

type ChibiMood = 'happy' | 'focus' | 'excited' | 'sleep' | 'dizzy' | 'sick'

interface SceneTheme {
  bgFrom: string
  bgTo: string
  floor: string
  accent: string
  badge: string
}

const ACTIVITY_THEME: Record<ActivityId, SceneTheme> = {
  write: { bgFrom: '#fff3e4', bgTo: '#fde2cf', floor: '#edd1b8', accent: '#f07b3f', badge: '社團專題撰寫中' },
  research: { bgFrom: '#e8f3ff', bgTo: '#cfe4ff', floor: '#bdd5f5', accent: '#3b82f6', badge: '搜尋意圖解析中' },
  techcheck: { bgFrom: '#e0f7fa', bgTo: '#c4ecf5', floor: '#b0dfe9', accent: '#0891b2', badge: '網站效能調校中' },
  schema: { bgFrom: '#efe9ff', bgTo: '#dcd0ff', floor: '#cbc0f4', accent: '#7c3aed', badge: '結構化標記構築中' },
  qa: { bgFrom: '#fff1e6', bgTo: '#ffe0c7', floor: '#f4cfb3', accent: '#ea580c', badge: '直答問答編輯中' },
  authors: { bgFrom: '#fef8dc', bgTo: '#fceba8', floor: '#ecd98e', accent: '#ca8a04', badge: 'E-E-A-T 資歷認證' },
  social: { bgFrom: '#ffeef4', bgTo: '#ffd6e6', floor: '#f4c1d5', accent: '#e11d48', badge: '跨社團宣傳交流' },
  rest: { bgFrom: '#dff3ff', bgTo: '#bfe6ff', floor: '#a8d5f2', accent: '#0284c7', badge: '屋頂微風午休中' },
}

const OUTLINE = '#2a2040'

/** Anime-style chibi eyes for expressive moods. */
function ChibiEyes({
  mood,
  irisTop = '#252b54',
  irisBot = '#5fa8e8',
}: {
  mood: ChibiMood
  irisTop?: string
  irisBot?: string
}) {
  if (mood === 'sleep') {
    return (
      <g stroke={OUTLINE} strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M-21 -3 Q-15 3 -9 -3" />
        <path d="M9 -3 Q15 3 21 -3" />
      </g>
    )
  }
  if (mood === 'sick') {
    return (
      <g stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M-22 -6 L-10 -2 L-22 2" />
        <path d="M22 -6 L10 -2 L22 2" />
      </g>
    )
  }
  if (mood === 'dizzy') {
    return (
      <g stroke={OUTLINE} strokeWidth="2.2" fill="none">
        <circle cx="-15" cy="-3" r="6.5" fill="#ffffff" />
        <path d="M-15 -3 m-3 0 a3 3 0 1 1 6 0 a2 2 0 1 1 -4 0" strokeLinecap="round" />
        <circle cx="15" cy="-3" r="6.5" fill="#ffffff" />
        <path d="M15 -3 m-3 0 a3 3 0 1 1 6 0 a2 2 0 1 1 -4 0" strokeLinecap="round" />
      </g>
    )
  }
  if (mood === 'excited') {
    return (
      <g>
        {[-15, 15].map((cx) => (
          <g key={cx} transform={`translate(${cx}, -3)`}>
            <ellipse cx="0" cy="0" rx="7.2" ry="8.5" fill="#ffffff" stroke={OUTLINE} strokeWidth="1.8" />
            <ellipse cx="0" cy="0.5" rx="5.8" ry="7" fill={irisTop} />
            <ellipse cx="0" cy="3.5" rx="4.4" ry="3.2" fill={irisBot} />
            <path d="M0 -4 L1.2 -1 L4 0 L1.2 1 L0 4 L-1.2 1 L-4 0 L-1.2 -1 Z" fill="#fff7b8" />
            <circle cx="-2.4" cy="-3.2" r="2.2" fill="#ffffff" />
            <circle cx="2.3" cy="2.8" r="1.1" fill="#ffffff" />
          </g>
        ))}
      </g>
    )
  }
  // happy / focus
  const h = mood === 'focus' ? 7.6 : 8.4
  return (
    <g>
      {[-15, 15].map((cx) => (
        <g key={cx} transform={`translate(${cx}, -3)`}>
          <ellipse cx="0" cy="0" rx="6.8" ry={h} fill="#ffffff" stroke={OUTLINE} strokeWidth="1.8" />
          <ellipse cx="0" cy="0.6" rx="5.5" ry={h - 1.5} fill={irisTop} />
          <ellipse cx="0" cy="3.4" rx="4" ry="2.8" fill={irisBot} />
          <circle cx="0" cy="0" r="2.1" fill="#171933" />
          <circle cx="-2.2" cy="-3.1" r="2.2" fill="#ffffff" />
          <circle cx="2.1" cy="2.5" r="1.1" fill="#ffffff" />
          <path d="M-7 -6 Q0 -9 7 -6" fill="none" stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

function ChibiMouth({ mood }: { mood: ChibiMood }) {
  switch (mood) {
    case 'happy':
      return <path d="M-5 8 Q-2.5 11.5 0 8.5 Q2.5 11.5 5 8" fill="none" stroke={OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
    case 'excited':
      return <path d="M-6 7.5 Q0 16 6 7.5 Z" fill="#ff7a8f" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
    case 'focus':
      return <path d="M-4 9 Q0 10.5 4 9" fill="none" stroke={OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
    case 'sleep':
      return <circle cx="1" cy="9.5" r="2.3" fill="#ff8ea1" stroke={OUTLINE} strokeWidth="1.6" />
    case 'dizzy':
    case 'sick':
      return <path d="M-6 10 Q-3 7 0 10 Q3 13 6 10" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
  }
}

/** Cute 2.5-head Japanese anime protagonist chibi. */
function ChibiProtag({
  x,
  y,
  mood = 'happy',
  typing = false,
  wave = false,
  headband = false,
  scale = 1,
}: {
  x: number
  y: number
  mood?: ChibiMood
  typing?: boolean
  wave?: boolean
  headband?: boolean
  scale?: number
}) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* Soft contact shadow */}
      <ellipse cx="0" cy="54" rx="28" ry="6" fill="#231c3d" opacity="0.16" />

      <g className={mood === 'dizzy' ? 'chibi-orbit' : 'chibi-bob'}>
        {/* Body: school blazer + shirt + tie */}
        <g transform="translate(0, 20)">
          {/* Legs */}
          <rect x="-12" y="21" width="9" height="12" rx="4" fill="#2f3557" stroke={OUTLINE} strokeWidth="2.2" />
          <rect x="3" y="21" width="9" height="12" rx="4" fill="#2f3557" stroke={OUTLINE} strokeWidth="2.2" />
          {/* Blazer torso */}
          <path
            d="M-19 2 C-20 14, -17 24, -12 24 L12 24 C17 24, 20 14, 19 2 C17 -4, -17 -4, -19 2 Z"
            fill="#2b365e"
            stroke={OUTLINE}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* White collar V + crimson tie */}
          <path d="M-8 -2 L0 12 L8 -2 Z" fill="#ffffff" stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M-2.2 2 L2.2 2 L3.4 13 L0 16 L-3.4 13 Z" fill="#e13c57" stroke={OUTLINE} strokeWidth="1.4" />
          {/* Left arm */}
          <g className={typing ? 'chibi-type-l' : ''} style={{ transformOrigin: '-18px 4px' }}>
            <path d="M-18 3 Q-27 11 -22 19" fill="none" stroke="#2b365e" strokeWidth="8.5" strokeLinecap="round" />
            <path d="M-18 3 Q-27 11 -22 19" fill="none" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="-22" cy="19" r="5" fill="#fde3d2" stroke={OUTLINE} strokeWidth="2" />
          </g>
          {/* Right arm */}
          <g className={typing ? 'chibi-type-r' : wave ? 'chibi-sway' : ''} style={{ transformOrigin: '18px 4px' }}>
            {wave ? (
              <>
                <path d="M18 3 Q28 -6 29 -15" fill="none" stroke="#2b365e" strokeWidth="8.5" strokeLinecap="round" />
                <path d="M18 3 Q28 -6 29 -15" fill="none" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="29" cy="-16" r="5.2" fill="#fde3d2" stroke={OUTLINE} strokeWidth="2" />
              </>
            ) : (
              <>
                <path d="M18 3 Q27 11 22 19" fill="none" stroke="#2b365e" strokeWidth="8.5" strokeLinecap="round" />
                <path d="M18 3 Q27 11 22 19" fill="none" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="22" cy="19" r="5" fill="#fde3d2" stroke={OUTLINE} strokeWidth="2" />
              </>
            )}
          </g>
        </g>

        {/* Head (2.5-head anime proportion) */}
        <g transform="translate(0, -14)">
          {/* Back hair */}
          <path
            d="M-34 2 C-36 -28, -22 -42, 0 -42 C22 -42, 36 -28, 34 2 C34 14, 24 22, 0 22 C-24 22, -34 14, -34 2 Z"
            fill="url(#chibi-hair-me)"
            stroke={OUTLINE}
            strokeWidth="2.4"
          />
          {/* Ears */}
          <circle cx="-31" cy="4" r="5.5" fill="#fbd7c4" stroke={OUTLINE} strokeWidth="2.1" />
          <circle cx="31" cy="4" r="5.5" fill="#fbd7c4" stroke={OUTLINE} strokeWidth="2.1" />
          {/* Anime Face */}
          <path
            d="M-30 -6 C-31 15, -18 27, 0 27 C18 27, 31 15, 30 -6 C29 -28, 17 -35, 0 -35 C-17 -35, -29 -28, -30 -6 Z"
            fill="url(#chibi-skin)"
            stroke={OUTLINE}
            strokeWidth="2.4"
          />
          {/* Blush */}
          <ellipse cx="-19" cy="7" rx="5.5" ry="2.8" fill="#ff849d" opacity="0.58" />
          <ellipse cx="19" cy="7" rx="5.5" ry="2.8" fill="#ff849d" opacity="0.58" />
          {/* Eyes & Mouth */}
          <ChibiEyes mood={mood} irisTop="#263366" irisBot="#71bfff" />
          <ChibiMouth mood={mood} />
          {/* Eyebrows */}
          <path d="M-21 -15 Q-15 -18 -9 -15" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
          <path d="M9 -15 Q15 -18 21 -15" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
          {/* Front hair bangs */}
          <path
            d="M-33 -8 C-34 -31, -18 -43, 0 -43 C18 -43, 34 -31, 33 -8 L27 -16 L20 -5 L11 -18 L3 -6 L-6 -19 L-14 -6 L-23 -17 Z"
            fill="url(#chibi-hair-me)"
            stroke={OUTLINE}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Glossy anime hair highlight */}
          <path
            d="M-20 -25 Q-9 -31 0 -27 Q10 -31 20 -24"
            fill="none"
            stroke="#8bb8ff"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* Bouncing Ahoge */}
          <path
            d="M-1 -42 Q6 -56 17 -50 Q8 -46 3 -41 Z"
            fill="#32417a"
            stroke={OUTLINE}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          {/* Optional techcheck headband */}
          {headband && (
            <g>
              <path d="M-31 -18 Q0 -25 31 -18" fill="none" stroke="#06b6d4" strokeWidth="6" strokeLinecap="round" />
              <path d="M-31 -18 Q0 -25 31 -18" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeDasharray="6 4" opacity="0.7" />
            </g>
          )}
        </g>
      </g>
    </g>
  )
}

/** Cute heroine / sensei chibi for chatter cameos, social buddy, and infirmary care. */
function ChibiHeroine({
  who,
  x,
  y,
  scale = 0.92,
  mood = 'happy',
}: {
  who: Extract<SpeakerId, 'rin' | 'hare' | 'mirai' | 'sensei' | 'kuro'>
  x: number
  y: number
  scale?: number
  mood?: ChibiMood
}) {
  const palette: Record<typeof who, { hair: string; hi: string; irisTop: string; irisBot: string; outfit: string; ribbon: string }> = {
    rin: { hair: 'url(#chibi-hair-rin)', hi: '#6a8ee8', irisTop: '#1d2d6b', irisBot: '#6fa8ff', outfit: '#212b54', ribbon: '#d6334a' },
    hare: { hair: 'url(#chibi-hair-hare)', hi: '#ffd480', irisTop: '#8f4012', irisBot: '#ffbe4d', outfit: '#2c3761', ribbon: '#f59e0b' },
    mirai: { hair: 'url(#chibi-hair-mirai)', hi: '#e6e4ff', irisTop: '#564799', irisBot: '#56e0e6', outfit: '#2c355c', ribbon: '#3fd0d4' },
    sensei: { hair: 'url(#chibi-hair-sensei)', hi: '#e0bba0', irisTop: '#4e3424', irisBot: '#b68964', outfit: '#ffffff', ribbon: '#a9826a' },
    kuro: { hair: 'url(#chibi-hair-me)', hi: '#8c94ad', irisTop: '#242636', irisBot: '#7c849c', outfit: '#1c1f2e', ribbon: '#64748b' },
  }
  const p = palette[who]

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="54" rx="26" ry="5.5" fill="#231c3d" opacity="0.16" />
      <g className="chibi-bob">
        {/* Long back hair */}
        {who === 'rin' && (
          <path
            d="M-33 -12 C-38 14, -36 38, -26 42 L26 42 C36 38, 38 14, 33 -12 Z"
            fill={p.hair}
            stroke={OUTLINE}
            strokeWidth="2.3"
          />
        )}
        {who === 'hare' && (
          <path
            d="M25 -32 C44 -34, 52 -16, 42 -2 C36 -6, 31 -14, 24 -18 Z"
            fill={p.hair}
            stroke={OUTLINE}
            strokeWidth="2.3"
            className="chibi-sway"
            style={{ transformOrigin: '26px -22px' }}
          />
        )}
        {who === 'sensei' && (
          <circle cx="0" cy="-49" r="11" fill={p.hair} stroke={OUTLINE} strokeWidth="2.3" />
        )}

        {/* Body */}
        <g transform="translate(0, 20)">
          <path
            d="M-18 2 C-19 14, -16 24, -11 24 L11 24 C16 24, 19 14, 18 2 C16 -4, -16 -4, -18 2 Z"
            fill={p.outfit}
            stroke={OUTLINE}
            strokeWidth="2.3"
          />
          <path d="M-8 -2 L0 10 L8 -2 Z" fill="#ffffff" stroke={OUTLINE} strokeWidth="1.6" />
          {/* Cute ribbon */}
          <path d="M-6 2 L0 6 L-6 10 Z M6 2 L0 6 L6 10 Z" fill={p.ribbon} stroke={OUTLINE} strokeWidth="1.4" />
          <circle cx="0" cy="6" r="2.2" fill={p.ribbon} stroke={OUTLINE} strokeWidth="1.2" />
          {/* Arms */}
          <path d="M-17 4 Q-25 11 -21 17" fill="none" stroke={p.outfit} strokeWidth="7.5" strokeLinecap="round" />
          <path d="M-17 4 Q-25 11 -21 17" fill="none" stroke={OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="-21" cy="17" r="4.6" fill="#fde3d2" stroke={OUTLINE} strokeWidth="1.9" />
          <path d="M17 4 Q26 -3 27 -11" fill="none" stroke={p.outfit} strokeWidth="7.5" strokeLinecap="round" />
          <path d="M17 4 Q26 -3 27 -11" fill="none" stroke={OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="27" cy="-12" r="4.6" fill="#fde3d2" stroke={OUTLINE} strokeWidth="1.9" />
        </g>

        {/* Head */}
        <g transform="translate(0, -14)">
          <path
            d="M-32 2 C-34 -27, -20 -41, 0 -41 C20 -41, 34 -27, 32 2 C32 14, 22 22, 0 22 C-22 22, -32 14, -32 2 Z"
            fill={p.hair}
            stroke={OUTLINE}
            strokeWidth="2.3"
          />
          <path
            d="M-28 -5 C-29 14, -17 26, 0 26 C17 26, 29 14, 28 -5 C27 -27, 16 -33, 0 -33 C-16 -33, -27 -27, -28 -5 Z"
            fill="url(#chibi-skin)"
            stroke={OUTLINE}
            strokeWidth="2.3"
          />
          <ellipse cx="-18" cy="7" rx="5.2" ry="2.6" fill="#ff849d" opacity="0.6" />
          <ellipse cx="18" cy="7" rx="5.2" ry="2.6" fill="#ff849d" opacity="0.6" />
          <ChibiEyes mood={mood} irisTop={p.irisTop} irisBot={p.irisBot} />
          <ChibiMouth mood={mood} />
          {who === 'sensei' && (
            <g stroke="#8a5a44" strokeWidth="2.1" fill="none">
              <rect x="-23" y="-9" width="16" height="12" rx="4" />
              <rect x="7" y="-9" width="16" height="12" rx="4" />
              <line x1="-7" y1="-4" x2="7" y2="-4" />
            </g>
          )}
          {/* Bangs */}
          <path
            d={
              who === 'mirai'
                ? 'M-31 -6 C-32 -29, -17 -41, 0 -41 C17 -41, 32 -29, 31 -6 L24 -13 L15 -6 L4 -15 L-5 -6 L-15 -14 L-24 -6 Z'
                : 'M-31 -8 C-32 -30, -17 -41, 0 -41 C17 -41, 32 -30, 31 -8 L23 -15 L14 -6 L3 -16 L-7 -6 L-17 -15 L-25 -7 Z'
            }
            fill={p.hair}
            stroke={OUTLINE}
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <path d="M-17 -24 Q0 -30 17 -24" fill="none" stroke={p.hi} strokeWidth="3" strokeLinecap="round" opacity="0.72" />
          {/* Signature accessory */}
          {who === 'rin' && (
            <path d="M20 -31 L30 -37 L27 -25 Z" fill="#d6334a" stroke={OUTLINE} strokeWidth="1.8" />
          )}
          {who === 'mirai' && (
            <rect x="13" y="-22" width="12" height="5" rx="2.5" transform="rotate(-14 19 -19)" fill="#3fd0d4" stroke={OUTLINE} strokeWidth="1.6" />
          )}
          {who === 'kuro' && (
            <path d="M-30 -20 C-26 -42, 26 -42, 30 -20 L38 -15 L-30 -15 Z" fill="#1e2233" stroke={OUTLINE} strokeWidth="2.2" />
          )}
        </g>
      </g>
    </g>
  )
}

function ActivityStageContent({ outcome }: { outcome: SlotOutcome }) {
  // 1. Infirmary (stamina reached 0)
  if (outcome.status === 'infirmary') {
    return (
      <g>
        {/* Window & soft curtain */}
        <rect x="44" y="20" width="110" height="86" rx="10" fill="#d6f5ff" stroke="#ffffff" strokeWidth="4" />
        <line x1="99" y1="20" x2="99" y2="106" stroke="#ffffff" strokeWidth="3" />
        <path d="M36 16 L66 16 L54 114 L32 114 Z" fill="#ffffff" opacity="0.7" />
        {/* Clinic cross badge */}
        <g transform="translate(555, 44)">
          <g className="chibi-float">
            <circle r="20" fill="#ffffff" stroke="#ef4444" strokeWidth="2.5" />
            <rect x="-4" y="-11" width="8" height="22" rx="2" fill="#ef4444" />
            <rect x="-11" y="-4" width="22" height="8" rx="2" fill="#ef4444" />
          </g>
        </g>
        {/* Bed + tucked protagonist */}
        <g transform="translate(265, 134)">
          <rect x="-86" y="10" width="172" height="44" rx="12" fill="#ffffff" stroke={OUTLINE} strokeWidth="2.5" />
          <rect x="-78" y="-8" width="42" height="22" rx="9" fill="#e8f6ff" stroke={OUTLINE} strokeWidth="2.2" />
          <g transform="translate(-44, -18) rotate(-72) scale(0.86)">
            <g transform="translate(0, 14)">
              <path d="M-28 -5 C-29 14, -17 26, 0 26 C17 26, 29 14, 28 -5 C27 -27, 16 -33, 0 -33 C-16 -33, -27 -27, -28 -5 Z" fill="url(#chibi-skin)" stroke={OUTLINE} strokeWidth="2.4" />
              <ChibiEyes mood="sick" />
              <ChibiMouth mood="sick" />
              <path d="M-31 -8 C-32 -30, -17 -41, 0 -41 C17 -41, 32 -30, 31 -8 L23 -15 L14 -6 L3 -16 L-7 -6 L-17 -15 L-25 -7 Z" fill="url(#chibi-hair-me)" stroke={OUTLINE} strokeWidth="2.4" />
            </g>
          </g>
          {/* Ice pack on forehead */}
          <ellipse cx="-52" cy="-24" rx="11" ry="6" transform="rotate(-12 -52 -24)" fill="#ff9eb5" stroke={OUTLINE} strokeWidth="2" />
          {/* Blanket */}
          <path d="M-22 2 L76 2 C84 2, 88 12, 86 28 L86 42 L-22 42 Z" fill="#b5ead7" stroke={OUTLINE} strokeWidth="2.4" />
        </g>
        {/* Sensei caring with warm cocoa mug */}
        <ChibiHeroine who="sensei" x={450} y={136} mood="happy" />
        <g transform="translate(418, 126)">
          <g className="chibi-bob">
            <rect x="-8" y="-6" width="16" height="14" rx="4" fill="#fff7ed" stroke={OUTLINE} strokeWidth="2" />
            <path d="M-3 -10 Q-5 -16 -1 -21 M3 -10 Q5 -16 2 -21" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" className="chibi-zzz" />
          </g>
        </g>
      </g>
    )
  }

  // 2. Skipped (resting after infirmary)
  if (outcome.status === 'skipped') {
    return (
      <g>
        <circle cx="520" cy="54" r="24" fill="#fff5b8" opacity="0.7" />
        <g transform="translate(320, 134)">
          <rect x="-90" y="10" width="180" height="44" rx="12" fill="#ffffff" stroke={OUTLINE} strokeWidth="2.4" />
          <path d="M-25 4 L80 4 C88 4, 90 14, 90 40 L-25 40 Z" fill="#cdeee4" stroke={OUTLINE} strokeWidth="2.3" />
          <g transform="translate(-52, -16) rotate(-76) scale(0.84)">
            <path d="M-28 -5 C-29 14, -17 26, 0 26 C17 26, 29 14, 28 -5 C27 -27, 16 -33, 0 -33 C-16 -33, -27 -27, -28 -5 Z" fill="url(#chibi-skin)" stroke={OUTLINE} strokeWidth="2.4" />
            <ChibiEyes mood="sleep" />
            <ChibiMouth mood="sleep" />
            <path d="M-31 -8 C-32 -30, -17 -41, 0 -41 C17 -41, 32 -30, 31 -8 L23 -15 L14 -6 L3 -16 L-7 -6 L-17 -15 L-25 -7 Z" fill="url(#chibi-hair-me)" stroke={OUTLINE} strokeWidth="2.4" />
          </g>
        </g>
        <text x="348" y="84" className="chibi-zzz font-title text-2xl font-bold" fill="#2b8a57">Z</text>
        <text x="372" y="68" className="chibi-zzz font-title text-lg font-bold" style={{ animationDelay: '0.7s' }} fill="#38a169">z</text>
      </g>
    )
  }

  // 3. Fail (stress >= 80 triggered mistake)
  if (outcome.status === 'fail') {
    return (
      <g>
        {/* Anime comic panic lines */}
        <g stroke="#f43f5e" strokeWidth="2.5" opacity="0.28" strokeLinecap="round">
          <line x1="40" y1="30" x2="115" y2="55" />
          <line x1="25" y1="90" x2="100" y2="95" />
          <line x1="595" y1="32" x2="515" y2="58" />
          <line x1="605" y1="96" x2="525" y2="96" />
        </g>
        {/* Smoking/error laptop */}
        <g transform="translate(425, 134)">
          <rect x="-42" y="-34" width="84" height="52" rx="7" fill="#322342" stroke={OUTLINE} strokeWidth="2.5" />
          <rect x="-35" y="-27" width="70" height="38" rx="4" fill="#ffe4e8" />
          <text x="0" y="-4" textAnchor="middle" fill="#e11d48" fontSize="16" fontWeight="900">ERR!</text>
          <path d="M-54 18 L54 18 L64 28 L-64 28 Z" fill="#94a3b8" stroke={OUTLINE} strokeWidth="2.3" />
          <circle cx="-12" cy="-50" r="9" fill="#e2e8f0" opacity="0.85" className="chibi-zzz" />
          <circle cx="10" cy="-58" r="12" fill="#cbd5e1" opacity="0.75" className="chibi-zzz" style={{ animationDelay: '0.6s' }} />
        </g>
        <ChibiProtag x={245} y={134} mood="dizzy" />
        {/* Dizzy stars */}
        <g transform="translate(245, 62)">
          <g className="chibi-orbit">
            <path d="M-32 0 L-28 5 L-23 6 L-27 10 L-26 15 L-32 12 L-38 15 L-37 10 L-41 6 L-36 5 Z" fill="#ffd166" stroke={OUTLINE} strokeWidth="1.5" />
            <path d="M32 -4 L35 1 L40 2 L36 6 L37 11 L32 8 L27 11 L28 6 L24 2 L29 1 Z" fill="#ffd166" stroke={OUTLINE} strokeWidth="1.5" />
          </g>
        </g>
        {/* Anime sweatdrop */}
        <path d="M292 84 C287 95, 286 101, 292 104 C298 101, 297 95, 292 84 Z" fill="#7dd3fc" stroke={OUTLINE} strokeWidth="1.8" className="chibi-float" />
      </g>
    )
  }

  // 4. Activity-specific lively scenes
  const hasChatter = !!outcome.chatter
  const px = hasChatter ? 235 : 315

  switch (outcome.activityId) {
    case 'write':
      return (
        <g>
          {/* Clubroom window glow */}
          <rect x="64" y="42" width="110" height="82" rx="10" fill="#fffbeb" stroke="#e2c2a2" strokeWidth="4" />
          <line x1="119" y1="42" x2="119" y2="124" stroke="#e2c2a2" strokeWidth="3" />
          {/* Desk & glowing laptop */}
          <ChibiProtag x={px} y={128} mood="happy" typing />
          <g transform={`translate(${px + 68}, 148)`}>
            <rect x="-46" y="10" width="120" height="22" rx="6" fill="#d9a06c" stroke={OUTLINE} strokeWidth="2.3" />
            <rect x="-24" y="-22" width="60" height="36" rx="6" fill="#334155" stroke={OUTLINE} strokeWidth="2.2" />
            <rect x="-18" y="-17" width="48" height="26" rx="3" fill="#fff7ed" />
            <line x1="-12" y1="-9" x2="20" y2="-9" stroke="#f07b3f" strokeWidth="3" strokeLinecap="round" />
            <line x1="-12" y1="-1" x2="14" y2="-1" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="-12" y1="6" x2="22" y2="6" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* Floating manuscript pages */}
          <g transform={`translate(${px + 125}, 72)`}>
            <g className="chibi-float">
              <rect x="-18" y="-22" width="36" height="44" rx="5" fill="#ffffff" stroke={OUTLINE} strokeWidth="2" transform="rotate(-8)" />
              <line x1="-10" y1="-10" x2="10" y2="-10" stroke="#f07b3f" strokeWidth="2.6" strokeLinecap="round" />
              <line x1="-10" y1="-2" x2="12" y2="-2" stroke="#cbd5e1" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="-10" y1="6" x2="6" y2="6" stroke="#cbd5e1" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          </g>
          <path d={`M${px - 58} 62 L${px - 54} 72 L${px - 44} 76 L${px - 54} 80 L${px - 58} 90 L${px - 62} 80 L${px - 72} 76 L${px - 62} 72 Z`} fill="#fde047" className="chibi-float" />
        </g>
      )

    case 'research':
      return (
        <g>
          {/* Floating keyword bubbles */}
          <g transform="translate(128, 72)">
            <g className="chibi-float">
              <rect x="-46" y="-15" width="92" height="30" rx="15" fill="#ffffff" stroke="#3b82f6" strokeWidth="2.2" />
              <text x="0" y="5" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e40af">#青葉攻略</text>
            </g>
          </g>
          <g transform={`translate(${hasChatter ? 360 : 515}, 68)`}>
            <g className="chibi-float" style={{ animationDelay: '0.8s' }}>
              <rect x="-50" y="-16" width="100" height="32" rx="16" fill="#ffffff" stroke="#3b82f6" strokeWidth="2.2" />
              <text x="0" y="5" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e40af">Q 搜尋意圖</text>
            </g>
          </g>
          {/* Sparkline chart board */}
          <g transform={`translate(${px + 104}, 136)`}>
            <rect x="-42" y="-38" width="84" height="58" rx="8" fill="#ffffff" stroke={OUTLINE} strokeWidth="2.3" />
            <polyline points="-30,4 -10,-6 6,0 28,-22" fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="28" cy="-22" r="4.5" fill="#f59e0b" />
          </g>
          <ChibiProtag x={px} y={132} mood="focus" />
          {/* Oversized magnifying glass held cleanly in front/side */}
          <g transform={`translate(${px + 42}, 122)`}>
            <g className="chibi-sway" style={{ transformOrigin: '-8px 18px' }}>
              <line x1="-10" y1="14" x2="-22" y2="30" stroke="#92400e" strokeWidth="6" strokeLinecap="round" />
              <circle cx="0" cy="0" r="17" fill="#bfdbfe" fillOpacity="0.65" stroke={OUTLINE} strokeWidth="3" />
              <path d="M-7 -7 A10 10 0 0 1 6 -9" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            </g>
          </g>
        </g>
      )

    case 'techcheck':
      return (
        <g>
          {/* Spinning anime gears safely positioned away from corner badges */}
          <g transform="translate(132, 82)">
            <g className="chibi-spin">
              <circle r="24" fill="#67e8f9" stroke={OUTLINE} strokeWidth="2.3" strokeDasharray="9 5" />
              <circle r="9" fill="#e0f7fa" stroke={OUTLINE} strokeWidth="2.2" />
            </g>
          </g>
          <g transform={`translate(${hasChatter ? 366 : 536}, 76)`}>
            <g className="chibi-spin" style={{ animationDirection: 'reverse' }}>
              <circle r="18" fill="#a5f3fc" stroke={OUTLINE} strokeWidth="2.1" strokeDasharray="7 4" />
              <circle r="7" fill="#e0f7fa" stroke={OUTLINE} strokeWidth="2" />
            </g>
          </g>
          {/* Speed meter monitor */}
          <g transform={`translate(${px + 104}, 136)`}>
            <rect x="-40" y="-36" width="80" height="56" rx="8" fill="#0f172a" stroke={OUTLINE} strokeWidth="2.5" />
            <circle cx="0" cy="-10" r="19" fill="none" stroke="#1e293b" strokeWidth="5" />
            <circle cx="0" cy="-10" r="19" fill="none" stroke="#22c55e" strokeWidth="5" strokeDasharray="96 30" strokeLinecap="round" />
            <text x="0" y="-4" textAnchor="middle" fill="#4ade80" fontSize="14" fontWeight="800">98</text>
            <rect x="-12" y="20" width="24" height="10" rx="2" fill="#475569" stroke={OUTLINE} strokeWidth="1.8" />
          </g>
          <ChibiProtag x={px} y={132} mood="excited" headband />
          {/* Cute wrench held at side */}
          <g transform={`translate(${px - 44}, 128) rotate(-25)`}>
            <g className="chibi-sway" style={{ transformOrigin: '0px 14px' }}>
              <rect x="-4" y="-8" width="8" height="28" rx="3" fill="#e2e8f0" stroke={OUTLINE} strokeWidth="2" />
              <path d="M-9 -14 A10 10 0 1 1 9 -14 L5 -8 L-5 -8 Z" fill="#cbd5e1" stroke={OUTLINE} strokeWidth="2" />
            </g>
          </g>
        </g>
      )

    case 'schema':
      return (
        <g>
          {/* Floating JSON-LD blocks tower */}
          <g transform={`translate(${px + 96}, 122)`}>
            <g className="chibi-float">
              <rect x="-44" y="12" width="88" height="28" rx="7" fill="#7c3aed" stroke={OUTLINE} strokeWidth="2.2" />
              <text x="0" y="31" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="800">{'{ @type: FAQ }'}</text>
              <rect x="-38" y="-20" width="76" height="28" rx="7" fill="#a855f7" stroke={OUTLINE} strokeWidth="2.2" />
              <text x="0" y="-1" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="800">{'<Schema />'}</text>
              <rect x="-30" y="-52" width="60" height="28" rx="7" fill="#c084fc" stroke={OUTLINE} strokeWidth="2.2" />
              <text x="0" y="-33" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="800">JSON-LD</text>
            </g>
          </g>
          <ChibiProtag x={px} y={132} mood="excited" wave />
          <text x="92" y="80" fill="#7c3aed" fontSize="28" fontWeight="900" opacity="0.35" className="chibi-float">{'{}'}</text>
        </g>
      )

    case 'qa':
      return (
        <g>
          {/* Bouncing Q & A speech bubbles */}
          <g transform="translate(110, 74)">
            <g className="chibi-float">
              <rect x="-36" y="-20" width="72" height="36" rx="14" fill="#ffffff" stroke="#ea580c" strokeWidth="2.4" />
              <text x="0" y="4" textAnchor="middle" fill="#ea580c" fontSize="15" fontWeight="800">Q. 重點？</text>
            </g>
          </g>
          <g transform={`translate(${px + 106}, 66)`}>
            <g className="chibi-float" style={{ animationDelay: '0.6s' }}>
              <rect x="-40" y="-22" width="80" height="38" rx="14" fill="#ea580c" stroke={OUTLINE} strokeWidth="2.2" />
              <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="800">A. 一句直答!</text>
            </g>
          </g>
          <ChibiProtag x={px} y={132} mood="excited" />
          {/* Cute Megaphone */}
          <g transform={`translate(${px + 36}, 128)`}>
            <g className="chibi-sway" style={{ transformOrigin: '-6px 4px' }}>
              <path d="M-8 0 L18 -14 L18 14 L-8 4 Z" fill="#fb923c" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M24 -9 Q31 0 24 9" fill="none" stroke="#ea580c" strokeWidth="2.6" strokeLinecap="round" />
            </g>
          </g>
        </g>
      )

    case 'authors':
      return (
        <g>
          {/* Floating verified E-E-A-T badge card */}
          <g transform={`translate(${px + 98}, 122)`}>
            <g className="chibi-float">
              <rect x="-46" y="-42" width="92" height="68" rx="10" fill="#ffffff" stroke={OUTLINE} strokeWidth="2.4" />
              <circle cx="-22" cy="-14" r="12" fill="#fde68a" stroke={OUTLINE} strokeWidth="1.8" />
              <line x1="-2" y1="-20" x2="32" y2="-20" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="-2" y1="-10" x2="24" y2="-10" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
              <rect x="-34" y="6" width="68" height="14" rx="7" fill="#22c55e" />
              <text x="0" y="17" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">✓ VERIFIED</text>
            </g>
          </g>
          <ChibiProtag x={px} y={132} mood="happy" wave />
          <path d="M96 58 L100 68 L110 72 L100 76 L96 86 L92 76 L82 72 L92 68 Z" fill="#facc15" className="chibi-float" />
        </g>
      )

    case 'social':
      return (
        <g>
          <ChibiProtag x={px - 18} y={132} mood="happy" wave />
          {!hasChatter && <ChibiHeroine who="hare" x={px + 92} y={134} mood="excited" />}
          {/* Floating hearts & link sparkles */}
          <path
            d={`M${px + 34} 58 C${px + 26} 48, ${px + 14} 52, ${px + 14} 62 C${px + 14} 72, ${px + 34} 82, ${px + 34} 82 C${px + 34} 82, ${px + 54} 72, ${px + 54} 62 C${px + 54} 52, ${px + 42} 48, ${px + 34} 58 Z`}
            fill="#fb7185"
            stroke="#ffffff"
            strokeWidth="2"
            className="chibi-float"
          />
          <circle cx="84" cy="52" r="7" fill="#fda4af" opacity="0.8" className="chibi-zzz" />
          <circle cx="560" cy="74" r="6" fill="#fbcfe8" opacity="0.8" className="chibi-zzz" style={{ animationDelay: '0.8s' }} />
        </g>
      )

    case 'rest':
      return (
        <g>
          {/* Rooftop fence & drifting fluffy clouds */}
          <line x1="-80" y1="156" x2="720" y2="156" stroke="#94a3b8" strokeWidth="3" />
          <g className="chibi-float">
            <ellipse cx="110" cy="58" rx="34" ry="15" fill="#ffffff" opacity="0.9" />
            <ellipse cx="132" cy="54" rx="22" ry="13" fill="#ffffff" opacity="0.9" />
          </g>
          <g className="chibi-float" style={{ animationDelay: '1s' }}>
            <ellipse cx="515" cy="56" rx="38" ry="16" fill="#ffffff" opacity="0.88" />
          </g>
          {/* Wooden rooftop bench */}
          <rect x={px - 75} y="150" width="150" height="14" rx="4" fill="#d97706" stroke={OUTLINE} strokeWidth="2.2" />
          <ChibiProtag x={px} y={124} mood="sleep" />
          <text x={px + 42} y="76" className="chibi-zzz font-title text-2xl font-bold" fill="#0369a1">Z</text>
          <text x={px + 64} y="60" className="chibi-zzz font-title text-lg font-bold" style={{ animationDelay: '0.7s' }} fill="#0ea5e9">z</text>
        </g>
      )
  }
}

export function ActivityChibi({ outcome }: ActivityChibiProps) {
  const manifest = useArtManifest()
  // A real illustration (`ui/activity-<id>|fail|infirmary`, see docs/art-requests.md) replaces the drawn chibi scene.
  const bannerSrc = resolveUiSrc(manifest, `activity-${activityBannerName(outcome)}`)
  const def = ACTIVITIES[outcome.activityId]
  const theme =
    outcome.status === 'infirmary' || outcome.status === 'skipped'
      ? { bgFrom: '#e6faf3', bgTo: '#c8f2e4', floor: '#b0e6d4', accent: '#10b981', badge: outcome.status === 'infirmary' ? '保健室緊急休養' : '靜養恢復中' }
      : outcome.status === 'fail'
        ? { bgFrom: '#ffe8ee', bgTo: '#ffd0dc', floor: '#f5b8c8', accent: '#e11d48', badge: '壓力過載失誤！' }
        : ACTIVITY_THEME[outcome.activityId]

  const chatterWho = outcome.chatter?.who
  const hasSpriteChatter =
    outcome.status === 'ok' &&
    chatterWho &&
    (chatterWho === 'rin' || chatterWho === 'hare' || chatterWho === 'mirai' || chatterWho === 'sensei' || chatterWho === 'kuro')

  return (
    <div
      className="relative h-[202px] w-full overflow-hidden rounded-[2px] border border-[#cbb99f] shadow-[inset_0_1px_4px_rgba(38,18,6,0.16)]"
      style={{ background: `linear-gradient(180deg, ${theme.bgFrom}, ${theme.bgTo})` }}
    >
      {bannerSrc ? (
        <img src={bannerSrc} alt={def.name} draggable={false} className="h-full w-full select-none object-cover" data-testid="activity-banner" />
      ) : (
      <svg viewBox="0 0 792 202" preserveAspectRatio="xMidYMid slice" className="h-full w-full select-none" aria-label={def.name}>
        <defs>
          <linearGradient id="chibi-stage-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.bgFrom} />
            <stop offset="100%" stopColor={theme.bgTo} />
          </linearGradient>
          <linearGradient id="chibi-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff2e8" />
            <stop offset="100%" stopColor="#fbd5c0" />
          </linearGradient>
          <linearGradient id="chibi-hair-me" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#354378" />
            <stop offset="100%" stopColor="#1e264a" />
          </linearGradient>
          <linearGradient id="chibi-hair-rin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#283d78" />
            <stop offset="100%" stopColor="#141e42" />
          </linearGradient>
          <linearGradient id="chibi-hair-hare" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff9f43" />
            <stop offset="100%" stopColor="#d96b1f" />
          </linearGradient>
          <linearGradient id="chibi-hair-mirai" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b9b0ea" />
            <stop offset="100%" stopColor="#7f72be" />
          </linearGradient>
          <linearGradient id="chibi-hair-sensei" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b68a6e" />
            <stop offset="100%" stopColor="#7c563f" />
          </linearGradient>
        </defs>

        {/* Full-bleed Backdrop & soft floor across 792x202 stage */}
        <rect x="0" y="0" width="792" height="202" fill="url(#chibi-stage-bg)" />
        <rect x="0" y="164" width="792" height="38" fill={theme.floor} />
        <line x1="0" y1="164" x2="792" y2="164" stroke="#ffffff" strokeWidth="2" opacity="0.65" />

        <g transform="translate(76, 0)">
          <ActivityStageContent outcome={outcome} />

          {/* Heroine / Sensei cameo when chatter triggers */}
          {hasSpriteChatter && chatterWho && (
            <motion.g
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <ChibiHeroine who={chatterWho} x={520} y={132} mood="happy" />
              <g transform="translate(566, 62)">
                <g className="chibi-pop">
                  <rect x="-26" y="-14" width="52" height="26" rx="13" fill="#ffffff" stroke="#f472b6" strokeWidth="2" />
                  <text x="0" y="4" textAnchor="middle" fontSize="13" fontWeight="800" fill="#e11d48">
                    {outcome.chatter?.bond ? '♥ +1' : '♪'}
                  </text>
                </g>
              </g>
            </motion.g>
          )}
        </g>
      </svg>
      )}

      {/* 左上：紙質標籤條 */}
      <div className="pointer-events-none absolute left-3 top-2.5 flex items-center gap-2">
        <span
          className="rounded-[2px] border border-white/55 px-3 py-0.5 font-title text-[13.5px] font-bold text-[#fffdf8] shadow-[0_2px_6px_rgba(38,18,6,0.28)]"
          style={{ backgroundColor: theme.accent }}
        >
          {theme.badge}
        </span>
      </div>

      {/* 右上：手帳主題／疲勞貼標 */}
      <div className="pointer-events-none absolute right-3 top-2.5 flex items-center gap-1.5">
        {outcome.themed && outcome.status === 'ok' && (
          <span className="rounded-[2px] border border-[#fff2dc]/70 bg-[var(--color-stamp)] px-2.5 py-0.5 text-[13px] font-bold text-[#fffdf8] shadow-[0_2px_6px_rgba(38,18,6,0.28)]">
            ★ 本週主題 ×1.5
          </span>
        )}
        {outcome.halfTired && outcome.status === 'ok' && (
          <span className="rounded-[2px] border border-[#fff2dc]/70 bg-[#b45309] px-2.5 py-0.5 text-[13px] font-bold text-[#fffdf8] shadow-[0_2px_6px_rgba(38,18,6,0.28)]">
            疲勞減半
          </span>
        )}
      </div>

      {/* 實圖模式下顯示拍立得來訪小頭像 */}
      {bannerSrc && hasSpriteChatter && chatterWho && (
        <motion.div
          className="pointer-events-none absolute bottom-10 right-4"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <PolaroidAvatar id={chatterWho as CharId} size="md" rotate={3} />
          {outcome.chatter?.bond && (
            <span className="absolute -right-2 -top-2 rounded-[2px] border border-[var(--color-stamp)] bg-[#fff8eb] px-1.5 py-0.5 text-[13px] font-extrabold text-[var(--color-stamp)] shadow-sm">
              ♥ +1
            </span>
          )}
        </motion.div>
      )}

      {/* 右下：紙質經過名牌 */}
      {hasSpriteChatter && chatterWho && (
        <div
          className="pointer-events-none absolute bottom-2 right-3 rounded-[2px] border border-[#d6c7ae] bg-[#fffdf8]/95 px-2.5 py-0.5 font-title text-[13.5px] font-bold shadow-[0_2px_6px_rgba(38,18,6,0.22)]"
          style={{ color: PAPER_INK_ACCENT[chatterWho as CharId] }}
        >
          {CHARACTERS[chatterWho].name} 經過！
        </div>
      )}
    </div>
  )
}
