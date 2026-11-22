import { useState } from 'react'
import { useI18n, type MessageKey } from '../i18n'
import { amountText, strengthText } from '../lib/format'
import { anchorLabel, doseTimesOn } from '../lib/anchors'
import { usePrefs } from '../lib/prefs'
import { ammanDate, dayPart } from '../lib/time'
import type { Medication } from '../storage/medications'

type Props = {
  med: Medication
  onDelete: (med: Medication) => Promise<void>
}

/** One medicine in "My medicines": name + strength, "1 tablet, twice a day", time chips. */
export default function MedicationCard({ med, onDelete }: Props) {
  const { t } = useI18n()
  const prefs = usePrefs()
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
