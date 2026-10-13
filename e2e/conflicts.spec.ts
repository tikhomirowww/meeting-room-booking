import { bookingBlock, enableScenario, expect, form, goToNextDay, openApp, test } from './fixtures'

test('server 409: dialog, refreshed schedule, input kept', async ({ app: page }) => {
  await enableScenario(page, /Conflict on next save/)
  await goToNextDay(page)
  await page.getByRole('button', { name: 'Book from 15:00' }).click()
  await page.getByLabel('Title').fill('My meeting')
  await form(page).getByRole('button', { name: 'Book', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'This slot was just taken' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Got it' }).click()
  await expect(dialog).toBeHidden()

  await expect(bookingBlock(page, /15:00–16:00.*Booked by a colleague/)).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue('My meeting')
  await expect(page.getByLabel('Start', { exact: true })).toHaveValue('15:00')
  await expect(form(page).getByText('Overlaps with booking 15:00–16:00')).toBeVisible()
})

test('real 409 between two tabs', async ({ context }) => {
  const [tabA, tabB] = [await context.newPage(), await context.newPage()]
  for (const tab of [tabA, tabB]) {
    await openApp(tab)
    await goToNextDay(tab)
    await tab.getByRole('button', { name: 'Book from 16:00' }).click()
  }

  await form(tabA).getByRole('button', { name: 'Book', exact: true }).click()
  await expect(tabA.getByRole('list', { name: 'Notifications' })).toContainText('Room booked')

  await form(tabB).getByRole('button', { name: 'Book', exact: true }).click()
  await expect(tabB.getByRole('dialog', { name: 'This slot was just taken' })).toBeVisible()
})
