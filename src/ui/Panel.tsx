import type { ReactNode } from 'react'

/** Modal panel used by menu / backlog / save-load / settings. */
export function Panel({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-ink/40"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="glass flex max-h-[640px] flex-col rounded-3xl p-6"
        style={{ width: wide ? 900 : 560 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-title text-3xl font-bold">{title}</h2>
          <button className="btn-pastel" onClick={onClose} aria-label="關閉">✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
