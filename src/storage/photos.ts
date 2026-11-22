import { supabase } from '../lib/supabase'

// F4: the patient's own photo of a pill or box. Private Storage bucket, one folder per account.
// Spec: docs/specs/F4.md

export const PHOTO_BUCKET = 'pill-photos'
/** Longest side of the saved photo, in pixels. */
export const PHOTO_MAX_SIDE = 800
/** Signed links to private photos last one day; they are made again whenever the medicine list loads. */
const LINK_SECONDS = 24 * 3600

export class NotAnImageError extends Error {}

/** Shrinks a photo in the browser (longest side 800 px, or `maxSide`) and returns it as a JPEG. */
export async function shrinkPhoto(file: File, maxSide = PHOTO_MAX_SIDE, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new NotAnImageError()
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    try {
      await img.decode()
    } catch {
      throw new NotAnImageError()
    }
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff' // transparent PNGs get a white background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('Could not encode the photo')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Not logged in')
  return id
}

/** Signed links for private photos, by path. Missing files are left out. */
export async function photoLinks(paths: string[]): Promise<Map<string, string>> {
  const links = new Map<string, string>()
  if (paths.length === 0) return links
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, LINK_SECONDS)
  if (error) {
    console.error('Photo links failed', error)
    return links
  }
  for (const item of data) if (item.path && item.signedUrl) links.set(item.path, item.signedUrl)
  return links
}

/**
 * Saves a new photo for a medicine: upload, point the medicine at it, then delete the old file.
 * Returns the new path and a link to show it.
 */
export async function savePhoto(
  medicationId: string,
  oldPath: string | null,
  file: File | Blob,
): Promise<{ photoPath: string; photoUrl: string | null }> {
  const blob = file instanceof File ? await shrinkPhoto(file) : file
  const path = `${await userId()}/${medicationId}-${Date.now()}.jpg`
  const bucket = supabase.storage.from(PHOTO_BUCKET)
  const { error: upErr } = await bucket.upload(path, blob, { contentType: 'image/jpeg' })
  if (upErr) throw upErr
  const { error: dbErr } = await supabase.from('medications').update({ photo_path: path }).eq('id', medicationId)
  if (dbErr) {
    await bucket.remove([path])
    throw dbErr
  }
  if (oldPath) await removeFiles([oldPath])
  const links = await photoLinks([path])
  return { photoPath: path, photoUrl: links.get(path) ?? null }
}

/** Removes a medicine's photo (the medicine stays). */
export async function removePhoto(medicationId: string, path: string): Promise<void> {
  const { error } = await supabase.from('medications').update({ photo_path: null }).eq('id', medicationId)
  if (error) throw error
  await removeFiles([path])
}

/** Deletes files; a failure only leaves an unused file behind, so it is logged, not shown. */
export async function removeFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths)
  if (error) console.error('Deleting photo files failed', error)
}

/** "Reset all data": deletes every photo in this account's folder. */
export async function removeAllPhotos(): Promise<void> {
  const id = await userId()
  const bucket = supabase.storage.from(PHOTO_BUCKET)
  const { data, error } = await bucket.list(id, { limit: 1000 })
  if (error) {
    console.error('Listing photos failed', error)
    return
  }
  await removeFiles(data.map((f) => `${id}/${f.name}`))
}
