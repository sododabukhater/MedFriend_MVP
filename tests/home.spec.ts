import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Every test starts as a first-time visitor (empty localStorage).
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('Home screen opens in English (build phase)', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.getByRole('heading', { name: 'Med Friend' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add medication' })).toBeVisible()
})

test('Language switch changes to Arabic and is remembered', async ({ page }) => {
  const html = page.locator('html')
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()

  await expect(html).toHaveAttribute('dir', 'rtl')
  await expect(html).toHaveAttribute('lang', 'ar')
  await expect(page.getByRole('heading', { name: 'صديقك الطبي' })).toBeVisible()

  await page.reload()
  await expect(html).toHaveAttribute('dir', 'rtl')
})

test('App fits in a phone-sized frame (max 430px wide)', async ({ page }) => {
  const box = await page.locator('.phone-frame').boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeLessThanOrEqual(430)
})

test('Buttons are big enough to tap (min 48px)', async ({ page }) => {
  for (const button of await page.getByRole('button').all()) {
    const box = await button.boundingBox()
    // Round: screen scaling can report 47.99999px for a 48px button.
    expect(Math.round(box!.height)).toBeGreaterThanOrEqual(48)
  }
})
