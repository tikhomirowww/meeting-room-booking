import { http } from '@/shared/api'
import type { IsoDate } from '@/shared/lib/time'
import type { Booking, BookingInput } from '../model'

export const bookingApi = {
  getByDate: (date: IsoDate) =>
    http.get<Booking[]>(`/api/bookings?date=${encodeURIComponent(date)}`),
  create: (input: BookingInput) => http.post<Booking>('/api/bookings', input),
  update: (id: string, patch: Partial<BookingInput>) =>
    http.patch<Booking>(`/api/bookings/${encodeURIComponent(id)}`, patch),
  remove: (id: string) => http.delete(`/api/bookings/${encodeURIComponent(id)}`),
}
