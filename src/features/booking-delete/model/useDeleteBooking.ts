import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingApi, bookingKeys } from '@/entities/booking'
import type { Booking } from '@/entities/booking'
import { isNotFoundError } from '@/shared/api'

export function useDeleteBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    // Deleting an already deleted booking is not an error for the user.
    mutationFn: (booking: Booking) =>
      bookingApi.remove(booking.id).catch((error: unknown) => {
        if (!isNotFoundError(error)) throw error
      }),
    onSettled: (_, __, booking) =>
      queryClient.invalidateQueries({ queryKey: bookingKeys.byDate(booking.date) }),
  })
}
