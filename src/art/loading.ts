import { create } from 'zustand'

/** Tracks in-flight asset preloads; `visible` only turns on if something takes longer than `LOADING_OVERLAY_DELAY_MS`. */
export const LOADING_OVERLAY_DELAY_MS = 200

interface AssetLoadingStore {
  pending: number
  visible: boolean
}

export const useAssetLoading = create<AssetLoadingStore>(() => ({ pending: 0, visible: false }))

let timer: ReturnType<typeof setTimeout> | undefined

export function trackAssetLoading<T>(work: Promise<T>, delayMs = LOADING_OVERLAY_DELAY_MS): Promise<T> {
  const st = useAssetLoading
  st.setState((s) => ({ pending: s.pending + 1 }))
  if (st.getState().pending === 1 && !st.getState().visible) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (st.getState().pending > 0) st.setState({ visible: true })
    }, delayMs)
  }
  const finish = () => {
    st.setState((s) => {
      const pending = Math.max(0, s.pending - 1)
      return pending === 0 ? { pending, visible: false } : { pending }
    })
    if (st.getState().pending === 0) clearTimeout(timer)
  }
  return work.then(
    (v) => (finish(), v),
    (e) => {
      finish()
      throw e
    },
  )
}

export function resetAssetLoadingForTests() {
  clearTimeout(timer)
  useAssetLoading.setState({ pending: 0, visible: false })
}
