import type { HTMLAttributes, ReactNode } from 'react'

export interface CorkboardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode
  footer?: ReactNode
  showHardware?: boolean
  innerClassName?: string
}

/** 暖木框軟木公佈欄：外層為實木斜接框與黃銅角釘，內層為受左上夕陽照亮的壓縮軟木表面。 */
export function Corkboard({
  header,
  footer,
  showHardware = true,
  className = '',
  innerClassName = '',
  children,
  ...rest
}: CorkboardProps) {
  return (
    <div
      data-testid="corkboard"
      className={`mat-wood-frame flex flex-col rounded-[10px] p-[14px] ${className}`}
      {...rest}
    >
      {showHardware && (
        <>
          {/* 四角斜接線與低調黃銅角釘 */}
          <span aria-hidden="true" className="pointer-events-none absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#f3d89c] to-[#8f662d] shadow-[0_1px_2px_rgba(20,10,4,0.65)]" />
          <span aria-hidden="true" className="pointer-events-none absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#f3d89c] to-[#8f662d] shadow-[0_1px_2px_rgba(20,10,4,0.65)]" />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#f3d89c] to-[#8f662d] shadow-[0_1px_2px_rgba(20,10,4,0.65)]" />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#f3d89c] to-[#8f662d] shadow-[0_1px_2px_rgba(20,10,4,0.65)]" />
        </>
      )}

      <div
        data-testid="corkboard-content"
        className={`mat-cork-surface flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-[3px] px-7 py-5 ${innerClassName}`}
      >
        {header && <div className="relative z-10 shrink-0">{header}</div>}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center">{children}</div>
        {footer && <div className="relative z-10 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
