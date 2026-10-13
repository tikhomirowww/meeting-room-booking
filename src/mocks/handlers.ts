import { delay, http, HttpResponse } from 'msw'
import {
  findConflicts,
  isBookingLocked,
  validateBooking,
  type Booking,
  type BookingInput,
  type BookingViolation,
} from '@/entities/booking/model'
import { isValidDate } from '@/shared/lib/time'
import { mockControls } from './controls'
import { db } from './db'

const LATENCY_MS = 500

function errorResponse(status: number, code: string, message: string, details?: unknown) {
  return HttpResponse.json({ code, message, details }, { status })
}

function violationResponse(violations: BookingViolation[]) {
  const overlap = violations.find((v) => v.code === 'OVERLAP')
  if (overlap) {
    return errorResponse(409, 'CONFLICT', 'This time slot is already taken by another booking.', violations)
  }
  return errorResponse(400, 'VALIDATION_ERROR', violations[0]!.message, violations)
}

function pickInput(body: unknown): Partial<BookingInput> {
  if (!body || typeof body !== 'object') return {}
  const { date, start, end, title } = body as Record<string, unknown>
  const input: Partial<BookingInput> = {}
  if (typeof date === 'string') input.date = date
  if (typeof start === 'string') input.start = start
  if (typeof end === 'string') input.end = end
  if (typeof title === 'string') input.title = title.trim()
  return input
}

/** Simulates another user booking the same slot concurrently. */
function simulateConcurrentBooking(input: Partial<BookingInput>, excludeId?: string) {
  if (!input.date || !input.start || !input.end) return
  const slot = { date: input.date, start: input.start, end: input.end }
  if (findConflicts(slot, db.all(), excludeId).length > 0) return
  if (!mockControls.consume('conflictOnNextWrite')) return
  db.insert({ id: crypto.randomUUID(), ...slot, title: 'Booked by a colleague' })
}

function save(input: Partial<BookingInput>, existing?: Booking) {
  const candidate = { ...existing, ...input } as BookingInput
  const violations = validateBooking(
    { date: candidate.date ?? '', start: candidate.start ?? '', end: candidate.end ?? '', title: candidate.title },
    { bookings: db.all(), now: new Date(), excludeId: existing?.id },
  )
  if (violations.length > 0) return violationResponse(violations)

  const booking: Booking = { ...candidate, id: existing?.id ?? crypto.randomUUID() }
  if (!booking.title) delete booking.title
  if (existing) return HttpResponse.json(db.replace(booking))
  return HttpResponse.json(db.insert(booking), { status: 201 })
}

export const handlers = [
  http.get('/api/bookings', async ({ request }) => {
    await delay(LATENCY_MS)
    if (mockControls.get('readsFail')) {
      return errorResponse(500, 'INTERNAL_ERROR', 'The server is temporarily unavailable. Please try again in a minute.')
    }
    const date = new URL(request.url).searchParams.get('date')
    if (!isValidDate(date)) {
      return errorResponse(400, 'VALIDATION_ERROR', 'The date parameter is required (YYYY-MM-DD).')
    }
    return HttpResponse.json(db.byDate(date))
  }),

  http.post('/api/bookings', async ({ request }) => {
    await delay(LATENCY_MS)
    const input = pickInput(await request.json().catch(() => null))
    simulateConcurrentBooking(input)
    return save(input)
  }),

  http.patch<{ id: string }>('/api/bookings/:id', async ({ request, params }) => {
    await delay(LATENCY_MS)
    const existing = db.find(params.id)
    if (!existing) return errorResponse(404, 'NOT_FOUND', 'Booking not found — it may have been deleted.')
    if (isBookingLocked(existing, new Date())) {
      return errorResponse(400, 'BOOKING_LOCKED', 'Bookings that have started or ended cannot be changed.')
    }
    const input = pickInput(await request.json().catch(() => null))
    simulateConcurrentBooking({ ...existing, ...input }, existing.id)
    return save(input, existing)
  }),

  http.delete<{ id: string }>('/api/bookings/:id', async ({ params }) => {
    await delay(LATENCY_MS)
    const existing = db.find(params.id)
    if (!existing) return errorResponse(404, 'NOT_FOUND', 'Booking not found — it may have been deleted.')
    if (isBookingLocked(existing, new Date())) {
      return errorResponse(400, 'BOOKING_LOCKED', 'Bookings that have started or ended cannot be deleted.')
    }
    db.remove(params.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
