import { useEffect, useRef, useState } from 'react'
import { buildChecklistMarkdown } from '@/content/checklist'
import { KNOWLEDGE_IDS, KNOWLEDGE_TITLES } from '@/content/knowledge'

/** navigator.clipboard when available, otherwise a hidden textarea + execCommand('copy') */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the textarea fallback (e.g. insecure context, permission denied) */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** Copies the player's take-away checklist (Markdown) for their REAL website. Shows a 「已複製」 toast. */
export function CopyChecklistButton({
  unlocked,
  playerName,
  className = 'btn-pastel px-5 py-1.5 text-sm',
  label = '複製我的實戰檢查清單',
  testId = 'copy-checklist',
  toastBelow = false,
}: {
  unlocked: readonly string[]
  playerName?: string
  className?: string
  label?: string
  testId?: string
  /** show the toast under the button (when there is no room above, e.g. inside a scrolling list) */
  toastBelow?: boolean
}) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const onClick = async () => {
    const md = buildChecklistMarkdown(unlocked, KNOWLEDGE_TITLES, { playerName, total: KNOWLEDGE_IDS.length })
    const ok = await copyText(md)
    setState(ok ? 'ok' : 'fail')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2200)
  }

  return (
    <span className="relative inline-flex">
      <button type="button" className={className} data-testid={testId} onClick={() => void onClick()}>
        📋 {label}
      </button>
      {state !== 'idle' && (
        <span
          role="status"
          data-testid={`${testId}-toast`}
          className={`pointer-events-none absolute right-0 z-20 whitespace-nowrap rounded-full px-3.5 py-1 text-sm font-bold shadow-lg ${
            toastBelow ? 'top-full mt-1' : '-top-9 left-1/2 right-auto -translate-x-1/2'
          } ${
            state === 'ok' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}
        >
          {state === 'ok' ? '✓ 已複製' : '複製失敗，請改用其他瀏覽器'}
        </span>
      )}
    </span>
  )
}
