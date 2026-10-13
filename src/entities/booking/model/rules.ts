import {
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  TIME_STEP_MINUTES,
  WORK_DAY_END,
  WORK_DAY_START,
} from '@/shared/config'
import {
  formatDuration,
  fromMinutes,
  isValidDate,
  isValidTime,
  minutesOfDay,
  toIsoDate,
  toMinutes,
  type HhMm,
  type IsoDate,
} from '@/shared/lib/time'
import type { Booking, BookingInput, BookingViolation } from './types'

export const TITLE_MAX_LENGTH = 100

const DAY_START = toMinutes(WORK_DAY_START)
const DAY_END = toMinutes(WORK_DAY_END)

type Interval = { start: HhMm; end: HhMm }

export type ValidationContext = {
  bookings: readonly Booking[]
  now: Date
  excludeId?: string
}

export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end)
}

export function findConflicts(
  input: Pick<BookingInput, 'date' | 'start' | 'end'>,
  bookings: readonly Booking[],
  excludeId?: string,
): Booking[] {
  return bookings.filter(
    (b) => b.id !== excludeId && b.date === input.date && intervalsOverlap(input, b),
  )
}

export function isPastDate(date: IsoDate, now: Date): boolean {
  return date < toIsoDate(now)
}

/** Earliest bookable minute for the given date. */
export function earliestBookableMinute(date: IsoDate, now: Date): number {
  const today = toIsoDate(now)
  if (date > today) return DAY_START
  if (date < today) return Number.POSITIVE_INFINITY
  return Math.max(DAY_START, minutesOfDay(now))
}

/** Started and past bookings are read-only. */
export function isBookingLocked(booking: Booking, now: Date): boolean {
  const today = toIsoDate(now)
  if (booking.date !== today) return booking.date < today
  return toMinutes(booking.start) <= minutesOfDay(now)
}

export function validateBooking(
  input: BookingInput,
  { bookings, now, excludeId }: ValidationContext,
): BookingViolation[] {
  const violations: BookingViolation[] = []

  if (!isValidDate(input.date)) {
    return [{ code: 'INVALID_FORMAT', field: 'date', message: 'Invalid date' }]
  }
  if (!isValidTime(input.start)) {
    violations.push({ code: 'INVALID_FORMAT', field: 'start', message: 'Select a start time' })
  }
  if (!isValidTime(input.end)) {
    violations.push({ code: 'INVALID_FORMAT', field: 'end', message: 'Select an end time' })
  }
  if (input.title !== undefined && input.title.length > TITLE_MAX_LENGTH) {
    violations.push({
      code: 'INVALID_FORMAT',
      field: 'title',
      message: `Title must be at most ${TITLE_MAX_LENGTH} characters`,
    })
  }
  if (violations.length > 0) return violations

  if (isPastDate(input.date, now)) {
    return [{ code: 'PAST_DATE', field: 'date', message: 'Past dates cannot be booked' }]
  }

  const start = toMinutes(input.start)
  const end = toMinutes(input.end)

  if (start < DAY_START || end > DAY_END) {
    violations.push({
      code: 'OUTSIDE_WORKDAY',
      field: start < DAY_START ? 'start' : 'end',
      message: `Bookings are only available from ${WORK_DAY_START} to ${WORK_DAY_END}`,
    })
  }

  if (start >= end) {
    violations.push({
      code: 'START_NOT_BEFORE_END',
      field: 'end',
      message: 'End time must be after start time',
    })
  } else if (end - start < MIN_DURATION_MINUTES) {
    violations.push({
      code: 'TOO_SHORT',
      field: 'end',
      message: `Minimum duration is ${formatDuration(MIN_DURATION_MINUTES)}`,
    })
  } else if (end - start > MAX_DURATION_MINUTES) {
    violations.push({
      code: 'TOO_LONG',
      field: 'end',
      message: `Maximum duration is ${formatDuration(MAX_DURATION_MINUTES)}`,
    })
  }

  if (input.date === toIsoDate(now) && start < minutesOfDay(now)) {
    violations.push({
      code: 'PAST_TIME',
      field: 'start',
      message: 'Past time cannot be booked',
    })
  }

  const conflicts = findConflicts(input, bookings, excludeId)
  if (conflicts.length > 0) {
    const list = conflicts.map((b) => `${b.start}–${b.end}`).join(', ')
    violations.push({
      code: 'OVERLAP',
      field: 'start',
      message: `Overlaps with booking ${list}`,
    })
  }

  return violations
}

function stepRange(from: number, to: number): number[] {
  const result: number[] = []
  for (let m = from; m <= to; m += TIME_STEP_MINUTES) result.push(m)
  return result
}

export type TimeOption = { value: HhMm; disabled: boolean }

/** Start time options: occupied and past times are disabled. */
export function getStartOptions(
  date: IsoDate,
  { bookings, now, excludeId }: ValidationContext,
): TimeOption[] {
  const earliest = earliestBookableMinute(date, now)
  const others = bookings.filter((b) => b.id !== excludeId && b.date === date)

  return stepRange(DAY_START, DAY_END - MIN_DURATION_MINUTES).map((m) => {
    const minSlot = { start: fromMinutes(m), end: fromMinutes(m + MIN_DURATION_MINUTES) }
    const disabled = m < earliest || others.some((b) => intervalsOverlap(minSlot, b))
    return { value: fromMinutes(m), disabled }
  })
}

/** End time options for the chosen start, limited by duration, end of day and the next booking. */
export function getEndOptions(
  date: IsoDate,
  start: HhMm,
  { bookings, excludeId }: Omit<ValidationContext, 'now'>,
): TimeOption[] {
  if (!isValidTime(start)) return []
  const startMin = toMinutes(start)
  const nextBookingStart = bookings
    .filter((b) => b.id !== excludeId && b.date === date && toMinutes(b.start) >= startMin)
    .reduce((min, b) => Math.min(min, toMinutes(b.start)), DAY_END)
  const latest = Math.min(startMin + MAX_DURATION_MINUTES, DAY_END, nextBookingStart)

  return stepRange(startMin + MIN_DURATION_MINUTES, Math.min(startMin + MAX_DURATION_MINUTES, DAY_END))
    .map((m) => ({ value: fromMinutes(m), disabled: m > latest }))
}

/** Suggested end: one hour, or as much as the constraints allow. */
export function suggestEnd(
  date: IsoDate,
  start: HhMm,
  ctx: Omit<ValidationContext, 'now'>,
  preferredMinutes = 60,
): HhMm | '' {
  const available = getEndOptions(date, start, ctx).filter((o) => !o.disabled)
  if (available.length === 0) return ''
  const preferred = fromMinutes(toMinutes(start) + preferredMinutes)
  return available.find((o) => o.value === preferred)?.value ?? available[available.length - 1]!.value
}
