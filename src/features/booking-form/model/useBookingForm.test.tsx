/**
 * Integration: form model + useBookingsQuery + mock API + rules.
 */
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBookingsQuery } from '@/entities/booking'
import { mockControls } from '@/mocks/controls'
import { db } from '@/mocks/db'
import { toastStore } from '@/shared/ui/Toaster/toastStore'
import { renderHookWithProviders } from '@/test/render'
import { NOW, TODAY, TOMORROW, setupMockApi } from '@/test/server'
import { useBookingForm } from './useBookingForm'

setupMockApi()

function setup(date = TOMORROW) {
  const utils = renderHookWithProviders(() => {
    const query = useBookingsQuery(date)
    return { query, form: useBookingForm({ date, bookings: query.data ?? [], now: NOW }) }
  })
  return utils
}

async function loaded(date = TOMORROW) {
  const utils = setup(date)
  await waitFor(() => expect(utils.result.current.query.isSuccess).toBe(true))
  return utils
}

const lastToast = () => toastStore.getSnapshot().at(-1)

describe('useBookingForm (integration)', () => {
  it('selecting a slot fills the time, keeps the title and requests focus', async () => {
    const { result } = await loaded()
    act(() => result.current.form.setTitle('Planning'))
    act(() => result.current.form.selectSlot('13:00'))
    expect(result.current.form.values).toEqual({ start: '13:00', end: '14:00', title: 'Planning' })
    expect(result.current.form.focusRequest).toBe(1)
  })

  it('suggests a shorter end when the next booking is close', async () => {
    const { result } = await loaded()
    act(() => result.current.form.selectSlot('10:00'))
    expect(result.current.form.values.end).toBe('11:00')
    act(() => result.current.form.setStart('10:30'))
    expect(result.current.form.values.end).toBe('11:00')
  })

  it('an empty submit shows errors and sends nothing', async () => {
    const { result } = await loaded()
    const before = db.all().length
    act(() => result.current.form.submit())
    expect(result.current.form.fieldError('start')).toBe('Select a start time')
    expect(result.current.form.isSubmitting).toBe(false)
    expect(db.all()).toHaveLength(before)
  })

  it('a successful create resets the form and shows a toast', async () => {
    const { result } = await loaded()
    act(() => {
      result.current.form.selectSlot('13:00')
      result.current.form.setTitle('  Planning ')
    })
    act(() => result.current.form.submit())
    await waitFor(() => expect(lastToast()?.title).toBe('Room booked'))
    expect(lastToast()?.message).toBe('13:00–14:00 · Planning')
    expect(result.current.form.values).toEqual({ start: '', end: '', title: '' })
    await waitFor(() => expect(result.current.query.data).toHaveLength(2))
  })

  it('409: shows a warning, refetches, keeps the input (rule 8)', async () => {
    const { result } = await loaded()
    mockControls.set('conflictOnNextWrite', true)
    act(() => {
      result.current.form.selectSlot('15:00')
      result.current.form.setTitle('Mine')
    })
    act(() => result.current.form.submit())

    await waitFor(() => expect(result.current.form.feedback?.title).toBe('This slot was just taken'))
    expect(result.current.form.values).toEqual({ start: '15:00', end: '16:00', title: 'Mine' })
    await waitFor(() => expect(result.current.query.data).toHaveLength(2))
    expect(result.current.form.fieldError('start')).toBe('Overlaps with booking 15:00–16:00')
  })

  it('editing a booking that was deleted meanwhile switches to create mode, input kept', async () => {
    const { result } = await loaded()
    const interview = result.current.query.data![0]!
    act(() => result.current.form.startEdit(interview))
    expect(result.current.form.mode.type).toBe('edit')

    db.remove(interview.id)
    act(() => result.current.form.setTitle('Renamed'))
    act(() => result.current.form.submit())

    await waitFor(() => expect(result.current.form.feedback?.title).toBe('This booking no longer exists'))
    expect(result.current.form.mode.type).toBe('create')
    expect(result.current.form.values.title).toBe('Renamed')
  })

  it('a successful edit updates the booking', async () => {
    const { result } = await loaded()
    act(() => result.current.form.startEdit(result.current.query.data![0]!))
    act(() => result.current.form.setEnd('12:30'))
    act(() => result.current.form.submit())
    await waitFor(() => expect(lastToast()?.title).toBe('Booking updated'))
    expect(db.byDate(TOMORROW)[0]).toMatchObject({ start: '11:00', end: '12:30' })
  })

  it('started bookings cannot be opened for editing', async () => {
    const { result } = await loaded(TODAY)
    const started = result.current.query.data!.find((b) => b.start === '10:00')!
    act(() => result.current.form.startEdit(started))
    expect(result.current.form.mode.type).toBe('create')
  })

  it('a past date is read-only', async () => {
    const { result } = await loaded('2030-05-14')
    expect(result.current.form.isReadOnlyDate).toBe(true)
    expect(result.current.form.hasFreeTime).toBe(false)
  })
})
