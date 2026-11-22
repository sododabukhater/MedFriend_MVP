import { useState } from 'react'
import { useI18n, type MessageKey } from '../i18n'
import { amountText, strengthText } from '../lib/format'
import { anchorLabel, doseTimesOn } from '../lib/anchors'
import { usePrefs } from '../lib/prefs'
import { ammanDate, dayPart } from '../lib/time'
import type { Medication } from '../storage/medications'
import { NotAnImageError } from '../storage/photos'
import { CameraIcon } from './Icons'
import PhotoPicker from './PhotoPicker'

type Props = {
  med: Medication
  onDelete: (med: Medication) => Promise<void>
  /** F4: save a new photo / remove the photo (they throw on failure). */
  onPhoto: (med: Medication, file: File) => Promise<void>
  onRemovePhoto: (med: Medication) => Promise<void>
}

/** One medicine in "My medicines": name + strength, "1 tablet, twice a day", time chips. */
export default function MedicationCard({ med, onDelete, onPhoto, onRemovePhoto }: Props) {
  const { t } = useI18n()
  const prefs = usePrefs()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  // F4 photo: saving, error message, remove confirmation.
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<MessageKey | null>(null)
  const [confirmingPhoto, setConfirmingPhoto] = useState(false)

  async function photoTask(task: () => Promise<void>) {
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      await task()
      setConfirmingPhoto(false)
    } catch (err) {
      console.error('Photo change failed', err)
      setPhotoError(err instanceof NotAnImageError ? 'photo.notImage' : 'photo.failed')
    } finally {
      setPhotoBusy(false)
    }
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await onDelete(med)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="med-card" aria-label={med.name}>
      <div className="med-card-head">
        <h3 className="med-name">
          {med.name}
          {med.strengthValue !== null && (
            <span className="med-strength"> {strengthText(t, med.strengthValue, med.strengthUnit)}</span>
          )}
        </h3>
        {!confirming && (
          <button
            type="button"
            className="btn-link btn-link--danger"
            aria-label={t('card.deleteLabel', { name: med.name })}
            onClick={() => setConfirming(true)}
          >
            {t('card.delete')}
          </button>
        )}
      </div>
      <p className="med-detail">
        {t('med.detail', {
          amount: amountText(t, med.form, med.amount),
          often: t(`often.${med.timesPerDay}` as MessageKey),
        })}
      </p>
      <div className="chips">
        {doseTimesOn(med, ammanDate(new Date()), prefs).map(({ time, anchor }, i) =>
          anchor ? (
            <span key={i} className={`chip tint--${dayPart(time)}`}>
              {anchorLabel(t, anchor)}
            </span>
          ) : (
            <span key={i} className={`chip tint--${dayPart(time)}`} dir="ltr">
              {time}
            </span>
          ),
        )}
      </div>

      <div className="med-photo-row">
        {med.photoUrl ? (
          <>
            <img className="pill-photo pill-photo--card" src={med.photoUrl} alt={t('photo.alt', { name: med.name })} />
            {!confirmingPhoto && (
              <div className="med-photo-actions">
                <PhotoPicker
                  className="btn-secondary btn-small"
                  label={t('photo.changeLabel', { name: med.name })}
                  disabled={photoBusy}
                  onFile={(file) => photoTask(() => onPhoto(med, file))}
                >
                  {t('photo.change')}
                </PhotoPicker>
                <button
                  type="button"
                  className="btn-link btn-link--danger"
                  aria-label={t('photo.removeLabel', { name: med.name })}
                  disabled={photoBusy}
                  onClick={() => setConfirmingPhoto(true)}
                >
                  {t('photo.remove')}
                </button>
              </div>
            )}
          </>
        ) : (
          <PhotoPicker
            className="photo-add"
            label={t('photo.addLabel', { name: med.name })}
            disabled={photoBusy}
            onFile={(file) => photoTask(() => onPhoto(med, file))}
          >
            <CameraIcon size={26} />
            {t('photo.add')}
          </PhotoPicker>
        )}
      </div>
      {photoBusy && (
        <p className="photo-status" role="status">
          {t('photo.saving')}
        </p>
      )}
      {photoError && (
        <p className="field-problem" role="alert">
          {t(photoError)}
        </p>
      )}
      {confirmingPhoto && (
        <div className="confirm" role="alertdialog" aria-label={t('photo.confirmRemove', { name: med.name })}>
          <p>{t('photo.confirmRemove', { name: med.name })}</p>
          <div className="confirm-actions">
            <button
              type="button"
              className="btn-danger"
              disabled={photoBusy}
              onClick={() => photoTask(() => onRemovePhoto(med))}
            >
              {t('photo.confirmYes')}
            </button>
            <button type="button" className="btn-secondary" disabled={photoBusy} onClick={() => setConfirmingPhoto(false)}>
              {t('card.confirmNo')}
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="confirm" role="alertdialog" aria-label={t('card.confirmDelete', { name: med.name })}>
          <p>{t('card.confirmDelete', { name: med.name })}</p>
          <div className="confirm-actions">
            <button type="button" className="btn-danger" disabled={busy} onClick={confirmDelete}>
              {t('card.confirmYes')}
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>
              {t('card.confirmNo')}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
