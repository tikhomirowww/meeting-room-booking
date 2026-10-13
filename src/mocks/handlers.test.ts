import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Booking } from '@/entities/booking/model'
import { mockControls } from './controls'
import { db } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)
const BASE = 'http://localhost/api/bookings'
const TODAY = '2030-05-15'
const TOMORROW = '2030-05-16'

function call(method: string, path = '', body?: unknown) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const create = (input: Partial<Booking>) => call('POST', '', { date: TOMORROW, start: '13:00', end: '14:00', ...input })

beforeAll(() => server.listen())
afterAll(() => server.close())
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2030, 4, 15, 10, 5))
  db.reset() // seed: today 10:00–11:00 (started), 14:00–15:30; tomorrow 11:00–12:00
  mockControls.set('conflictOnNextWrite', false)
  mockControls.set('readsFail', false)
})
afterEach(() => vi.useRealTimers())

describe('GET /api/bookings', () => {
  it('returns bookings for the date', async () => {
    const res = await call('GET', `?date=${TODAY}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Booking[]
    expect(body.map((b) => b.start).sort()).toEqual(['10:00', '14:00'])
  })

  it('400 without a valid date', async () => {
    expect((await call('GET')).status).toBe(400)
    expect((await call('GET', '?date=2030-02-30')).status).toBe(400)
  })

  it('500 while "readsFail" is on', async () => {
    mockControls.set('readsFail', true)
    expect((await call('GET', `?date=${TODAY}`)).status).toBe(500)
    expect((await call('GET', `?date=${TODAY}`)).status).toBe(500)
  })
})

describe('POST /api/bookings', () => {
  it('201 and persists, trimming the title', async () => {
    const res = await create({ title: '  Planning  ' })
    expect(res.status).toBe(201)
    const booking = (await res.json()) as Booking
    expect(booking).toMatchObject({ date: TOMORROW, start: '13:00', end: '14:00', title: 'Planning' })
    expect(db.find(booking.id)).toBeDefined()
  })

  it('409 CONFLICT on overlap, with details', async () => {
    const res = await create({ start: '11:30', end: '12:30' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'CONFLICT', details: [{ code: 'OVERLAP' }] })
  })

  it('touching boundaries is allowed', async () => {
    expect((await create({ start: '12:00', end: '13:00' })).status).toBe(201)
    expect((await create({ start: '10:00', end: '11:00' })).status).toBe(201)
  })

  it.each([
    ['too short', { start: '13:00', end: '13:15' }, 'TOO_SHORT'],
    ['too long', { start: '13:00', end: '15:30' }, 'TOO_LONG'],
    ['outside working hours', { start: '17:30', end: '18:30' }, 'OUTSIDE_WORKDAY'],
    ['past date', { date: '2030-05-14' }, 'PAST_DATE'],
    ['past time today', { date: TODAY, start: '09:00', end: '10:00' }, 'PAST_TIME'],
    ['bad format', { start: '9am' }, 'INVALID_FORMAT'],
  ])('400 VALIDATION_ERROR: %s', async (_, input, code) => {
    const res = await create(input)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_ERROR', details: [{ code }] })
  })

  it('ignores unknown fields', async () => {
    const res = await create({ id: 'hacked', extra: true } as Partial<Booking>)
    expect(((await res.json()) as Booking).id).not.toBe('hacked')
  })

  it('simulated concurrent booking → 409 once, colleague booking stored', async () => {
    mockControls.set('conflictOnNextWrite', true)
    const res = await create({})
    expect(res.status).toBe(409)
    expect(db.byDate(TOMORROW).some((b) => b.title === 'Booked by a colleague')).toBe(true)
    expect(mockControls.get('conflictOnNextWrite')).toBe(false)
    expect((await create({ start: '15:00', end: '16:00' })).status).toBe(201)
  })
})

describe('PATCH /api/bookings/:id', () => {
  async function tomorrowBooking() {
    return db.byDate(TOMORROW)[0]!
  }

  it('rule 7: a booking does not conflict with itself', async () => {
    const b = await tomorrowBooking()
    const res = await call('PATCH', `/${b.id}`, { start: '11:30', end: '12:30' })
    expect(res.status).toBe(200)
    expect(db.find(b.id)).toMatchObject({ start: '11:30', end: '12:30' })
  })

  it('an empty title clears it', async () => {
    const b = await tomorrowBooking()
    await call('PATCH', `/${b.id}`, { title: '' })
    expect(db.find(b.id)?.title).toBeUndefined()
  })

  it('404 for a missing booking', async () => {
    expect((await call('PATCH', '/nope', { start: '13:00' })).status).toBe(404)
  })

  it('400 BOOKING_LOCKED for a started booking', async () => {
    const started = db.byDate(TODAY).find((b) => b.start === '10:00')!
    const res = await call('PATCH', `/${started.id}`, { title: 'x' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'BOOKING_LOCKED' })
  })

  it('simulated conflict also fires when the new range overlaps the old one', async () => {
    const b = await tomorrowBooking()
    mockControls.set('conflictOnNextWrite', true)
    expect((await call('PATCH', `/${b.id}`, { end: '12:30' })).status).toBe(409)
  })
})

describe('DELETE /api/bookings/:id', () => {
  it('204, then 404 on repeat', async () => {
    const b = db.byDate(TOMORROW)[0]!
    expect((await call('DELETE', `/${b.id}`)).status).toBe(204)
    expect((await call('DELETE', `/${b.id}`)).status).toBe(404)
  })

  it('400 BOOKING_LOCKED for a started booking', async () => {
    const started = db.byDate(TODAY).find((b) => b.start === '10:00')!
    expect((await call('DELETE', `/${started.id}`)).status).toBe(400)
  })
})
