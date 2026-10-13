import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingApi, bookingKeys } from '@/entities/booking'
import type { BookingInput } from '@/entities/booking'
import { isConflictError, isNotFoundError } from '@/shared/api'

type SaveVariables = { id?: string; input: BookingInput }

export function useSaveBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: SaveVariables) =>
      id ? bookingApi.update(id, input) : bookingApi.create(input),
    onSuccess: (_, { input }) =>
      queryClient.invalidateQueries({ queryKey: bookingKeys.byDate(input.date) }),
    onError: (error, { input }) => {
      // Client data is stale — refetch the list to show what changed.
      if (isConflictError(error) || isNotFoundError(error)) {
        return queryClient.invalidateQueries({ queryKey: bookingKeys.byDate(input.date) })
      }
    },
  })
}
