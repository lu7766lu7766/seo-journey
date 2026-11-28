import type { ReactNode } from 'react'
import { RoomBadge } from './Motifs'
import { StickyNote } from './StickyNote'

export interface MonitorStickyNote {
  testId: string
  title?: string
  content: string
  onClose?: () => void
}

export interface RetroMonitorFrameProps {
  /** 螢幕頂部復古系統標題列文字 */
  programTitle: string
  /** 標題列右側內容（題號、進度、提示鈕等） */
  headerRight?: ReactNode
  /** 螢幕主視窗底色風格：dark（深石板終端）或 light（暖米白應用程式） */
  screenTone?: 'dark' | 'light'
  /** 貼在螢幕右側塑膠邊框上的索老師黃色便利貼 */
  stickyNote?: MonitorStickyNote | null
  /** 螢幕底部固定動作列 */
  footer?: ReactNode
  /** 塑膠外殼左下銘牌文字 */
  bezelLabel?: string
  className?: string
  children: ReactNode
}

/** 404 社辦舊 CRT 電腦螢幕外殼：泛黃米白塑膠殼、玻璃微反光、微掃描線、電源燈與邊框便利貼。 */
export function RetroMonitorFrame({
  programTitle,
  headerRight,
  screenTone = 'light',
  stickyNote = null,
  footer,
  bezelLabel = 'AOBA-404 CRT',
  className = '',
  children,
}: RetroMonitorFrameProps) {
  const isDark = screenTone === 'dark'

  return (
    <div className={`relative flex items-start justify-center ${className}`}>
      <div className="mat-crt-bezel flex h-[632px] w-[940px] shrink-0 flex-col p-[18px] pb-[12px]">
        <div className="mat-crt-recess flex min-h-0 flex-1 flex-col p-[8px]">
          <div className="mat-crt-screen relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* 螢幕頂部復古程式標題列 */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#3a5765] bg-[#203640] px-4 py-2 text-[#f6f1e4]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 shrink-0 border border-[#d6efe7]/55 bg-[#7ce8c8]/80"
                />
                <span className="truncate font-title text-[16px] font-bold tracking-wide text-[#f7f3e8]">
                  {programTitle}
                </span>
              </div>
              {headerRight && <div className="flex shrink-0 items-center gap-2.5">{headerRight}</div>}
            </div>

            {/* 螢幕主內容區 */}
            <div
              className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${
                isDark ? 'bg-[#152329] text-[#eef4f2]' : 'bg-[#f7f2e6] text-ink-body'
              }`}
            >
              {children}
            </div>

            {/* 螢幕底部動作列 */}
            {footer && (
              <div
                className={`shrink-0 px-4 py-2.5 ${
                  isDark
                    ? 'border-t border-[#344e59] bg-[#1b2d34] text-[#e4ecee]'
                    : 'border-t border-[#c4b596] bg-[#ebe2cd] text-ink-body'
                }`}
              >
                {footer}
              </div>
            )}

            {/* 顯像管微反光與微掃描線疊層 */}
            <div aria-hidden="true" className="mat-crt-scanlines pointer-events-none absolute inset-0 z-20" />
            <div aria-hidden="true" className="mat-crt-glare pointer-events-none absolute inset-0 z-20" />
          </div>
        </div>

        {/* 機殼下緣條：404 門牌、型號銘牌、塑膠調節鈕與電源指示燈 */}
        <div className="mt-2 flex shrink-0 items-center justify-between px-3">
          <div className="flex items-center gap-2.5">
            <RoomBadge label="404" />
            <span className="font-sans text-[13px] font-bold tracking-wider text-[#544b3d]">{bezelLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-[#847864] bg-[#c5bba5] shadow-inner" />
              <span className="h-3 w-3 rounded-full border border-[#847864] bg-[#c5bba5] shadow-inner" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="mat-crt-led inline-block h-2.5 w-2.5 rounded-full" />
              <span className="font-sans text-[13px] font-bold tracking-wider text-[#544b3d]">POWER</span>
            </div>
          </div>
        </div>
      </div>

      {/* 貼在塑膠螢幕右邊框上的索老師黃色便利貼 */}
      {stickyNote && (
        <StickyNote
          color="yellow"
          rotate={2}
          attach="tape"
          tapeColor="cream"
          data-testid={stickyNote.testId}
          className="z-30 -ml-[20px] mt-[48px] w-[248px] shrink-0 px-4 pb-4 pt-5 shadow-[0_10px_22px_rgba(38,18,6,0.34)]"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-dashed border-[#bfa75b]/70 pb-1">
            <span className="font-title text-[15px] font-bold text-[#7c5338]">{stickyNote.title ?? '索老師小抄'}</span>
            {stickyNote.onClose && (
              <button
                type="button"
                onClick={stickyNote.onClose}
                aria-label="收起提示"
                className="rounded-[2px] px-1.5 py-0.5 font-sans text-[13px] font-bold text-[#6e5120] hover:bg-[#ebd577]/70 focus-visible:outline-2 focus-visible:outline-[#2b6ea8]"
              >
                ✕
              </button>
            )}
          </div>
          <p className="font-title text-[15px] font-semibold leading-[1.5] text-ink-body">{stickyNote.content}</p>
        </StickyNote>
      )}
    </div>
  )
}

export interface DotMatrixSlipProps {
  children: ReactNode
  className?: string
}

/** 點陣印表機吐出的連續報表紙條（用於小遊戲結算畫面）。 */
export function DotMatrixSlip({ children, className = '' }: DotMatrixSlipProps) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col px-6 pb-3 pt-2.5 ${className}`}>
      {/* 印表機出紙縫導桿 */}
      <div
        aria-hidden="true"
        className="mx-3 h-2.5 shrink-0 rounded-t-[3px] border border-b-0 border-[#42555e] bg-gradient-to-b from-[#253339] to-[#4e616b] shadow-inner"
      />
      <div className="mat-dotmatrix-slip flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-10 py-3.5">{children}</div>
      </div>
    </div>
  )
}
