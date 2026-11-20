import { useState } from 'react'
import { useI18n, type MessageKey } from '../i18n'
import { amountText, perDayText, strengthText } from '../lib/format'
import type { Medication } from '../storage/medications'

type Props = {
  med: Medication
  onDelete: (med: Medication) => Promise<void>
}

/** One medicine on the home screen. Delete asks "Are you sure?" inside the card first. */
export default function MedicationCard({ med, onDelete }: Props) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

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
            className="btn-text btn-danger-text"
            aria-label={t('card.deleteLabel', { name: med.name })}
            onClick={() => setConfirming(true)}
          >
            {t('card.delete')}
          </button>
        )}
      </div>
      <p className="med-detail">
        {t(`form.${med.form}` as MessageKey)} · {amountText(t, med.form, med.amount)} ·{' '}
        {perDayText(t, med.timesPerDay)}
      </p>
      <p className="med-times" dir="ltr">
        {med.times.join(' · ')}
      </p>

      {confirming && (
        <div className="confirm" role="alertdialog" aria-label={t('card.confirmDelete', { name: med.name })}>
          <p>{t('card.confirmDelete', { name: med.name })}</p>
          <div className="confirm-actions">
            <button type="button" className="btn-danger" disabled={busy} onClick={confirmDelete}>
              {t('card.confirmYes')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              {t('card.confirmNo')}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
