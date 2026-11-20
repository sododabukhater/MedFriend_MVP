import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'
import { alertPatient } from '../lib/alert'
import { SNOOZE_MIN, type Reminder } from '../lib/doses'
import { amountText, strengthText } from '../lib/format'
import { useDemoSpeed } from '../lib/settings'
import type { DoseAction } from '../lib/useDoses'

type Props = {
  reminders: Reminder[]
  busyKey: string | null
  onAnswer: (reminder: Reminder, action: DoseAction) => void
}

/** F1: in-app reminder for the first due dose, with Taken / Snooze / Skip. Spec: docs/specs/F1.md */
export default function ReminderBanner({ reminders, busyKey, onAnswer }: Props) {
  const { t, lang } = useI18n()
  const demo = useDemoSpeed()
  const alerted = useRef(new Set<string>())

  // Chime + vibrate once for each new reminder or follow-up.
  useEffect(() => {
    const newAlerts = reminders.filter((r) => !alerted.current.has(r.alertId))
    if (newAlerts.length === 0) return
    newAlerts.forEach((r) => alerted.current.add(r.alertId))
    alertPatient(newAlerts.some((r) => r.stage === 'followUp'))
  }, [reminders])

  // "(1) Med Friend" in the browser tab while reminders are waiting.
  useEffect(() => {
    const name = t('app.name')
    document.title = reminders.length > 0 ? `(${reminders.length}) ${name}` : name
  }, [reminders.length, t, lang])

  const current = reminders[0]
  if (!current) return null
  const { dose, stage } = current
  const { med } = dose
  const strength = strengthText(t, med.strengthValue, med.strengthUnit)
  const busy = busyKey === dose.key

  return (
    <section
      className={`reminder${stage === 'followUp' ? ' reminder--followup' : ''}`}
      role="alertdialog"
      aria-labelledby="reminder-title"
      aria-describedby="reminder-dose"
      data-stage={stage}
    >
      <p id="reminder-title" className="reminder-title">
        {stage === 'followUp' ? t('rem.followUp') : t('rem.title')}
        {reminders.length > 1 && (
          <span className="reminder-count"> · {t('rem.count', { n: 1, total: reminders.length })}</span>
        )}
      </p>
      <p id="reminder-dose" className="reminder-dose">
        <span dir="ltr">{dose.time}</span> · {med.name}
        {strength && ` ${strength}`} · {amountText(t, med.form, med.amount)}
      </p>
      <div className="reminder-actions">
        <button type="button" className="btn-take" disabled={busy} onClick={() => onAnswer(current, 'taken')}>
          ✓ {t('dose.take')}
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => onAnswer(current, 'snoozed')}>
          {t(demo ? 'rem.snoozeSec' : 'rem.snoozeMin', { n: SNOOZE_MIN })}
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => onAnswer(current, 'skipped')}>
          {t('dose.skip')}
        </button>
      </div>
    </section>
  )
}
