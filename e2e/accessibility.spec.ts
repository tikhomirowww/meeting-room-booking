import AxeBuilder from '@axe-core/playwright'
import { bookingBlock, expect, form, goToNextDay, test } from './fixtures'
import type { Page } from '@playwright/test'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    // Experimental in axe, so off by default, but it guards WCAG 2.5.3 (lesson L-006).
    .options({ rules: { 'label-content-name-mismatch': { enabled: true } } })
    .analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
}

test('no axe violations on the main screen', async ({ app: page }) => {
  await expectNoViolations(page)
})

test('no axe violations with validation errors', async ({ app: page }) => {
  await goToNextDay(page)
  await form(page).getByRole('button', { name: 'Book', exact: true }).click()
  await expect(form(page).getByText('Select a start time')).toBeVisible()
  await expectNoViolations(page)
})

test('no axe violations with a dialog open', async ({ app: page }) => {
  await goToNextDay(page)
  await bookingBlock(page, /Interview/).click()
  await page.getByRole('button', { name: 'Delete booking' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectNoViolations(page)
})

test('keyboard: skip link jumps to the form', async ({ app: page }) => {
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to booking form' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()

  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Start', { exact: true })).toBeFocused()
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('no axe violations and no horizontal scroll', async ({ app: page }) => {
    await expectNoViolations(page)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('tapping a slot brings the form into view and focuses Title', async ({ app: page }) => {
    await goToNextDay(page)
    await page.getByRole('button', { name: 'Book from 09:00' }).tap()
    const title = page.getByLabel('Title')
    await expect(title).toBeFocused()
    await expect(title).toBeInViewport()
  })
})
