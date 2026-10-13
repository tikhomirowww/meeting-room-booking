import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { mockControls } from '@/mocks/controls'
import { db } from '@/mocks/db'
import { handlers } from '@/mocks/handlers'

/** Frozen "now" for integration tests. Seed: today 10:00–11:00 (started), 14:00–15:30; tomorrow 11:00–12:00. */
export const NOW = new Date(2030, 4, 15, 10, 5)
export const TODAY = '2030-05-15'
export const TOMORROW = '2030-05-16'

export const server = setupServer(...handlers)

/** Runs the mock API in Node with fresh data and a frozen clock for every test. */
export function setupMockApi() {
  beforeAll(() => server.listen())
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    db.reset()
    mockControls.set('conflictOnNextWrite', false)
    mockControls.set('readsFail', false)
  })
  afterEach(() => {
    server.resetHandlers()
    vi.useRealTimers()
  })
  afterAll(() => server.close())
}
