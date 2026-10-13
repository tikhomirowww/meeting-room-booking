/**
 * Integration: BookingForm UI driven by the real form model and mock API.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBookingsQuery } from '@/entities/booking'
import { mockControls } from '@/mocks/controls'
import { renderWithProviders } from '@/test/render'
import { NOW, TODAY, TOMORROW, setupMockApi } from '@/test/server'
import { useBookingForm } from '../../model/useBookingForm'
import { BookingForm } from './BookingForm'

setupMockApi()

function Harness({ date }: { date: string }) {
  const query = useBookingsQuery(date)
  const form = useBookingForm({ date, bookings: query.data ?? [], now: NOW })
  if (!query.data) return <p>loading</p>
  return (
    <>
      <button type="button" onClick={() => form.selectSlot('13:00')}>
        pick 13:00
      </button>
      <button type="button" onClick={() => form.startEdit(query.data[0]!)}>
        edit first
      </button>
      <BookingForm form={form} editActions={<p>edit actions slot</p>} />
    </>
  )
}

async function setup(date = TOMORROW) {
  const utils = renderWithProviders(<Harness date={date} />)
  await screen.findByRole('form', { name: 'New booking' })
  return utils
}

const startSelect = () => screen.getByRole('combobox', { name: 'Start' })
const endSelect = () => screen.getByRole('combobox', { name: 'End' })
const optionTexts = (select: HTMLElement) => within(select).getAllByRole('option').map((o) => o.textContent)

describe('BookingForm', () => {
  it('hides past start times and labels booked ones', async () => {
    await setup(TODAY)
    const texts = optionTexts(startSelect())
    expect(texts).not.toContain('09:00')
    expect(texts).toContain('14:00 · booked')
    expect(within(startSelect()).getByRole('option', { name: '14:00 · booked' })).toBeDisabled()
  })

  it('end options show durations and are limited by the next booking', async () => {
    const { user } = await setup()
    await user.selectOptions(startSelect(), '10:00')
    expect(optionTexts(endSelect())).toEqual(['—', '10:30 · 30 min', '10:45 · 45 min', '11:00 · 1 h'])
  })

  it('end is disabled until a start is chosen', async () => {
    await setup()
    expect(endSelect()).toBeDisabled()
  })

  it('an empty submit shows one error, under Start, linked to the field', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Book' }))
    expect(startSelect()).toHaveAttribute('aria-invalid', 'true')
    expect(startSelect()).toHaveAccessibleDescription('Select a start time')
    expect(screen.queryByText('Select an end time')).not.toBeInTheDocument()
  })

  it('picking a slot focuses the title field', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'pick 13:00' }))
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveFocus()
    expect(startSelect()).toHaveValue('13:00')
  })

  it('409: a dialog explains it, and closing it keeps the input', async () => {
    const { user } = await setup()
    mockControls.set('conflictOnNextWrite', true)
    await user.click(screen.getByRole('button', { name: 'pick 13:00' }))
    await user.type(screen.getByRole('textbox', { name: /Title/ }), 'Mine')
    await user.click(screen.getByRole('button', { name: 'Book' }))

    const dialog = await screen.findByRole('dialog', { name: 'This slot was just taken' })
    await user.click(within(dialog).getByRole('button', { name: 'Got it' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Mine')
    expect(await screen.findByText('Overlaps with booking 13:00–14:00')).toBeInTheDocument()
    expect(startSelect()).toHaveAttribute('aria-invalid', 'true')
    expect(endSelect()).toHaveAttribute('aria-invalid', 'true')
  })

  it('edit mode: heading, edit actions, Cancel returns to create mode', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'edit first' }))
    expect(screen.getByRole('form', { name: 'Edit booking' })).toBeInTheDocument()
    expect(screen.getByText('edit actions slot')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Interview')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('form', { name: 'New booking' })).toBeInTheDocument()
    expect(screen.queryByText('edit actions slot')).not.toBeInTheDocument()
  })

  it('a past date is read-only', async () => {
    await setup('2030-05-14')
    expect(screen.getByText(/This date is in the past/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Book' })).toBeDisabled()
    expect(startSelect()).toBeDisabled()
  })
})
