/**
 * Integration: bookingApi → http client → mock server → business rules → storage.
 */
import { describe, expect, it } from 'vitest'
import { getErrorMessage, isApiError, isConflictError, isNotFoundError } from '@/shared/api'
import { TOMORROW, setupMockApi } from '@/test/server'
import { bookingApi } from './bookingApi'

setupMockApi()

describe('bookingApi (integration)', () => {
  it('full lifecycle: create → read → update → delete', async () => {
    const created = await bookingApi.create({ date: TOMORROW, start: '13:00', end: '14:00', title: 'Planning' })
    expect(created.id).toBeTruthy()

    let day = await bookingApi.getByDate(TOMORROW)
    expect(day.map((b) => b.start)).toEqual(expect.arrayContaining(['11:00', '13:00']))

    const updated = await bookingApi.update(created.id, { ...created, end: '14:30' })
    expect(updated).toMatchObject({ id: created.id, end: '14:30', title: 'Planning' })

    await bookingApi.remove(created.id)
    day = await bookingApi.getByDate(TOMORROW)
    expect(day.find((b) => b.id === created.id)).toBeUndefined()
  })

  it('an overlap surfaces as a typed conflict error', async () => {
    const error = await bookingApi.create({ date: TOMORROW, start: '11:30', end: '12:30' }).catch((e: unknown) => e)
    expect(isConflictError(error)).toBe(true)
    expect(getErrorMessage(error)).toBe('This time slot is already taken by another booking.')
  })

  it('a rule violation surfaces as a 400 with the rule message', async () => {
    const error = await bookingApi.create({ date: TOMORROW, start: '13:00', end: '13:15' }).catch((e: unknown) => e)
    expect(isApiError(error) && error.status).toBe(400)
    expect(getErrorMessage(error)).toBe('Minimum duration is 30 min')
  })

  it('editing does not conflict with itself (rule 7)', async () => {
    const [interview] = await bookingApi.getByDate(TOMORROW)
    await expect(bookingApi.update(interview!.id, { ...interview!, start: '11:30', end: '12:30' })).resolves.toMatchObject({
      start: '11:30',
    })
  })

  it('updating a deleted booking is a typed 404', async () => {
    const [interview] = await bookingApi.getByDate(TOMORROW)
    await bookingApi.remove(interview!.id)
    const error = await bookingApi.update(interview!.id, { title: 'x' }).catch((e: unknown) => e)
    expect(isNotFoundError(error)).toBe(true)
  })
})
