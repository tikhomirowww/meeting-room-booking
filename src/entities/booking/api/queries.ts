import { useQuery } from '@tanstack/react-query'
import type { IsoDate } from '@/shared/lib/time'
import { bookingApi } from './bookingApi'

export const bookingKeys = {
  all: ['bookings'] as const,
  byDate: (date: IsoDate) => [...bookingKeys.all, date] as const,
}

export function useBookingsQuery(date: IsoDate) {
  return useQuery({
    queryKey: bookingKeys.byDate(date),
    queryFn: () => bookingApi.getByDate(date),
    select: (bookings) => [...bookings].sort((a, b) => a.start.localeCompare(b.start)),
  })
}
