import { enableScenario, expect, NOW, test, waitForSchedule } from './fixtures'

test('empty day', async ({ app: page }) => {
  await page.getByLabel('Date', { exact: true }).fill('2030-05-20')
  await expect(page.getByText('No bookings on this day — the room is free.')).toBeVisible()
})

test('load error, then Retry recovers', async ({ app: page }) => {
  await enableScenario(page, /Schedule requests fail/)
  await page.getByRole('button', { name: 'Next day' }).click()

  await expect(page.getByText('Could not load bookings')).toBeVisible()
  await page.getByRole('checkbox', { name: /Schedule requests fail/ }).uncheck()
  await page.getByRole('button', { name: 'Retry' }).click()
  await waitForSchedule(page)
})

test('recovers when a hard reload leaves the page without the service worker (L-005, L-010)', async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  // Emulate Cmd+Shift+R once: the page starts without a controlling service worker.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__emulated')) return
    sessionStorage.setItem('__emulated', '1')
    Object.defineProperty(navigator.serviceWorker, 'controller', { get: () => null })
  })
  let navigations = 0
  page.on('framenavigated', (frame) => frame === page.mainFrame() && navigations++)

  await page.goto('/')
  await waitForSchedule(page)
  expect(navigations).toBe(2) // initial load + exactly one recovery reload
})
