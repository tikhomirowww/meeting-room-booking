/**
 * Integration: the whole page (widgets + features + entities) against the mock API.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Toaster } from '@/shared/ui'
import { renderWithProviders } from '@/test/render'
import { setupMockApi } from '@/test/server'
import { BookingPage } from './BookingPage'

setupMockApi()

async function setup() {
  const utils = renderWithProviders(
    <>
      <BookingPage />
      <Toaster />
    </>,
  )
  await screen.findByRole('list', { name: 'Bookings' })
  return utils
}

const bookings = () => screen.getByRole('list', { name: 'Bookings' })

describe('BookingPage', () => {
  it('shows today with the skip link, navigation, schedule and form', async () => {
    await setup()
    expect(screen.getByRole('link', { name: 'Skip to booking form' })).toHaveAttribute('href', '#booking-form')
    expect(screen.getByRole('heading', { name: 'Meeting room' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Choose day' })).toHaveTextContent('Wednesday, May 15')
    expect(screen.getByText('2 bookings')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'New booking' })).toBeInTheDocument()
  })

  it('books a slot end-to-end: timeline → form → API → timeline + toast', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    await user.click(await screen.findByRole('button', { name: 'Book from 13:00' }))
    await user.type(screen.getByRole('textbox', { name: /Title/ }), 'Planning')
    await user.click(screen.getByRole('button', { name: 'Book' }))

    expect(await within(screen.getByRole('list', { name: 'Notifications' })).findByText('Room booked')).toBeInTheDocument()
    await waitFor(() => expect(within(bookings()).getByRole('button', { name: /13:00–14:00.*Planning/ })).toBeInTheDocument())
  })

  it('selecting a booking opens it for editing; deleting it returns to create mode', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    const list = await screen.findByRole('list', { name: 'Bookings' })
    await user.click(await within(list).findByRole('button', { name: /Interview/ }))
    expect(screen.getByRole('form', { name: 'Edit booking' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete booking' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByRole('form', { name: 'New booking' })).toBeInTheDocument())
    await waitFor(() => expect(within(bookings()).queryByRole('button', { name: /Interview/ })).not.toBeInTheDocument())
  })

  it('changing the date resets the form', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    await user.click(await screen.findByRole('button', { name: 'Book from 13:00' }))
    await user.type(screen.getByRole('textbox', { name: /Title/ }), 'Draft')

    await user.click(screen.getByRole('button', { name: 'Next day' }))
    await screen.findByText('No bookings on this day — the room is free.')
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('')
  })
})
