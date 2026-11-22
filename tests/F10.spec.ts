import { expect, test, type Page } from '@playwright/test'
import { goToMeds, goToSettings, loginWithMeds, newApiUser } from './helpers'

// Acceptance criteria: docs/specs/F10.md (document vault).
// 03:05 in Amman on Friday 20 Nov 2026: no dose is due, so no reminder panel covers the screen.
const EARLY = new Date('2026-11-20T00:05:00Z')
const BUCKET = 'documents'
// Node's Buffer without @types/node (not a dependency of this project).
const NodeBuffer = (globalThis as unknown as {
  Buffer: { from(text: string, encoding: string): Uint8Array; alloc(size: number): Uint8Array }
}).Buffer
const MED = [{ name: 'Concor', times: ['08:00'] }]

/** A PNG of the given size, drawn in the page (no image files in the repo). */
async function makeImage(page: Page, width: number, height: number): Promise<Uint8Array> {
  const dataUrl = await page.evaluate(
    ({ width, height }) => {
      const c = document.createElement('canvas')
      c.width = width
      c.height = height
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#10231d'
      ctx.font = '60px sans-serif'
      ctx.fillText('Lab result', 40, 100)
      return c.toDataURL('image/png')
    },
    { width, height },
  )
  return NodeBuffer.from(dataUrl.split(',')[1], 'base64')
}

const PDF_TEXT =
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj ' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
const pdfBytes = () => NodeBuffer.from(PDF_TEXT, 'utf8')
const pdf = (name = 'prescription.pdf') => ({ name, mimeType: 'application/pdf', buffer: pdfBytes() })

const rows = (page: Page) => page.locator('.doc-row')
const row = (page: Page, text: string) => rows(page).filter({ hasText: text })

async function goToDocs(page: Page) {
  await goToMeds(page)
  await page.getByRole('group', { name: 'Show' }).getByRole('button', { name: 'Documents' }).click()
  await expect(page.getByRole('heading', { name: 'My documents' })).toBeVisible()
}

async function chooseFile(page: Page, file: { name: string; mimeType: string; buffer: Uint8Array }) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add a document' }).click()
  await (await chooser).setFiles(file)
}

type ApiUser = Awaited<ReturnType<typeof newApiUser>>
async function storedFiles(user: ApiUser) {
  const { data, error } = await user.db.storage.from(BUCKET).list(user.userId)
  expect(error).toBeNull()
  return data!.map((f) => f.name)
}

/** A document added outside the browser (file + row). */
async function addByApi(user: ApiUser, type: string, date: string, title: string) {
  const path = `${user.userId}/${crypto.randomUUID()}.pdf`
  const up = await user.db.storage.from(BUCKET).upload(path, pdfBytes(), { contentType: 'application/pdf' })
  expect(up.error).toBeNull()
  const { error } = await user.db
    .from('documents')
    .insert({ doc_type: type, doc_date: date, title, file_path: path, mime_type: 'application/pdf' })
  expect(error).toBeNull()
}

