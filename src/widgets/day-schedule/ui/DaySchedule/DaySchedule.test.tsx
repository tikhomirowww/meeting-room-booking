import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Booking } from '@/entities/booking'
import { ApiError } from '@/shared/api'
import { DaySchedule } from './DaySchedule'

const booking: Booking = { id: 'b', date: '2030-05-16', start: '11:00', end: '12:00' }

function setup(props: Partial<Parameters<typeof DaySchedule>[0]> = {}) {
  const onRetry = vi.fn()
  render(
    <DaySchedule
      status="success"
      error={null}
      isRefreshing={false}
      onRetry={onRetry}
      date="2030-05-16"
      now={new Date(2030, 4, 15, 10, 5)}
      bookings={[]}
      startOptions={[]}
      onSelectSlot={() => {}}
      onSelectBooking={() => {}}
      {...props}
    />,
  )
  return { onRetry }
}

describe('DaySchedule', () => {
  it('loading: skeleton with a status for screen readers', () => {
    setup({ status: 'pending' })
    expect(screen.getByRole('status', { name: 'Loading schedule' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Bookings' })).not.toBeInTheDocument()
  })

  it('error: message from the API error and a Retry button', async () => {
    const { onRetry } = setup({
      status: 'error',
      error: new ApiError(500, { code: 'INTERNAL_ERROR', message: 'Server is down' }),
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load bookings')
    expect(screen.getByRole('alert')).toHaveTextContent('Server is down')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('empty day', () => {
    setup()
    expect(screen.getByText('No bookings on this day — the room is free.')).toBeInTheDocument()
  })

  it('counts bookings with correct pluralisation', () => {
    setup({ bookings: [booking] })
    expect(screen.getByText('1 booking')).toBeInTheDocument()
  })

  it('shows a background refresh indicator', () => {
    setup({ isRefreshing: true })
    expect(screen.getByText('Refreshing…')).toBeInTheDocument()
  })
})
