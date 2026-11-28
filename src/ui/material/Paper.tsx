import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react'

export type PaperTone = 'cream' | 'warm' | 'kraft' | 'white'
export type PaperRule = 'none' | 'lined' | 'grid' | 'memo'

interface PaperOwnProps {
  tone?: PaperTone
  rule?: PaperRule
  rotate?: number
  curled?: boolean
  interactive?: boolean
  dogEar?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

type DivPaperProps = PaperOwnProps & { as?: 'div' | 'article' | 'section' } & Omit<
    HTMLAttributes<HTMLDivElement>,
    keyof PaperOwnProps | 'as'
  >

type ButtonPaperProps = PaperOwnProps & { as: 'button' } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    keyof PaperOwnProps | 'as'
  >

export type PaperProps = DivPaperProps | ButtonPaperProps

const TONE_CLS: Record<PaperTone, string> = {
  cream: '',
  warm: 'mat-paper-warm',
  kraft: 'mat-paper-kraft',
  white: 'mat-paper-white',
}

const RULE_CLS: Record<PaperRule, string> = {
  none: '',
  lined: 'mat-paper-ruled',
  grid: 'mat-paper-grid',
  memo: 'mat-paper-memo',
}

/** 紙張卡片元件：支援四種紙色、線條格紋、微傾角度、翹角投影與可及性互動抬起效果。 */
export function Paper(props: PaperProps) {
  const {
    as = 'div',
    tone = 'cream',
    rule = 'none',
    rotate = 0,
    curled = true,
    interactive = false,
    dogEar = false,
    className = '',
    style,
    children,
    ...rest
  } = props

  const classes = [
    'mat-paper',
    TONE_CLS[tone],
    RULE_CLS[rule],
    curled ? 'mat-paper-curled' : '',
    interactive ? 'mat-paper-interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const mergedStyle = { '--mat-rot': `${rotate}deg`, ...style } as CSSProperties

  const corner = dogEar ? (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 right-0 z-10 h-4 w-4"
      style={{
        background: 'linear-gradient(135deg, rgba(168,140,104,0.34) 48%, rgba(255,253,248,0.88) 50%)',
        borderTopLeftRadius: '3px',
        boxShadow: '-1px -1px 2px rgba(56, 34, 12, 0.14)',
      }}
    />
  ) : null

  const paperSurface = <span aria-hidden="true" className="mat-paper-bg" />

  if (as === 'button') {
    const btnRest = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof PaperOwnProps | 'as'>
    return (
      <button type={btnRest.type ?? 'button'} className={classes} style={mergedStyle} {...btnRest}>
        {paperSurface}
        {children}
        {corner}
      </button>
    )
  }

  const Tag = as
  const elemRest = rest as Omit<HTMLAttributes<HTMLElement>, keyof PaperOwnProps | 'as'>
  return (
    <Tag className={classes} style={mergedStyle} {...elemRest}>
      {paperSurface}
      {children}
      {corner}
    </Tag>
  )
}
