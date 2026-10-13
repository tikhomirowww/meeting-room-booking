import { test as base, expect, type Page } from '@playwright/test'

/** Frozen "now" shared by the UI and the in-page mock server. Seed data is relative to it. */
export const NOW = new Date('2030-05-15T10:05:00Z')
// Seed: today 10:00–11:00 "Team daily" (already started), 14:00–15:30 "Design review";
//       tomorrow 11:00–12:00 "Interview".

export async function openApp(page: Page) {
  await page.clock.setFixedTime(NOW)
  await page.goto('/')
  await waitForSchedule(page)
}

export async function waitForSchedule(page: Page) {
  await expect(page.locator('ul[aria-label="Bookings"]')).toBeAttached()
}

export async function goToNextDay(page: Page) {
  await page.getByRole('button', { name: 'Next day' }).click()
  await waitForSchedule(page)
}

export const bookingBlock = (page: Page, name: RegExp) =>
  page.locator('ul[aria-label="Bookings"]').getByRole('button', { name })

export const form = (page: Page) => page.locator('#booking-form')

export async function enableScenario(page: Page, label: RegExp) {
  await page.getByText('Mock API demo scenarios').click()
  await page.getByRole('checkbox', { name: label }).check()
}

export const test = base.extend<{ app: Page }>({
  app: async ({ page }, provide) => {
    await openApp(page)
    await provide(page)
  },
})

export { expect }
