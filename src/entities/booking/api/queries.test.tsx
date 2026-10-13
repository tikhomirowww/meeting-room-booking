/**
 * Integration: useBookingsQuery with a real QueryClient against the mock server.
 */
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockControls } from '@/mocks/controls'
import { renderHookWithProviders } from '@/test/render'
import { TODAY, TOMORROW, setupMockApi } from '@/test/server'
import { bookingApi } from './bookingApi'
import { bookingKeys, useBookingsQuery } from './queries'

setupMockApi()

describe('useBookingsQuery (integration)', () => {
  it('loads the day sorted by start time', async () => {
    await bookingApi.create({ date: TODAY, start: '11:00', end: '12:00' })
    const { result } = renderHookWithProviders(() => useBookingsQuery(TODAY))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((b) => b.start)).toEqual(['10:00', '11:00', '14:00'])
  })

  it('refetches after the day key is invalidated', async () => {
    const { result, queryClient } = renderHookWithProviders(() => useBookingsQuery(TOMORROW))
    await waitFor(() => expect(result.current.data).toHaveLength(1))

    await bookingApi.create({ date: TOMORROW, start: '15:00', end: '16:00' })
    await act(() => queryClient.invalidateQueries({ queryKey: bookingKeys.byDate(TOMORROW) }))
    await waitFor(() => expect(result.current.data).toHaveLength(2))
  })

  it('exposes server errors', async () => {
    mockControls.set('readsFail', true)
    const { result } = renderHookWithProviders(() => useBookingsQuery(TODAY))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toMatch(/temporarily unavailable/)
  })
})
