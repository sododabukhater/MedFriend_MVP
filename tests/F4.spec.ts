import { expect, test, type Page } from '@playwright/test'
import { goToMeds, loginWithMeds, newApiUser } from './helpers'

// Acceptance criteria: docs/specs/F4.md (own-pill photo card).
// 03:05 in Amman on 20 Nov 2026: no dose is due, so no reminder panel covers the screen.
const EARLY = new Date('2026-11-20T00:05:00Z')
// 08:05 in Amman: the 08:00 dose is due.
const AT_DOSE = new Date('2026-11-20T05:05:00Z')
const BUCKET = 'pill-photos'
// Node's Buffer without @types/node (not a dependency of this project).
const NodeBuffer = (globalThis as unknown as { Buffer: { from(text: string, encoding: string): Uint8Array } }).Buffer
const bytes = (text: string, encoding: string) => NodeBuffer.from(text, encoding)

/** A PNG of the given size, drawn in the page (no image files in the repo). */
async function makeImage(page: Page, width: number, height: number, color = '#1a6b5a'): Promise<Uint8Array> {
  const dataUrl = await page.evaluate(
    ({ width, height, color }) => {
      const c = document.createElement('canvas')
      c.width = width
      c.height = height
      const ctx = c.getContext('2d')!
      ctx.fillStyle = color
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(width / 2, height / 2, Math.min(width, height) / 4, 0, Math.PI * 2)
      ctx.fill()
      return c.toDataURL('image/png')
    },
    { width, height, color },
  )
  return bytes(dataUrl.split(',')[1], 'base64')
}

const png = (buffer: Uint8Array, name = 'pill.png') => ({ name, mimeType: 'image/png', buffer })
const card = (page: Page, name: string) => page.getByRole('listitem', { name })
const cardPhoto = (page: Page, name: string) => card(page, name).getByRole('img', { name: `Photo of ${name}` })

type ApiUser = Awaited<ReturnType<typeof newApiUser>>
async function storedFiles(user: ApiUser) {
  const { data, error } = await user.db.storage.from(BUCKET).list(user.userId)
  expect(error).toBeNull()
  return data!.map((f) => f.name)
}

async function chooseOnCard(page: Page, name: string, label: 'Add a photo' | 'Change the photo', file: ReturnType<typeof png>) {
  const chooser = page.waitForEvent('filechooser')
  await card(page, name).getByRole('button', { name: `${label} of ${name}` }).click()
  await (await chooser).setFiles(file)
}

test('1 + 6. Add a photo from My medicines; it is shrunk to 800 px and stays after reload', async ({ page }) => {
  const user = await loginWithMeds(page, [{ name: 'Concor', times: ['08:00'] }], EARLY)
  await goToMeds(page)
  await expect(card(page, 'Concor').getByRole('img')).toHaveCount(0)

  await chooseOnCard(page, 'Concor', 'Add a photo', png(await makeImage(page, 2000, 1200)))
  await expect(cardPhoto(page, 'Concor')).toBeVisible()
  // Shrunk in the browser: longest side 800 px.
  await expect
    .poll(() => cardPhoto(page, 'Concor').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]))
    .toEqual([800, 480])
  expect(await storedFiles(user)).toHaveLength(1)

  await page.reload()
  await goToMeds(page)
  await expect(cardPhoto(page, 'Concor')).toBeVisible()
  await expect.poll(() => cardPhoto(page, 'Concor').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(800)
})

