import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

const ACTIVATION_TIMEOUT_MS = 1000

let pending: Promise<void> | null = null

/** Re-registers this tab with the worker and resolves once the worker confirms it. */
function ensureActive(): Promise<void> {
  const controller = navigator.serviceWorker.controller
  if (!controller) return Promise.resolve()
  pending ??= new Promise<void>((resolve) => {
    const done = () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      clearTimeout(timer)
      pending = null
      resolve()
    }
    const onMessage = (event: MessageEvent<{ type?: string }>) => event.data?.type === 'MOCKING_ENABLED' && done()
    const timer = setTimeout(done, ACTIVATION_TIMEOUT_MS)
    navigator.serviceWorker.addEventListener('message', onMessage)
    controller.postMessage('MOCK_ACTIVATE')
  })
  return pending
}

/**
 * The browser stops an idle service worker (background tabs also throttle MSW's keepalive timer),
 * and a restarted worker forgets which tabs it mocks for: their requests go to the real host
 * (404 on Vercel). Sending MOCK_ACTIVATE isn't enough on its own, because the worker registers the
 * tab asynchronously and a request sent right after can slip past. So every API request first waits
 * for the worker to confirm the tab is registered. That's one message round trip (lesson L-014).
 */
export function keepMockingActive() {
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href)
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) await ensureActive()
    return originalFetch(input, init)
  }
}
