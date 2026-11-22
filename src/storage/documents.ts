import { supabase } from '../lib/supabase'
import { NotAnImageError, shrinkPhoto } from './photos'

// F10-lite: document vault (lab results, prescriptions). Table `documents` + private Storage bucket `documents`,
// one folder per account. Spec: docs/specs/F10.md

export const DOC_BUCKET = 'documents'
export const DOC_TYPES = ['lab', 'prescription', 'report', 'other'] as const
export type DocType = (typeof DOC_TYPES)[number]
/** Largest file accepted (also the bucket's own limit). */
export const DOC_MAX_BYTES = 10 * 1024 * 1024
/** Document photos keep more detail than pill photos, so the text stays readable. */
export const DOC_PHOTO_MAX_SIDE = 1600
export const DOC_TITLE_MAX = 80
const LINK_SECONDS = 24 * 3600

export type MedDocument = {
  id: string
  type: DocType
  date: string // "YYYY-MM-DD"
  title: string | null
  path: string
  isPdf: boolean
  /** Short-lived link to see the file (null if it could not be made). */
  url: string | null
}

/** Not a photo or a PDF. */
export class WrongFileError extends Error {}
/** Over 10 MB. */
export class TooBigError extends Error {}

type Row = { id: string; doc_type: DocType; doc_date: string; title: string | null; file_path: string; mime_type: string }

/** This account's documents, newest date first, each with a link to see it. */
export async function listDocuments(): Promise<MedDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('id, doc_type, doc_date, title, file_path, mime_type')
    .order('doc_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = data as Row[]
  const links = new Map<string, string>()
  if (rows.length > 0) {
    const res = await supabase.storage.from(DOC_BUCKET).createSignedUrls(rows.map((r) => r.file_path), LINK_SECONDS)
    if (res.error) console.error('Document links failed', res.error)
    else for (const item of res.data) if (item.path && item.signedUrl) links.set(item.path, item.signedUrl)
  }
  return rows.map((r) => ({
    id: r.id,
    type: r.doc_type,
    date: r.doc_date,
    title: r.title,
    path: r.file_path,
    isPdf: r.mime_type === 'application/pdf',
    url: links.get(r.file_path) ?? null,
  }))
}

export const isPdfFile = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

/** Checks a chosen file: a photo or a PDF of at most 10 MB. Throws WrongFileError / TooBigError. */
export function checkDocumentFile(file: File): void {
  if (!isPdfFile(file) && !file.type.startsWith('image/')) throw new WrongFileError()
  if (file.size > DOC_MAX_BYTES) throw new TooBigError()
}

/** The file as it is uploaded: photos shrunk to a JPEG (longest side 1600 px), PDFs unchanged. */
async function prepare(file: File): Promise<{ blob: Blob; mime: 'image/jpeg' | 'application/pdf' }> {
  checkDocumentFile(file)
  if (isPdfFile(file)) return { blob: file, mime: 'application/pdf' }
  try {
    return { blob: await shrinkPhoto(file, DOC_PHOTO_MAX_SIDE, 0.85), mime: 'image/jpeg' }
  } catch (err) {
    if (err instanceof NotAnImageError) throw new WrongFileError()
    throw err
  }
}

/** Saves a new document: upload the file, then the row (the file is removed again if the row fails). */
export async function addDocument(
  file: File,
  info: { type: DocType; date: string; title: string },
): Promise<void> {
  const { blob, mime } = await prepare(file)
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) throw new Error('Not logged in')
  const id = crypto.randomUUID()
  const path = `${userId}/${id}.${mime === 'application/pdf' ? 'pdf' : 'jpg'}`
  const bucket = supabase.storage.from(DOC_BUCKET)
  const { error: upErr } = await bucket.upload(path, blob, { contentType: mime })
  if (upErr) throw upErr
  const title = info.title.trim().slice(0, DOC_TITLE_MAX)
  const { error } = await supabase.from('documents').insert({
    id,
    doc_type: info.type,
    doc_date: info.date,
    title: title || null,
    file_path: path,
    mime_type: mime,
  })
  if (error) {
    await bucket.remove([path])
    throw error
  }
}

/** Deletes a document and its file. */
export async function deleteDocument(doc: MedDocument): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw error
  const res = await supabase.storage.from(DOC_BUCKET).remove([doc.path])
  if (res.error) console.error('Deleting the document file failed', res.error)
}

/** "Reset all data": every document of this account and its files. */
export async function deleteAllDocuments(): Promise<void> {
  const { error } = await supabase.from('documents').delete().not('id', 'is', null)
  if (error) throw error
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return
  const bucket = supabase.storage.from(DOC_BUCKET)
  const { data, error: listErr } = await bucket.list(userId, { limit: 1000 })
  if (listErr) {
    console.error('Listing document files failed', listErr)
    return
  }
  if (data.length > 0) await bucket.remove(data.map((f) => `${userId}/${f.name}`))
}
