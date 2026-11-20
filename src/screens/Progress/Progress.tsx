import { useEffect, useMemo, useState } from 'react'
import LanguageSwitch from '../../components/LanguageSwitch'
import { useI18n } from '../../i18n'
import {
  countedDoses,
  HISTORY_DAYS,
  lastDays,
  SHORT_DAYS,
  stats,
  type LoggedDose,
  type Stats,
} from '../../lib/adherence'
import { strengthText } from '../../lib/format'
import { minuteMs, useDemoSpeed } from '../../lib/settings'
import { addDays, ammanDate, ammanInstant, ammanTime, longDateOf, nextDate } from '../../lib/time'
import { listDoseLogs, type DoseLog } from '../../storage/doseLogs'
import type { Medication } from '../../storage/medications'

// F8: adherence % (7 and 30 days) and the dose log. Spec: docs/specs/F8.md

export default function Progress({ meds }: { meds: Medication[] }) {
  const { t, lang } = useI18n()
  const minute = minuteMs(useDemoSpeed())
  const [now] = useState(() => new Date())
  const [logs, setLogs] = useState<DoseLog[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [showAll, setShowAll] = useState(false)

  function load() {
    setLoadError(false)
    const today = ammanDate(now)
    listDoseLogs(ammanInstant(addDays(today, -(HISTORY_DAYS - 1)), '00:00'), ammanInstant(nextDate(today), '00:00')).then(
      setLogs,
      (err: unknown) => {
        console.error('Loading history failed', err)
        setLoadError(true)
      },
    )
  }
  // Loaded each time the tab opens, so a dose just taken on Today shows here.
  useEffect(() => load(), [])

  const all = useMemo(() => (logs ? countedDoses(meds, logs, now, minute) : []), [meds, logs, now, minute])
  const week = lastDays(all, now, SHORT_DAYS)
  const shown = showAll ? all : week

  // Dose log grouped by day, newest first.
  const days: { date: string; doses: LoggedDose[] }[] = []
  for (const d of shown) {
    const last = days[days.length - 1]
    if (last?.date === d.date) last.doses.push(d)
    else days.push({ date: d.date, doses: [d] })
  }

  return (
    <main className="screen">
      <div className="top-bar">
        <LanguageSwitch />
      </div>
      <header className="app-header">
        <p className="app-title app-title--small">{t('app.name')}</p>
        <h1 className="question">{t('progress.title')}</h1>
      </header>

      {loadError && (
        <div className="alert" role="alert">
          <p>{t('db.loadFailed')}</p>
          <button type="button" className="btn-secondary" onClick={load}>
            {t('db.retry')}
          </button>
        </div>
      )}

      {logs && (
        <>
          <section className="overall" aria-label={t('progress.overall')}>
            <Overall label={t('progress.last7')} s={stats(week)} testId="overall-7" />
            <Overall label={t('progress.last30')} s={stats(all)} testId="overall-30" />
          </section>

          {meds.length > 0 && (
            <section className="settings-group" aria-labelledby="per-med-title">
              <h2 id="per-med-title" className="section-title">
                {t('progress.perMed')}
              </h2>
              <ul className="med-list">
                {meds.map((med) => {
                  const mine = all.filter((d) => d.med.id === med.id)
                  const s7 = stats(lastDays(mine, now, SHORT_DAYS))
                  const s30 = stats(mine)
                  const strength = strengthText(t, med.strengthValue, med.strengthUnit)
                  return (
                    <li key={med.id} className="med-card" aria-label={med.name} data-testid={`med-${med.name}`}>
                      <h3 className="med-name">
                        {med.name}
                        {strength && <span className="med-strength"> {strength}</span>}
                      </h3>
                      <Bar label={t('progress.days7')} s={s7} />
                      <Bar label={t('progress.days30')} s={s30} />
                      {s30.taken > 0 && (
                        <p className="med-detail">{t('progress.onTime', { n: s30.onTime, total: s30.taken })}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section className="settings-group" aria-labelledby="log-title">
            <h2 id="log-title" className="section-title">
              {t('progress.log')}
            </h2>
            {days.length === 0 && <p className="hint">{t('progress.noData')}</p>}
            {days.map(({ date, doses }) => (
              <div key={date} className="log-day">
                <h3 className="log-date">{longDateOf(date, lang)}</h3>
                <ul className="log-list">
                  {doses.map((d) => (
                    <li key={`${d.med.id}@${d.scheduledAt.getTime()}`} className={`log-item log-item--${d.status}`}>
                      <span dir="ltr" className="log-time">
                        {d.time}
                      </span>{' '}
                      <span className="log-name">{d.med.name}</span> ·{' '}
                      <span className="log-status">
                        {d.status === 'taken'
                          ? t('status.taken', { time: ammanTime(d.recordedAt!) })
                          : t(d.status === 'skipped' ? 'status.skipped' : 'status.missed')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!showAll && all.length > week.length && (
              <button type="button" className="btn-secondary btn-wide" onClick={() => setShowAll(true)}>
                {t('progress.showAll', { n: HISTORY_DAYS })}
              </button>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function Overall({ label, s, testId }: { label: string; s: Stats; testId: string }) {
  const { t } = useI18n()
  return (
    <div className="overall-box" data-testid={testId}>
      <p className="overall-label">{label}</p>
      <p className="overall-pct">{s.pct === null ? '—' : `${s.pct}%`}</p>
      <p className="overall-detail">
        {s.pct === null ? t('progress.noData') : t('progress.taken', { n: s.taken, total: s.counted })}
      </p>
    </div>
  )
}

function Bar({ label, s }: { label: string; s: Stats }) {
  const { t } = useI18n()
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar" aria-hidden="true">
        <div className="bar-fill" style={{ inlineSize: `${s.pct ?? 0}%` }} />
      </div>
      <span className="bar-value">{s.pct === null ? t('progress.noDataShort') : `${s.pct}%`}</span>
    </div>
  )
}
