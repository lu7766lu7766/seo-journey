import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { detachSplash, fadeOutSplash, waitForBootAssets } from './boot'

const root = createRoot(document.getElementById('root')!)

void waitForBootAssets().then(() => {
  const splash = detachSplash()
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  // let React paint the first frame underneath, then dissolve the splash
  requestAnimationFrame(() => requestAnimationFrame(() => fadeOutSplash(splash)))
})
