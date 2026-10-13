/**
 * Integration: the app's retry policy against the mock API.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { useBookingsQuery } from '@/entities/booking'
import { mockControls } from '@/mocks/controls'
import { server, setupMockApi, TODAY } from '@/test/server'
import { QueryProvider } from './QueryProvider'

setupMockApi()

function Probe() {
  const query = useBookingsQuery(TODAY)
  return <p>{query.status}</p>
}

function countGets() {
  const counter = { gets: 0 }
  server.events.on('request:start', ({ request }) => {
    if (request.method === 'GET') counter.gets++
  })
  return counter
}

describe('QueryProvider retry policy', () => {
  it('L-004: a persistent 5xx is retried once and the error stays visible', async () => {
    const counter = countGets()
    mockControls.set('readsFail', true)
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    )
    expect(await screen.findByText('error', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(counter.gets).toBe(2)
  })

  it('a 4xx is not retried', async () => {
    const counter = countGets()
    server.use(http.get('*/api/bookings', () => HttpResponse.json({ code: 'X', message: 'Bad' }, { status: 400 })))
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    )
    expect(await screen.findByText('error')).toBeInTheDocument()
    await waitFor(() => expect(counter.gets).toBe(1))
  })
})