test('2. Change photo replaces it (old file deleted); Remove photo asks first, then the Add box returns', async ({ page }) => {
  const user = await loginWithMeds(page, [{ name: 'Concor', times: ['08:00'] }], EARLY)
  await goToMeds(page)
  await chooseOnCard(page, 'Concor', 'Add a photo', png(await makeImage(page, 300, 300)))
  await expect(cardPhoto(page, 'Concor')).toBeVisible()
  const firstSrc = await cardPhoto(page, 'Concor').getAttribute('src')
  const [firstFile] = await storedFiles(user)

  await chooseOnCard(page, 'Concor', 'Change the photo', png(await makeImage(page, 400, 200, '#9b1c1c')))
  await expect(cardPhoto(page, 'Concor')).not.toHaveAttribute('src', firstSrc!)
  await expect.poll(() => cardPhoto(page, 'Concor').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(400)
  await expect.poll(() => storedFiles(user)).toHaveLength(1)
  expect(await storedFiles(user)).not.toContain(firstFile)

  await card(page, 'Concor').getByRole('button', { name: 'Remove the photo of Concor' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Remove the photo of Concor?' })
  await confirm.getByRole('button', { name: 'Keep it' }).click()
  await expect(cardPhoto(page, 'Concor')).toBeVisible()

  await card(page, 'Concor').getByRole('button', { name: 'Remove the photo of Concor' }).click()
  await confirm.getByRole('button', { name: 'Yes, remove' }).click()
  await expect(card(page, 'Concor').getByRole('button', { name: 'Add a photo of Concor' })).toBeVisible()
  await expect(card(page, 'Concor').getByRole('img')).toHaveCount(0)
  await expect.poll(() => storedFiles(user)).toHaveLength(0)
  await page.reload()
  await goToMeds(page)
  await expect(card(page, 'Concor').getByRole('button', { name: 'Add a photo of Concor' })).toBeVisible()
})

test('3. Add medication: step 5 takes a photo; it shows on the review and on the new card', async ({ page }) => {
  const user = await loginWithMeds(page, [{ name: 'Concor', times: ['08:00'] }], EARLY)
  await goToMeds(page)
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Lipitor')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Once a day' }).click()
  await page.getByRole('button', { name: 'Next' }).click()

  await expect(page.getByText('Step 5 of 5')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Take a photo of your pill or box' })).toBeVisible()
  // Without a photo the main button skips; with one it says Next.
  await expect(page.getByRole('button', { name: 'Skip for now' })).toBeVisible()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Take or choose a photo' }).click()
  await (await chooser).setFiles(png(await makeImage(page, 1200, 1600)))
  await expect(page.getByRole('img', { name: 'Photo of Lipitor' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose another photo' })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()

  await expect(page.getByRole('heading', { name: 'Check and save' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Photo of Lipitor' })).toBeVisible()
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(page.getByRole('status')).toHaveText('Medication saved')
  await expect(cardPhoto(page, 'Lipitor')).toBeVisible()
  await expect.poll(() => cardPhoto(page, 'Lipitor').evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(800)
  expect(await storedFiles(user)).toHaveLength(1)
})

test('3b. Add medication: a chosen photo can be removed again, then the medicine saves without one', async ({ page }) => {
  const user = await loginWithMeds(page, [{ name: 'Concor', times: ['08:00'] }], EARLY)
  await goToMeds(page)
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Lasix')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Once a day' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Take or choose a photo' }).click()
  await (await chooser).setFiles(png(await makeImage(page, 200, 200)))
  await page.getByRole('button', { name: 'Remove photo' }).click()
  await expect(page.getByRole('img')).toHaveCount(0)
  await page.getByRole('button', { name: 'Skip for now' }).click()
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(card(page, 'Lasix').getByRole('button', { name: 'Add a photo of Lasix' })).toBeVisible()
  expect(await storedFiles(user)).toHaveLength(0)
})

test('4. The reminder panel shows the photo large; the Today row shows a small one', async ({ page }) => {
  const user = await loginWithMeds(page, [{ name: 'Concor', times: ['08:00'] }], AT_DOSE)
  // Give the medicine a photo through the API, then reload so the app loads it.
  const { data: med } = await user.db.from('medications').select('id').single()
  const path = `${user.userId}/${med!.id}-1.jpg`
  const { error: upErr } = await user.db.storage
    .from(BUCKET)
    .upload(path, await makeImage(page, 300, 300), { contentType: 'image/png' })
  expect(upErr).toBeNull()
  await user.db.from('medications').update({ photo_path: path }).eq('id', med!.id)
  await page.reload()

  const panel = page.getByRole('alertdialog')
  await expect(panel).toBeVisible()
  const big = panel.getByRole('img', { name: 'Photo of Concor' })
  await expect(big).toBeVisible()
  expect((await big.boundingBox())!.width).toBeGreaterThanOrEqual(150)
  await panel.getByRole('button', { name: 'I took it' }).click()
  await expect(panel).toHaveCount(0)

  const thumb = page.getByRole('listitem', { name: '08:00 Concor', exact: true }).locator('img.pill-photo--thumb')
  await expect(thumb).toBeVisible()
  expect((await thumb.boundingBox())!.width).toBeCloseTo(48, 0)
})

test('5. Privacy: another account cannot see, list, add or delete my photos', async ({ page }) => {
  const owner = await newApiUser()
  const path = `${owner.userId}/secret-1.jpg`
  const { error: upErr } = await owner.db.storage
    .from(BUCKET)
    .upload(path, await makeImage(page, 50, 50), { contentType: 'image/png' })
  expect(upErr).toBeNull()

  const other = await newApiUser()
  const read = await other.db.storage.from(BUCKET).download(path)
  expect(read.data).toBeNull()
  const link = await other.db.storage.from(BUCKET).createSignedUrl(path, 60)
  expect(link.data).toBeNull()
  const list = await other.db.storage.from(BUCKET).list(owner.userId)
  expect(list.data ?? []).toHaveLength(0)
  const write = await other.db.storage
    .from(BUCKET)
    .upload(`${owner.userId}/planted.jpg`, await makeImage(page, 10, 10), { contentType: 'image/png' })
  expect(write.error).not.toBeNull()
  await other.db.storage.from(BUCKET).remove([path])
  // Still there for the owner. Nobody logged out can read it either (the bucket is private).
  expect((await owner.db.storage.from(BUCKET).download(path)).data).not.toBeNull()
  const anon = await fetch(`${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`)
  expect(anon.ok).toBe(false)
})

test('7. A file that is not an image is refused with a friendly message', async ({ page }) => {
  const user = await loginWithMeds(page, [{ name: 'Concor', times: ['08:00'] }], EARLY)
  await goToMeds(page)
  await chooseOnCard(page, 'Concor', 'Add a photo', { name: 'notes.txt', mimeType: 'text/plain', buffer: bytes('hello', 'utf8') })
  await expect(card(page, 'Concor').getByRole('alert')).toHaveText('Please choose a photo (an image file).')
  await expect(card(page, 'Concor').getByRole('img')).toHaveCount(0)
  expect(await storedFiles(user)).toHaveLength(0)
})

test('8. Deleting a medicine deletes its photo file', async ({ page }) => {
  const user = await loginWithMeds(page, [{ name: 'Concor', times: ['08:00'] }], EARLY)
  await goToMeds(page)
  await chooseOnCard(page, 'Concor', 'Add a photo', png(await makeImage(page, 300, 300)))
  await expect(cardPhoto(page, 'Concor')).toBeVisible()
  expect(await storedFiles(user)).toHaveLength(1)

  await card(page, 'Concor').getByRole('button', { name: 'Delete Concor' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(card(page, 'Concor')).toHaveCount(0)
  await expect.poll(() => storedFiles(user)).toHaveLength(0)
})

test('9. Arabic: photo buttons in Arabic, right-to-left, big enough to tap', async ({ page }) => {
  await loginWithMeds(page, [{ name: 'Concor', times: ['08:00'] }], EARLY)
  await goToMeds(page)
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  const add = card(page, 'Concor').getByRole('button', { name: 'أضف صورة لـ Concor' })
  await expect(add).toHaveText('أضف صورة')
  expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(48)

  const chooser = page.waitForEvent('filechooser')
  await add.click()
  await (await chooser).setFiles(png(await makeImage(page, 300, 300)))
  await expect(card(page, 'Concor').getByRole('img', { name: 'صورة Concor' })).toBeVisible()
  for (const name of ['غيّر صورة Concor', 'احذف صورة Concor']) {
    const button = card(page, 'Concor').getByRole('button', { name })
    await expect(button).toBeVisible()
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  }
  // RTL: the photo sits on the right-hand (start) side of the card.
  const cardBox = (await card(page, 'Concor').boundingBox())!
  const photoBox = (await card(page, 'Concor').getByRole('img').boundingBox())!
  expect(photoBox.x + photoBox.width).toBeGreaterThan(cardBox.x + cardBox.width / 2)
})
