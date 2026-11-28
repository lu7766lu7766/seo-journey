import { AnimatePresence, motion } from 'motion/react'
import { useAssetLoading } from '@/art/loading'

/** Small 「讀取中…」 cover (same look as the boot splash) shown only when artwork takes longer than ~200ms. */
export function LoadingOverlay() {
  const visible = useAssetLoading((s) => s.visible)
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading"
          className="absolute inset-0 z-[200] flex flex-col items-center justify-center gap-3"
          style={{ background: 'radial-gradient(ellipse at 50% 42%, #14224a 0%, #0b1430 62%)', fontFamily: 'var(--font-title)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="status"
          aria-live="polite"
          data-testid="loading-overlay"
        >
          <div className="boot-search" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#9fd3f0" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5 21 21" />
            </svg>
            <span className="boot-cursor" />
            <span className="boot-bar" />
          </div>
          <div className="boot-label">讀取中…</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
