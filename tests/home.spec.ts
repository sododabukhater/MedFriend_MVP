import { expect, test } from '@playwright/test'
import { openLoggedOut, signUpInUI } from './helpers'

// Basics that apply to every screen (F11 simple mode, F12 language). Each test is a fresh browser.

test.describe('First visit (nothing saved on the device)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('opens the login screen in Arabic, right to left; English is remembered once chosen', async ({ page }) => {
    await openLoggedOut(page)
    const html = page.locator('html')
    await expect(html).toHaveAttribute('dir', 'rtl')
    await expect(html).toHaveAttribute('lang', 'ar')
    await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'استخدم الحساب التجريبي' })).toBeVisible()

    await page.getByRole('button', { name: 'Switch language to English' }).click()
    await expect(html).toHaveAttribute('dir', 'ltr')
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
    await page.reload()
    await expect(html).toHaveAttribute('dir', 'ltr')
  })
})

test('Once English is chosen, the login screen opens in English', async ({ page }) => {
  await openLoggedOut(page)
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.getByText('Med Friend', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
})

test('Language switch changes to Arabic and is remembered', async ({ page }) => {
  await openLoggedOut(page)
  const html = page.locator('html')
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()

  await expect(html).toHaveAttribute('dir', 'rtl')
  await expect(html).toHaveAttribute('lang', 'ar')
  await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible()

  await page.reload()
  await expect(html).toHaveAttribute('dir', 'rtl')
})

test('App fits in a phone-sized frame (max 430px wide)', async ({ page }) => {
  await openLoggedOut(page)
  const box = await page.locator('.phone-frame').boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeLessThanOrEqual(430)
})

test('Buttons are big enough to tap (min 48px) on login and home', async ({ page }) => {
  async function check() {
    for (const button of await page.getByRole('button').all()) {
      const box = await button.boundingBox()
      // Round: screen scaling can report 47.99999px for a 48px button.
      expect(Math.round(box!.height)).toBeGreaterThanOrEqual(48)
    }
  }
  await openLoggedOut(page)
  await check()
  await signUpInUI(page)
  await check()
})
