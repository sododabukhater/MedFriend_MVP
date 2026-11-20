import { expect, test } from '@playwright/test'
import { goToMeds, goToSettings, logInInUI, newApiUser, newEmail, openLoggedOut, PASSWORD, signUpInUI, SUPABASE_URL } from './helpers'

// Acceptance criteria: docs/specs/AUTH.md

const frame = '.phone-frame'

test('1. First visit shows the login screen, with sign-up, forgot password and demo', async ({ page }) => {
  await openLoggedOut(page)
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeFocused()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password')
  for (const name of ['Forgot your password?', 'Create an account', 'Use the demo account']) {
    await expect(page.getByRole('button', { name })).toBeVisible()
  }
})

test('2. Sign up logs in at once; a refresh stays logged in', async ({ page }) => {
  const { email } = await signUpInUI(page)
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  await goToSettings(page)
  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible()
  await page.reload()
  await expect(page.locator(frame)).toHaveAttribute('data-auth', 'signedIn')
  await goToSettings(page)
  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible()
})

test('3. Sign up checks the email and password before sending', async ({ page }) => {
  await openLoggedOut(page)
  await page.getByRole('button', { name: 'Create an account' }).click()
  const submit = page.getByRole('button', { name: 'Create account' })

  await page.getByLabel('Email').fill('not-an-email')
  await submit.click()
  await expect(page.getByRole('alert')).toHaveText('Please enter a valid email address.')

  await page.getByLabel('Email').fill(newEmail())
  await page.getByLabel('New password (at least 8 characters)').fill('short')
  await page.getByLabel('Type the password again').fill('short')
  await submit.click()
  await expect(page.getByRole('alert')).toHaveText('The password must have at least 8 characters.')

  await page.getByLabel('New password (at least 8 characters)').fill(PASSWORD)
  await page.getByLabel('Type the password again').fill(PASSWORD + 'x')
  await submit.click()
  await expect(page.getByRole('alert')).toHaveText('The two passwords are not the same.')
  await expect(page.locator(frame)).toHaveAttribute('data-auth', 'signedOut')
})

test('4. Signing up again with the same email says the account exists', async ({ page }) => {
  const { email } = await signUpInUI(page)
  await goToSettings(page)
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('New password (at least 8 characters)').fill(PASSWORD)
  await page.getByLabel('Type the password again').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('alert')).toContainText('An account with this email already exists')
})

test('5. Log out, then log in again: the medicines are still there; a wrong password is refused', async ({ page }) => {
  const { email, password } = await signUpInUI(page)
  await addOneMedicine(page, 'Concor')

  await goToSettings(page)
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()

  await logInInUI(page, email, 'Wrong-password-1')
  await expect(page.getByRole('alert')).toHaveText('Wrong email or password.')

  await logInInUI(page, email, password)
  await goToMeds(page)
  await expect(page.getByRole('listitem', { name: 'Concor' })).toBeVisible()
})

test('6. The same account on another device sees the same medicines', async ({ page, browser }) => {
  const { email, password } = await signUpInUI(page)
  await addOneMedicine(page, 'Lipitor')

  const laptop = await browser.newContext()
  const other = await laptop.newPage()
  await openLoggedOut(other)
  await logInInUI(other, email, password)
  await goToMeds(other)
  await expect(other.getByRole('listitem', { name: 'Lipitor' })).toBeVisible()
  await laptop.close()
})

test('7. Forgot password sends a reset link that opens this app', async ({ page }) => {
  // Do not send a real email from tests: answer the request ourselves and check what was asked.
  let sent: { email?: string } | null = null
  let redirectTo: string | null = null
  await page.route(`${SUPABASE_URL}/auth/v1/recover**`, async (route) => {
    sent = route.request().postDataJSON()
    redirectTo = new URL(route.request().url()).searchParams.get('redirect_to')
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  await openLoggedOut(page)
  await page.getByRole('button', { name: 'Forgot your password?' }).click()
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
  await page.getByLabel('Email').fill('someone@mailinator.com')
  await page.getByRole('button', { name: 'Send the link' }).click()

  await expect(page.getByRole('status')).toContainText('If an account exists for this email')
  expect(sent!.email).toBe('someone@mailinator.com')
  expect(redirectTo).toBe('http://localhost:5173/')

  await page.getByRole('button', { name: 'Back to log in' }).click()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
})

test('8. The reset link asks for a new password, which then works for login', async ({ page }) => {
  // Simulates opening the emailed link: Supabase sends the patient back with a recovery session.
  const user = await newApiUser()
  const email = user.session.user.email!
  const s = user.session
  await page.goto(
    `/#access_token=${s.access_token}&refresh_token=${s.refresh_token}&expires_in=${s.expires_in}` +
      `&expires_at=${s.expires_at}&token_type=bearer&type=recovery`,
  )
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()

  await page.getByLabel('New password (at least 8 characters)').fill('New-password-456')
  await page.getByLabel('Type the password again').fill('New-password-456')
  await page.getByRole('button', { name: 'Save new password' }).click()
  await expect(page.getByRole('status')).toHaveText('Your new password is saved')

  await goToSettings(page)
  await page.getByRole('button', { name: 'Log out' }).click()
  await logInInUI(page, email, PASSWORD)
  await expect(page.getByRole('alert')).toHaveText('Wrong email or password.')
  await logInInUI(page, email, 'New-password-456')
  await expect(page.locator(frame)).toHaveAttribute('data-auth', 'signedIn')
})

test('9. "Use the demo account" logs in to the shared demo data', async ({ page }) => {
  await openLoggedOut(page)
  await page.getByRole('button', { name: 'Use the demo account' }).click()
  await goToSettings(page)
  await expect(page.getByText('Logged in as demo@medfriend.jo')).toBeVisible()
  // Read only: this test never changes the demo data.
  await goToMeds(page)
  await expect(page.locator('.med-card').first()).toBeVisible()
})

test('10. Logging in offline shows a clear message', async ({ page }) => {
  await openLoggedOut(page)
  await page.route(`${SUPABASE_URL}/**`, (route) => route.abort())
  await logInInUI(page, 'someone@mailinator.com', PASSWORD)
  await expect(page.getByRole('alert')).toContainText('Cannot reach Med Friend online')
})

test('11. Login screens work in Arabic', async ({ page }) => {
  await openLoggedOut(page)
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible()
  await page.getByRole('button', { name: 'إنشاء حساب' }).click()
  await expect(page.getByRole('heading', { name: 'إنشاء حساب' })).toBeVisible()
  await page.getByRole('button', { name: 'أنشئ الحساب' }).click()
  await expect(page.getByRole('alert')).toHaveText('أدخل بريداً إلكترونياً صحيحاً.')
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.getByRole('button', { name: 'نسيت كلمة المرور؟' }).click()
  await expect(page.getByRole('heading', { name: 'إعادة تعيين كلمة المرور' })).toBeVisible()
})

async function addOneMedicine(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: 'Add medication' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill(name)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Once a day' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(page.getByRole('listitem', { name })).toBeVisible()
}
