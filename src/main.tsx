import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './app/App'
import { ensureSeeded } from './db/db'

// Ask the browser to protect IndexedDB from storage-pressure eviction —
// on a local-first app, eviction means the user's entire log is gone.
void navigator.storage?.persist?.().catch(() => undefined)

void ensureSeeded().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})
