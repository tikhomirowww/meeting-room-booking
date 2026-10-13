import type { HhMm, IsoDate } from '@/shared/lib/time'

export type Booking = {
  id: string
  date: IsoDate
  start: HhMm
  end: HhMm
  title?: string
}

export type BookingInput = Omit<Booking, 'id'>

export type BookingViolationCode =
  | 'INVALID_FORMAT'
  | 'PAST_DATE'
  | 'OUTSIDE_WORKDAY'
  | 'START_NOT_BEFORE_END'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'PAST_TIME'
  | 'OVERLAP'

export type BookingViolation = {
  code: BookingViolationCode
  field: 'date' | 'start' | 'end' | 'title'
  message: string
}
