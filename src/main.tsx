import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import '@/app/styles/index.css'

async function enableMocking() {
  // No backend: the mock API runs in production too (demo). Set VITE_USE_MOCKS=false for a real API.
  if (import.meta.env.VITE_USE_MOCKS === 'false') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ quiet: true })

  // A hard reload (Cmd+Shift+R) bypasses service workers, so requests would hit the real host and 404.
  // A normal reload hands control back to the worker; the flag prevents a reload loop.
  const RELOAD_FLAG = 'msw:reloaded'
  if (await waitForController(1000)) {
    sessionStorage.removeItem(RELOAD_FLAG)
  } else if (sessionStorage.getItem(RELOAD_FLAG)) {
    // Already retried once: give up for this load, but let the next hard reload retry again.
    sessionStorage.removeItem(RELOAD_FLAG)
  } else {
    sessionStorage.setItem(RELOAD_FLAG, '1')
    window.location.reload()
    return new Promise<never>(() => {})
  }
}

// On a first visit the worker claims the page a moment after start() resolves.
function waitForController(timeoutMs: number): Promise<boolean> {
  if (navigator.serviceWorker.controller) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(false), timeoutMs)
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        window.clearTimeout(timer)
        resolve(true)
      },
      { once: true },
    )
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
