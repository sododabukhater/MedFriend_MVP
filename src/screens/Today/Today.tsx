import LanguageSwitch from '../../components/LanguageSwitch'
import { useI18n, type MessageKey } from '../../i18n'
import type { Dose } from '../../lib/doses'
import { amountText, strengthText } from '../../lib/format'
import { ammanTime, DAY_PARTS, longDate } from '../../lib/time'
import type { DoseAction, DosesApi } from '../../lib/useDoses'

// F2: today's doses grouped by time of day, with Taken / Skip / Undo. Spec: docs/specs/F2.md

type Props = {
  api: DosesApi
  onAdd: () => void
}

export default function Today({ api, onAdd }: Props) {
  const { t, lang } = useI18n()
  const { now, doses, ready, loadError, saveError, busyKey, answer, reload } = api
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
          <button type="button" className="btn-secondary" onClick={reload}>
            {t('db.retry')}
          </button>
        </div>
      )}
      {saveError && (
        <div className="alert" role="alert">
          <p>{t('db.saveFailed')}</p>
        </div>
      )}

      {ready && doses.length === 0 && (
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
                  key={dose.key}
                  dose={dose}
                  busy={busyKey === dose.key}
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

function DoseRow({ dose, busy, onAnswer }: { dose: Dose; busy: boolean; onAnswer: (action: DoseAction) => void }) {
  const { t } = useI18n()
  const { med, time, status } = dose
  const answered = status === 'taken' || status === 'skipped'
  const strength = strengthText(t, med.strengthValue, med.strengthUnit)
  const statusText =
    status === 'taken'
      ? t('status.taken', { time: ammanTime(dose.log!.recordedAt) })
      : status === 'snoozed'
        ? t('status.snoozed', { time: ammanTime(dose.snoozedUntil!) })
        : status === 'open'
          ? ''
          : t(`status.${status}` as MessageKey)

  return (
    <li className={`dose dose--${status}`} aria-label={`${time} ${med.name}`} data-status={status}>
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
