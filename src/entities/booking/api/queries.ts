import { useQuery } from '@tanstack/react-query'
import type { IsoDate } from '@/shared/lib/time'
import type { Booking } from '../model'
import { bookingApi } from './bookingApi'

export const bookingKeys = {
  all: ['bookings'] as const,
  byDate: (date: IsoDate) => [...bookingKeys.all, date] as const,
}

// Module-level so `select` keeps a stable reference and doesn't re-run on every render.
const sortByStart = (bookings: Booking[]) => [...bookings].sort((a, b) => a.start.localeCompare(b.start))

export function useBookingsQuery(date: IsoDate) {
  return useQuery({
    queryKey: bookingKeys.byDate(date),
    queryFn: () => bookingApi.getByDate(date),
    select: sortByStart,
  })
}