test('1. My medicines has a Medicines | Documents switch; Documents starts empty with "Add a document"', async ({ page }) => {
  await loginWithMeds(page, MED, EARLY)
  await goToMeds(page)
  const sw = page.getByRole('group', { name: 'Show' })
  await expect(sw.getByRole('button', { name: 'Medicines' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.med-card')).toHaveCount(1)
  await goToDocs(page)
  await expect(page.getByText('No documents yet. Add a lab result or prescription.')).toBeVisible()
  const add = page.getByRole('button', { name: 'Add a document' })
  await expect(add).toBeVisible()
  expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  // Back to the medicines.
  await sw.getByRole('button', { name: 'Medicines' }).click()
  await expect(page.locator('.med-card')).toHaveCount(1)
})

test('2. Add a photo as a Lab result with date and name; it shows in the list (shrunk to 1600 px) and stays after reload', async ({ page }) => {
  const user = await loginWithMeds(page, MED, EARLY)
  await goToDocs(page)
  await chooseFile(page, { name: 'lab.png', mimeType: 'image/png', buffer: await makeImage(page, 2400, 1200) })
  await expect(page.getByRole('heading', { name: 'New document' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Photo of the document' })).toBeVisible()
  await expect(page.getByLabel('Date of the document')).toHaveValue('2026-11-20') // today by default
  await page.getByRole('button', { name: 'Lab result' }).click()
  await page.getByLabel('Date of the document').fill('2026-11-18')
  await page.getByLabel('Name (optional)').fill('Blood test – Dr. Ahmad')
  await page.getByRole('button', { name: 'Save document' }).click()

  await expect(page.getByRole('status')).toHaveText('Document saved')
  const saved = row(page, 'Blood test – Dr. Ahmad')
  await expect(saved).toContainText('Lab result')
  await expect(saved).toContainText('18 November 2026')
  const thumb = saved.locator('img.doc-thumb')
  await expect.poll(() => thumb.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([1600, 800])
  expect(await storedFiles(user)).toHaveLength(1)

  await page.reload()
  await goToDocs(page)
  await expect(row(page, 'Blood test – Dr. Ahmad')).toContainText('18 November 2026')
})

test('3. Add a PDF as a Prescription; it shows a PDF icon, and opening it offers "Open the PDF"', async ({ page }) => {
  await loginWithMeds(page, MED, EARLY)
  await goToDocs(page)
  await chooseFile(page, pdf())
  await expect(page.getByText('prescription.pdf')).toBeVisible()
  await page.getByRole('button', { name: 'Prescription' }).click()
  await page.getByRole('button', { name: 'Save document' }).click()

  const saved = row(page, 'Prescription')
  await expect(saved).toContainText('PDF file')
  await expect(saved).toContainText('20 November 2026')
  await expect(saved.locator('.doc-thumb--icon')).toBeVisible()
  await saved.click()
  await expect(page.getByRole('heading', { name: 'Prescription' })).toBeVisible()
  const open = page.getByRole('link', { name: 'Open the PDF' })
  await expect(open).toHaveAttribute('href', /\/storage\/v1\/object\/sign\/documents\//)
  await expect(open).toHaveAttribute('target', '_blank')
  // The link really gives the file.
  const res = await page.request.get((await open.getAttribute('href'))!)
  expect(res.ok()).toBe(true)
  expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('heading', { name: 'My documents' })).toBeVisible()
})

test('4. Newest date first; the type chips filter the list', async ({ page }) => {
  const user = await loginWithMeds(page, MED, EARLY)
  await addByApi(user, 'report', '2026-11-10', 'Heart report')
  await addByApi(user, 'lab', '2026-11-15', 'Sugar test')
  await addByApi(user, 'lab', '2026-10-02', 'Old sugar test')
  await goToDocs(page)
  await expect(rows(page)).toHaveCount(3)
  await expect(page.getByText('3 documents')).toBeVisible()
  await expect(rows(page).nth(0)).toContainText('Sugar test')
  await expect(rows(page).nth(1)).toContainText('Heart report')
  await expect(rows(page).nth(2)).toContainText('Old sugar test')

  const chips = page.getByRole('group', { name: 'Show documents' })
  await chips.getByRole('button', { name: 'Lab results' }).click()
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page).filter({ hasText: 'Heart report' })).toHaveCount(0)
  await chips.getByRole('button', { name: 'Prescriptions' }).click()
  await expect(rows(page)).toHaveCount(0)
  await expect(page.getByText('No documents of this type.')).toBeVisible()
  await chips.getByRole('button', { name: 'All' }).click()
  await expect(rows(page)).toHaveCount(3)
})

test('5. The type is required and the date cannot be in the future', async ({ page }) => {
  const user = await loginWithMeds(page, MED, EARLY)
  await goToDocs(page)
  await chooseFile(page, pdf())
  await page.getByRole('button', { name: 'Save document' }).click()
  await expect(page.getByText('Choose the kind of document.')).toBeVisible()
  await page.getByRole('button', { name: 'Medical report' }).click()
  await page.getByLabel('Date of the document').fill('2026-11-25')
  await expect(page.getByText('The date cannot be in the future.')).toBeVisible()
  await page.getByRole('button', { name: 'Save document' }).click()
  await expect(page.getByRole('heading', { name: 'New document' })).toBeVisible() // not saved
  expect(await storedFiles(user)).toHaveLength(0)
  // Cancel goes back without saving.
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('No documents yet. Add a lab result or prescription.')).toBeVisible()
})

test('6. A wrong file type and a file over 10 MB are refused with friendly messages', async ({ page }) => {
  await loginWithMeds(page, MED, EARLY)
  await goToDocs(page)
  await chooseFile(page, { name: 'notes.txt', mimeType: 'text/plain', buffer: NodeBuffer.from('hello', 'utf8') })
  await expect(page.getByRole('alert')).toHaveText('Only photos and PDF files can be added.')
  await chooseFile(page, { name: 'big.pdf', mimeType: 'application/pdf', buffer: NodeBuffer.alloc(11 * 1024 * 1024) })
  await expect(page.getByRole('alert')).toHaveText('This file is too big (max 10 MB).')
  await expect(page.getByRole('heading', { name: 'My documents' })).toBeVisible()
})

test('7. Delete asks first; then the document and its file are gone', async ({ page }) => {
  const user = await loginWithMeds(page, MED, EARLY)
  await addByApi(user, 'other', '2026-11-12', 'Insurance card')
  await goToDocs(page)
  await row(page, 'Insurance card').click()
  await page.getByRole('button', { name: 'Delete document' }).click()
  await expect(page.getByText('Delete this document? This cannot be undone.')).toBeVisible()
  await page.getByRole('button', { name: 'Keep it' }).click()
  await page.getByRole('button', { name: 'Delete document' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(page.getByRole('status')).toHaveText('Document deleted')
  await expect(rows(page)).toHaveCount(0)
  await expect.poll(() => storedFiles(user)).toHaveLength(0)
  const { data } = await user.db.from('documents').select('id')
  expect(data).toHaveLength(0)
})

test('8. Privacy: another account cannot see my documents or their files', async ({ page }) => {
  void page
  const owner = await newApiUser()
  await addByApi(owner, 'lab', '2026-11-15', 'Private result')
  const [file] = await storedFiles(owner)
  const path = `${owner.userId}/${file}`

  const other = await newApiUser()
  const table = await other.db.from('documents').select('id')
  expect(table.data ?? []).toHaveLength(0)
  expect((await other.db.storage.from(BUCKET).download(path)).data).toBeNull()
  expect((await other.db.storage.from(BUCKET).createSignedUrl(path, 60)).data).toBeNull()
  expect((await other.db.storage.from(BUCKET).list(owner.userId)).data ?? []).toHaveLength(0)
  const planted = await other.db
    .from('documents')
    .insert({ user_id: owner.userId, doc_type: 'lab', doc_date: '2026-11-15', file_path: path, mime_type: 'application/pdf' })
  expect(planted.error).not.toBeNull()
  await other.db.storage.from(BUCKET).remove([path])
  await other.db.from('documents').delete().not('id', 'is', null)
  // Still there for the owner; nobody logged out can read it (the bucket is private).
  expect((await owner.db.from('documents').select('id')).data).toHaveLength(1)
  expect((await owner.db.storage.from(BUCKET).download(path)).data).not.toBeNull()
  const anon = await fetch(`${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`)
  expect(anon.ok).toBe(false)
})

test('9. Reset all data also deletes every document and file', async ({ page }) => {
  const user = await loginWithMeds(page, MED, EARLY)
  await addByApi(user, 'lab', '2026-11-15', 'Sugar test')
  await addByApi(user, 'prescription', '2026-11-16', 'Dr. Ahmad')
  await goToSettings(page)
  await page.getByRole('button', { name: 'Reset all data' }).click()
  await page.getByRole('button', { name: 'Yes, delete everything' }).click()
  await expect(page.getByRole('status')).toHaveText('All your data is deleted.')
  expect((await user.db.from('documents').select('id')).data).toHaveLength(0)
  expect(await storedFiles(user)).toHaveLength(0)
  await goToDocs(page)
  await expect(page.getByText('No documents yet. Add a lab result or prescription.')).toBeVisible()
})

test('10. Arabic: the vault is in Arabic, right to left', async ({ page }) => {
  const user = await loginWithMeds(page, MED, EARLY)
  await addByApi(user, 'lab', '2026-11-15', 'فحص سكر')
  await goToMeds(page)
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByRole('group', { name: 'عرض' }).getByRole('button', { name: 'المستندات' }).click()
  await expect(page.getByRole('heading', { name: 'مستنداتي' })).toBeVisible()
  await expect(row(page, 'فحص سكر')).toContainText('نتيجة مختبر')
  await expect(row(page, 'فحص سكر')).toContainText('15 تشرين الثاني 2026')
  await expect(page.getByRole('button', { name: 'أضف مستندًا' })).toBeVisible()
  await page.getByRole('group', { name: 'عرض المستندات' }).getByRole('button', { name: 'الوصفات الطبية' }).click()
  await expect(page.getByText('لا توجد مستندات من هذا النوع.')).toBeVisible()
})
