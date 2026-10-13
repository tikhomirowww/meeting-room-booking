import { useState } from 'react'
import type { Booking } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api'
import { Alert, Button } from '@/shared/ui'
import { useDeleteBooking } from '../model/useDeleteBooking'

type Props = { booking: Booking; onDeleted: () => void }

export function DeleteBookingButton({ booking, onDeleted }: Props) {
  const [confirming, setConfirming] = useState(false)
  const remove = useDeleteBooking()

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)} className="w-full">
        Delete booking
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-3 ring-1 ring-red-200" role="group" aria-label="Confirm deletion">
      <p className="text-sm text-red-900">
        Delete booking {booking.start}–{booking.end}? This cannot be undone.
      </p>
      {remove.isError && <Alert tone="error">{getErrorMessage(remove.error)}</Alert>}
      <div className="flex gap-2">
        <Button
          variant="danger"
          loading={remove.isPending}
          onClick={() => remove.mutate(booking, { onSuccess: onDeleted })}
          className="flex-1"
          autoFocus
        >
          Yes, delete
        </Button>
        <Button variant="secondary" onClick={() => setConfirming(false)} disabled={remove.isPending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
