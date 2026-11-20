import { useCallback, useEffect, useState } from 'react'
import LanguageSwitch from '../../components/LanguageSwitch'
import { useI18n, type MessageKey } from '../../i18n'
import { dosesForDate, type Dose } from '../../lib/doses'
import { amountText, strengthText } from '../../lib/format'
import { ammanDate, ammanInstant, ammanTime, DAY_PARTS, longDate, nextDate } from '../../lib/time'
import { doseKey, listDoseLogs, markDose, undoDose, type DoseLog } from '../../storage/doseLogs'
import type { Medication } from '../../storage/medications'

// F2: today's doses grouped by time of day, with Taken / Skip / Undo. Spec: docs/specs/F2.md

type Props = {
  meds: Medication[]
  onAdd: () => void
}

/** The current time, updated every 30 seconds so "Due now" turns into "Missed" without a reload. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

export default function Today({ meds, onAdd }: Props) {
  const { t, lang } = useI18n()
  const now = useNow()
  const date = ammanDate(now)
  const [logs, setLogs] = useState<DoseLog[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoadError(false)
    listDoseLogs(ammanInstant(date, '00:00'), ammanInstant(nextDate(date), '00:00')).then(setLogs, (err: unknown) => {
      console.error('Loading dose log failed', err)
      setLoadError(true)
    })
  }, [date])

  // Load today's answers (again after midnight, when the date changes).
  useEffect(load, [load])

  async function answer(dose: Dose, action: 'taken' | 'skipped' | 'undo') {
    const key = doseKey(dose.med.id, dose.scheduledAt)
    setBusy(key)
    setSaveError(false)
    try {
      const others = (logs ?? []).filter((l) => doseKey(l.medicationId, l.scheduledAt) !== key)
      if (action === 'undo') {
        await undoDose(dose.med.id, dose.scheduledAt)
        setLogs(others)
      } else {
        const saved = await markDose(dose.med.id, dose.scheduledAt, action)
        setLogs([...others, saved])
      }
    } catch (err) {
      console.error('Saving dose failed', err)
      setSaveError(true)
    } finally {
      setBusy(null)
    }
  }

  const doses = logs ? dosesForDate(meds, logs, date, now) : []
  const taken = doses.filter((d) => d.status === 'taken').length

  return (
    <main className="screen">
      <div className="top-bar">
        <LanguageSwitch />
      </div>

      <header className="app-header">
        <h1 className="app-title">{t('today.title')}</h1>
        <p className="today-date">{longDate(now, lang)}</p>
        {doses.length > 0 && (
          <p className="today-summary" data-testid="summary">
            {t('today.summary', { taken, total: doses.length })}
          </p>
        )}
      </header>

      {loadError && (
        <div className="alert" role="alert">
          <p>{t('db.loadFailed')}</p>
          <button type="button" className="btn-secondary" onClick={load}>
            {t('db.retry')}
          </button>
        </div>
      )}
      {saveError && (
        <div className="alert" role="alert">
          <p>{t('db.saveFailed')}</p>
        </div>
      )}

      {logs && doses.length === 0 && (
        <section className="home-body today-empty">
          <p className="empty-state">{t('today.empty')}</p>
          <button type="button" className="btn-primary" onClick={onAdd}>
            <span aria-hidden="true" className="btn-icon">
              +
            </span>
            {t('home.addMedication')}
          </button>
        </section>
      )}

      {DAY_PARTS.map((part) => {
        const inPart = doses.filter((d) => d.part === part)
        if (inPart.length === 0) return null
        return (
          <section key={part} className="day-part" aria-labelledby={`part-${part}`}>
            <h2 id={`part-${part}`} className="day-part-title">
              {t(`part.${part}` as MessageKey)}
            </h2>
            <ul className="dose-list">
              {inPart.map((dose) => (
                <DoseRow
                  key={doseKey(dose.med.id, dose.scheduledAt)}
                  dose={dose}
                  busy={busy === doseKey(dose.med.id, dose.scheduledAt)}
                  onAnswer={(action) => answer(dose, action)}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}

function DoseRow({
  dose,
  busy,
  onAnswer,
}: {
  dose: Dose
  busy: boolean
  onAnswer: (action: 'taken' | 'skipped' | 'undo') => void
}) {
  const { t } = useI18n()
  const { med, time, status } = dose
  const answered = status === 'taken' || status === 'skipped'
  const strength = strengthText(t, med.strengthValue, med.strengthUnit)
  const label = `${time} ${med.name}`
  const statusText =
    status === 'taken'
      ? t('status.taken', { time: ammanTime(dose.log!.recordedAt) })
      : status === 'open'
        ? ''
        : t(`status.${status}` as MessageKey)

  return (
    <li className={`dose dose--${status}`} aria-label={label} data-status={status}>
      <div className="dose-head">
        <span className="dose-time" dir="ltr">
          {time}
        </span>
        <span className="dose-name">
          {med.name}
          {strength && <span className="med-strength"> {strength}</span>}
        </span>
      </div>
      <p className="dose-detail">
        {amountText(t, med.form, med.amount)}
        {statusText && (
          <>
            {' · '}
            <span className="dose-status">{statusText}</span>
          </>
        )}
      </p>
      <div className="dose-actions">
        {answered ? (
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            aria-label={t('dose.undoLabel', { name: med.name, time })}
            onClick={() => onAnswer('undo')}
          >
            {t('dose.undo')}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn-take"
              disabled={busy}
              aria-label={t('dose.takeLabel', { name: med.name, time })}
              onClick={() => onAnswer('taken')}
            >
              ✓ {t('dose.take')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              aria-label={t('dose.skipLabel', { name: med.name, time })}
              onClick={() => onAnswer('skipped')}
            >
              {t('dose.skip')}
            </button>
          </>
        )}
      </div>
    </li>
  )
}
