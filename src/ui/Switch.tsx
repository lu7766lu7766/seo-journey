/** 遊戲設定風格的開關：清楚的 ON／OFF、鍵盤可操作（Tab 聚焦、Space／Enter 切換）。 */
export function Switch({
  checked,
  onChange,
  label,
  testId,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  testId?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={`relative h-9 w-[96px] shrink-0 cursor-pointer rounded-full border-2 font-title text-sm font-bold tracking-wider shadow-inner transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7ee8fa] ${
        checked
          ? 'border-[#b8325a] bg-gradient-to-r from-[#f38aa6] to-[#d6334a] text-white'
          : 'border-[#8c86a6] bg-[#d9d5e8] text-[#5f5a78]'
      }`}
    >
      <span className={`absolute top-1/2 -translate-y-1/2 ${checked ? 'left-3.5' : 'right-3.5'}`}>{checked ? 'ON' : 'OFF'}</span>
      <span
        className={`absolute top-0.5 h-[28px] w-[28px] rounded-full border border-black/10 bg-white shadow-md transition-all duration-150 ${
          checked ? 'left-[62px]' : 'left-0.5'
        }`}
        aria-hidden="true"
      />
    </button>
  )
}
