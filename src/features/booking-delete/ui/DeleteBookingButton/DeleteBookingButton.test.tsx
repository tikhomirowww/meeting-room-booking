/**
 * Integration: delete flow against the mock API.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { db } from '@/mocks/db'
import { toastStore } from '@/shared/ui/Toaster/toastStore'
import { renderWithProviders } from '@/test/render'
import { server, TOMORROW, setupMockApi } from '@/test/server'
import { DeleteBookingButton } from './DeleteBookingButton'

setupMockApi()

function setup() {
  const booking = db.byDate(TOMORROW)[0]!
  const onDeleted = vi.fn()
  const utils = renderWithProviders(<DeleteBookingButton booking={booking} onDeleted={onDeleted} />)
  return { booking, onDeleted, ...utils }
}

describe('DeleteBookingButton', () => {
  it('asks for confirmation with the booking details', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Delete booking' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete booking?' })
    expect(dialog).toHaveTextContent('11:00–12:00 · Interview will be removed')
  })

  it('Cancel closes without deleting', async () => {
    const { user, onDeleted, booking } = setup()
    await user.click(screen.getByRole('button', { name: 'Delete booking' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(db.find(booking.id)).toBeDefined()
  })

  it('confirming deletes, notifies the parent and shows a toast', async () => {
    const { user, onDeleted, booking } = setup()
    await user.click(screen.getByRole('button', { name: 'Delete booking' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
    expect(db.find(booking.id)).toBeUndefined()
    expect(toastStore.getSnapshot().at(-1)).toMatchObject({ title: 'Booking deleted', message: '11:00–12:00' })
  })

  it('a server error is shown inside the dialog, which stays open', async () => {
    server.use(mock.delete('*/api/bookings/:id', () => HttpResponse.json({ code: 'X', message: 'Nope' }, { status: 500 })))
    const { user, onDeleted } = setup()
    await user.click(screen.getByRole('button', { name: 'Delete booking' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Nope')
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('an already deleted booking counts as deleted', async () => {
    const { user, onDeleted, booking } = setup()
    db.remove(booking.id)
    await user.click(screen.getByRole('button', { name: 'Delete booking' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
  })
})
