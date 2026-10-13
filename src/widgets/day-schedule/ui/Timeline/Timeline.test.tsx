import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getStartOptions, type Booking } from '@/entities/booking'
import { Timeline } from './Timeline'

const NOW = new Date(2030, 4, 15, 10, 5)
const TODAY = '2030-05-15'
const TOMORROW = '2030-05-16'

const started: Booking = { id: 'a', date: TODAY, start: '10:00', end: '11:00', title: 'Daily' }
const upcoming: Booking = { id: 'b', date: TODAY, start: '14:00', end: '15:30', title: 'Review' }

function setup(date: string, bookings: Booking[], extra: { selectedId?: string } = {}) {
  const onSelectSlot = vi.fn()
  const onSelectBooking = vi.fn()
  render(
    <Timeline
      date={date}
      now={NOW}
      bookings={bookings}
      startOptions={getStartOptions(date, { bookings, now: NOW })}
      onSelectSlot={onSelectSlot}
      onSelectBooking={onSelectBooking}
      {...extra}
    />,
  )
  return { onSelectSlot, onSelectBooking }
}

const bookingsList = () => screen.getByRole('list', { name: 'Bookings' })
const freeSlots = () => within(screen.getByRole('list', { name: 'Free time' })).queryAllByRole('button')

describe('Timeline', () => {
  it('renders bookings with the visible text in their accessible names', () => {
    setup(TODAY, [started, upcoming])
    expect(within(bookingsList()).getByRole('button', { name: /14:00–15:30.*Review.*edit/ })).toBeEnabled()
  })

  it('started bookings are read-only', async () => {
    const { onSelectBooking } = setup(TODAY, [started, upcoming])
    const block = within(bookingsList()).getByRole('button', { name: /10:00–11:00.*read-only/ })
    expect(block).toBeDisabled()
    await userEvent.click(block)
    expect(onSelectBooking).not.toHaveBeenCalled()
  })

  it('clicking an upcoming booking selects it', async () => {
    const { onSelectBooking } = setup(TODAY, [upcoming])
    await userEvent.click(screen.getByRole('button', { name: /Review/ }))
    expect(onSelectBooking).toHaveBeenCalledWith(upcoming)
  })

  it('marks the selected booking as pressed', () => {
    setup(TODAY, [upcoming], { selectedId: 'b' })
    expect(screen.getByRole('button', { name: /Review/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('today: no free slots in the past, the first one starts after now', () => {
    setup(TODAY, [started])
    const names = freeSlots().map((b) => b.textContent)
    expect(names).not.toContain('+ Book from 09:00')
    expect(names[0]).toBe('+ Book from 11:00')
  })

  it('a free slot passes its start time', async () => {
    const { onSelectSlot } = setup(TOMORROW, [])
    await userEvent.click(screen.getByRole('button', { name: 'Book from 13:00' }))
    expect(onSelectSlot).toHaveBeenCalledWith('13:00')
  })

  it('a future empty day offers all 18 half-hour slots', () => {
    setup(TOMORROW, [])
    expect(freeSlots()).toHaveLength(18)
  })

  it('a past day offers no slots', () => {
    setup('2030-05-14', [])
    expect(freeSlots()).toHaveLength(0)
  })
})
