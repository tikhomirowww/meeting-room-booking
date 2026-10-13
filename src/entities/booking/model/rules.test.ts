import { describe, expect, it } from 'vitest'
import {
  getEndOptions,
  getStartOptions,
  isBookingLocked,
  suggestEnd,
  validateBooking,
  type ValidationContext,
} from './rules'
import type { Booking, BookingInput } from './types'

const NOW = new Date(2030, 4, 15, 10, 5) // 15.05.2030 10:05
const TODAY = '2030-05-15'
const TOMORROW = '2030-05-16'

const existing: Booking = { id: 'b1', date: TOMORROW, start: '10:00', end: '11:00' }

function ctx(overrides: Partial<ValidationContext> = {}): ValidationContext {
  return { bookings: [existing], now: NOW, ...overrides }
}

function codes(input: Partial<BookingInput>, context = ctx()) {
  const full: BookingInput = { date: TOMORROW, start: '12:00', end: '13:00', ...input }
  return validateBooking(full, context).map((v) => v.code)
}

describe('validateBooking', () => {
  it('accepts a valid booking', () => {
    expect(codes({})).toEqual([])
  })

  it('checks the format', () => {
    expect(codes({ date: '2030-02-30' })).toEqual(['INVALID_FORMAT'])
    expect(codes({ start: '9:00', end: '' })).toEqual(['INVALID_FORMAT', 'INVALID_FORMAT'])
    expect(codes({ title: 'x'.repeat(101) })).toEqual(['INVALID_FORMAT'])
  })

  it('1. time within working hours', () => {
    expect(codes({ start: '08:30', end: '09:30' })).toEqual(['OUTSIDE_WORKDAY'])
    expect(codes({ start: '17:30', end: '18:30' })).toEqual(['OUTSIDE_WORKDAY'])
    expect(codes({ start: '09:00', end: '10:00' })).toEqual([])
    expect(codes({ start: '17:00', end: '18:00' })).toEqual([])
  })

  it('2. start < end', () => {
    expect(codes({ start: '13:00', end: '12:00' })).toEqual(['START_NOT_BEFORE_END'])
    expect(codes({ start: '13:00', end: '13:00' })).toEqual(['START_NOT_BEFORE_END'])
  })

  it('3. at least 30 minutes', () => {
    expect(codes({ start: '12:00', end: '12:15' })).toEqual(['TOO_SHORT'])
    expect(codes({ start: '12:00', end: '12:30' })).toEqual([])
  })

  it('4. at most 2 hours', () => {
    expect(codes({ start: '12:00', end: '14:15' })).toEqual(['TOO_LONG'])
    expect(codes({ start: '12:00', end: '14:00' })).toEqual([])
  })

  it('5. overlaps are rejected, touching boundaries are allowed', () => {
    expect(codes({ start: '10:30', end: '11:30' })).toEqual(['OVERLAP'])
    expect(codes({ start: '09:30', end: '11:30' })).toEqual(['OVERLAP'])
    expect(codes({ start: '10:15', end: '10:45' })).toEqual(['OVERLAP'])
    expect(codes({ start: '11:00', end: '12:00' })).toEqual([])
    expect(codes({ start: '09:00', end: '10:00' })).toEqual([])
  })

  it('5. bookings on other dates do not interfere', () => {
    expect(codes({ date: '2030-05-17', start: '10:00', end: '11:00' })).toEqual([])
  })

  it('6. past dates cannot be booked', () => {
    expect(codes({ date: '2030-05-14' })).toEqual(['PAST_DATE'])
  })

  it('6. past time today is unavailable', () => {
    expect(codes({ date: TODAY, start: '10:00', end: '11:00' })).toEqual(['PAST_TIME'])
    expect(codes({ date: TODAY, start: '10:15', end: '11:00' })).toEqual([])
  })

  it('7. an edited booking does not conflict with itself', () => {
    const input = { start: '10:30', end: '11:30' }
    expect(codes(input, ctx({ excludeId: 'b1' }))).toEqual([])
    expect(codes(input, ctx({ excludeId: 'other' }))).toEqual(['OVERLAP'])
  })
})

describe('isBookingLocked', () => {
  it('locks past and started bookings', () => {
    expect(isBookingLocked({ ...existing, date: '2030-05-14' }, NOW)).toBe(true)
    expect(isBookingLocked({ ...existing, date: TODAY, start: '10:00' }, NOW)).toBe(true)
    expect(isBookingLocked({ ...existing, date: TODAY, start: '10:30' }, NOW)).toBe(false)
    expect(isBookingLocked(existing, NOW)).toBe(false)
  })
})

describe('options', () => {
  it('start slots: past and occupied are disabled', () => {
    const today = getStartOptions(TODAY, ctx())
    expect(today.find((o) => o.value === '10:00')?.disabled).toBe(true)
    expect(today.find((o) => o.value === '10:15')?.disabled).toBe(false)
    expect(today.at(-1)?.value).toBe('17:30')

    const tomorrow = getStartOptions(TOMORROW, ctx())
    expect(tomorrow.find((o) => o.value === '09:30')?.disabled).toBe(false)
    expect(tomorrow.find((o) => o.value === '09:45')?.disabled).toBe(true)
    expect(tomorrow.find((o) => o.value === '10:45')?.disabled).toBe(true)
    expect(tomorrow.find((o) => o.value === '11:00')?.disabled).toBe(false)
  })

  it('start slots on a past date are disabled', () => {
    expect(getStartOptions('2030-05-14', ctx()).every((o) => o.disabled)).toBe(true)
  })

  it('end is limited by the next booking and duration', () => {
    const ends = getEndOptions(TOMORROW, '09:00', ctx())
    expect(ends.filter((o) => !o.disabled).map((o) => o.value)).toEqual(['09:30', '09:45', '10:00'])
    expect(getEndOptions(TOMORROW, '17:15', ctx()).map((o) => o.value)).toEqual(['17:45', '18:00'])
  })

  it('suggestEnd proposes one hour or the longest available', () => {
    expect(suggestEnd(TOMORROW, '12:00', ctx())).toBe('13:00')
    expect(suggestEnd(TOMORROW, '09:15', ctx())).toBe('10:00')
    expect(suggestEnd(TOMORROW, '17:30', ctx())).toBe('18:00')
  })
})
