import { useState } from 'react'
import type { Booking } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api'
import { Alert, Button, Modal, toast } from '@/shared/ui'
import { useDeleteBooking } from '../../model/useDeleteBooking'

type Props = { booking: Booking; onDeleted: () => void }

export function DeleteBookingButton({ booking, onDeleted }: Props) {
  const [open, setOpen] = useState(false)
  const remove = useDeleteBooking()

  function close() {
    if (remove.isPending) return
    setOpen(false)
    remove.reset()
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)} className="w-full">
        Delete booking
      </Button>
      <Modal
        open={open}
        onClose={close}
        tone="danger"
        title="Delete booking?"
        actions={
          <>
            <Button variant="secondary" onClick={close} disabled={remove.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(booking, {
                  onSuccess: () => {
                    setOpen(false)
                    onDeleted()
                    toast('Booking deleted', `${booking.start}–${booking.end}`)
                  },
                })
              }
              autoFocus
            >
              Delete
            </Button>
          </>
        }
      >
        <p>
          {booking.start}–{booking.end}
          {booking.title ? ` · ${booking.title}` : ''} will be removed. This cannot be undone.
        </p>
        {remove.isError && (
          <div className="mt-3">
            <Alert tone="error">{getErrorMessage(remove.error)}</Alert>
          </div>
        )}
      </Modal>
    </>
  )
}
