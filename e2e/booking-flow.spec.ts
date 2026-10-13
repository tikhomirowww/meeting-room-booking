import { bookingBlock, expect, form, goToNextDay, test } from './fixtures'

test('create a booking by clicking a free slot', async ({ app: page }) => {
  await goToNextDay(page)
  await page.getByRole('button', { name: 'Book from 13:00' }).click()

  await expect(page.getByLabel('Start', { exact: true })).toHaveValue('13:00')
  await expect(page.getByLabel('End', { exact: true })).toHaveValue('14:00')
  await expect(page.getByLabel('Title')).toBeFocused()

  await page.getByLabel('Title').fill('Planning')
  await form(page).getByRole('button', { name: 'Book', exact: true }).click()

  await expect(page.getByRole('list', { name: 'Notifications' })).toContainText('Room booked')
  await expect(bookingBlock(page, /13:00–14:00.*Planning/)).toBeVisible()
})

test('edit a booking', async ({ app: page }) => {
  await goToNextDay(page)
  await bookingBlock(page, /11:00–12:00.*Interview.*edit/).click()

  await expect(form(page).getByRole('heading', { name: 'Edit booking' })).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue('Interview')
  await page.getByLabel('End', { exact: true }).selectOption('12:30')
  await form(page).getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('list', { name: 'Notifications' })).toContainText('Booking updated')
  await expect(bookingBlock(page, /11:00–12:30.*Interview/)).toBeVisible()
})

test('delete a booking after confirmation', async ({ app: page }) => {
  await goToNextDay(page)
  await bookingBlock(page, /Interview/).click()
  await page.getByRole('button', { name: 'Delete booking' }).click()

  const dialog = page.getByRole('dialog', { name: 'Delete booking?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click()

  await expect(page.getByRole('list', { name: 'Notifications' })).toContainText('Booking deleted')
  await expect(bookingBlock(page, /Interview/)).toHaveCount(0)
})

test('cancelling the delete dialog keeps the booking', async ({ app: page }) => {
  await goToNextDay(page)
  await bookingBlock(page, /Interview/).click()
  await page.getByRole('button', { name: 'Delete booking' }).click()
  await page.keyboard.press('Escape')

  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(bookingBlock(page, /Interview/)).toBeVisible()
})

test('submitting an empty form shows a field error', async ({ app: page }) => {
  await goToNextDay(page)
  await form(page).getByRole('button', { name: 'Book', exact: true }).click()

  await expect(form(page).getByText('Select a start time')).toBeVisible()
  await expect(page.getByLabel('Start', { exact: true })).toHaveAttribute('aria-invalid', 'true')
})

test('today: past times are hidden, booked times are labelled, started bookings are read-only', async ({ app: page }) => {
  const start = page.getByLabel('Start', { exact: true })
  await expect(start.locator('option', { hasText: '09:00' })).toHaveCount(0)
  await expect(start.locator('option', { hasText: '14:00 · booked' })).toBeDisabled()
  await expect(start.locator('option', { hasText: /^11:00$/ })).toBeEnabled()

  await expect(bookingBlock(page, /10:00–11:00.*read-only/)).toBeDisabled()
})

test('end options show durations and stop at the next booking', async ({ app: page }) => {
  await goToNextDay(page)
  await page.getByLabel('Start', { exact: true }).selectOption('10:00')
  const labels = await page.getByLabel('End', { exact: true }).locator('option').allTextContents()
  expect(labels).toEqual(['—', '10:30 · 30 min', '10:45 · 45 min', '11:00 · 1 h'])
})

test('a past date is read-only', async ({ app: page }) => {
  await page.getByLabel('Date', { exact: true }).fill('2030-05-14')
  await expect(form(page).getByText('This date is in the past')).toBeVisible()
  await expect(form(page).getByRole('button', { name: 'Book', exact: true })).toBeDisabled()
})
