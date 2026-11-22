import { useEffect, useRef } from 'react'
import { useI18n, type MessageKey } from '../i18n'
import { alertPatient } from '../lib/alert'
import { anchorLabel } from '../lib/anchors'
import { SNOOZE_MIN, type Reminder } from '../lib/doses'
import { amountText, strengthText } from '../lib/format'
import { useDemoSpeed } from '../lib/settings'
import type { DoseAction } from '../lib/useDoses'
import { CheckIcon, PartIcon } from './Icons'

type Props = {
  reminders: Reminder[]
  busyKey: string | null
  saveError: boolean
  onAnswer: (reminder: Reminder, action: DoseAction) => void
}

/**
 * F1: reminder for the first due dose, as a panel at the bottom over a dimmed screen,
 * tinted with the colour of its part of the day. Spec: docs/specs/F1.md, docs/specs/DESIGN.md
 */
export default function ReminderBanner({ reminders, busyKey, saveError, onAnswer }: Props) {
  const { t, lang } = useI18n()
  const demo = useDemoSpeed()
  const alerted = useRef(new Set<string>())
  const takeRef = useRef<HTMLButtonElement>(null)
  const current = reminders[0]

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

  // Keyboard and screen-reader users land on the main answer.
  const currentKey = current?.dose.key
  useEffect(() => {
    if (currentKey) takeRef.current?.focus()
  }, [currentKey])

  if (!current) return null
  const { dose, stage } = current
  const { med } = dose
  const strength = strengthText(t, med.strengthValue, med.strengthUnit)
  const busy = busyKey === dose.key
  const part = t(`partIn.${dose.part}` as MessageKey)

  return (
    <div className="sheet-backdrop">
      <section
        className={`sheet tint--${dose.part}${stage === 'followUp' ? ' sheet--followup' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reminder-title"
        aria-describedby="reminder-dose"
        data-stage={stage}
      >
        <div className="sheet-head">
          <PartIcon part={dose.part} size={24} />
          <p id="reminder-title" className="sheet-title">
            {stage === 'followUp' ? t('rem.followUp') : t('rem.title', { part })}
          </p>
          {reminders.length > 1 && (
            <span className="sheet-count">{t('rem.count', { n: 1, total: reminders.length })}</span>
          )}
        </div>
        <div id="reminder-dose">
          <p className="big-time" dir="ltr">
            {dose.time}
          </p>
          {dose.anchor && <p className="anchor-tag">{anchorLabel(t, dose.anchor)}</p>}
          {med.photoUrl && (
            <img className="pill-photo pill-photo--sheet" src={med.photoUrl} alt={t('photo.alt', { name: med.name })} />
          )}
          <p className="sheet-name">
            {med.name}
            {strength && ` ${strength}`}
          </p>
          <p className="sheet-amount">{amountText(t, med.form, med.amount)}</p>
        </div>
        {saveError && (
          <div className="alert" role="alert">
            <p>{t('db.saveFailed')}</p>
          </div>
        )}
        <button
          ref={takeRef}
          type="button"
          className="btn-primary btn-take-big"
          disabled={busy}
          onClick={() => onAnswer(current, 'taken')}
        >
          <CheckIcon size={28} />
          {t('hero.take')}
        </button>
        <button type="button" className="btn-secondary btn-on-tint" disabled={busy} onClick={() => onAnswer(current, 'snoozed')}>
          {t(demo ? 'rem.snoozeSec' : 'rem.snoozeMin', { n: SNOOZE_MIN })}
        </button>
        <button type="button" className="btn-link" disabled={busy} onClick={() => onAnswer(current, 'skipped')}>
          {t('rem.skip')}
        </button>
      </section>
    </div>
  )
}
