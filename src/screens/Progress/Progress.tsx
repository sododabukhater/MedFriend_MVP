import { useEffect, useMemo, useState } from 'react'
import ScreenHeader from '../../components/ScreenHeader'
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

// F8: adherence % (7 or 30 days, one switch) and the dose log. Specs: docs/specs/F8.md, docs/specs/DESIGN.md

type Period = 7 | 30

export default function Progress({ meds }: { meds: Medication[] }) {
  const { t, lang } = useI18n()
  const minute = minuteMs(useDemoSpeed())
  const [now] = useState(() => new Date())
  const [logs, setLogs] = useState<DoseLog[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [period, setPeriod] = useState<Period>(SHORT_DAYS)
  const [showLog, setShowLog] = useState(false)

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
  const shown = period === HISTORY_DAYS ? all : lastDays(all, now, period)
  const overall = stats(shown)

  // Taken / counted for each day of the period, oldest first.
  const today = ammanDate(now)
  const perDay = Array.from({ length: period }, (_, i) => {
    const date = addDays(today, -(period - 1 - i))
    return { date, s: stats(shown.filter((d) => d.date === date)) }
  })

  // Dose log grouped by day, newest first.
  const days: { date: string; doses: LoggedDose[] }[] = []
  for (const d of shown) {
    const last = days[days.length - 1]
    if (last?.date === d.date) last.doses.push(d)
    else days.push({ date: d.date, doses: [d] })
  }

  return (
    <main className="screen">
      <ScreenHeader title={t('progress.title')} />

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
          <div className="segmented" role="group" aria-label={t('progress.period')}>
            {([SHORT_DAYS, HISTORY_DAYS] as Period[]).map((p) => (
              <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>
                {t(p === SHORT_DAYS ? 'progress.last7' : 'progress.last30')}
              </button>
            ))}
          </div>

          <section className="box overall" data-testid="overall">
            <p className="overall-sentence">
              {overall.pct === null
                ? t('progress.noData')
                : t('progress.sentence', { n: overall.taken, total: overall.counted, pct: overall.pct })}
            </p>
            {overall.pct !== null && (
              <div className={`days days--${period}`} role="list" aria-label={t('progress.days')}>
                {perDay.map(({ date, s }) => (
                  <div key={date} className={`day${date === today ? ' day--today' : ''}`} role="listitem">
                    <div className="day-track" aria-hidden="true">
                      <div className="day-fill" style={{ blockSize: `${s.pct ?? 0}%` }} />
                    </div>
                    {period === SHORT_DAYS && (
                      <span className="day-label" aria-hidden="true">
                        {date === today ? t('progress.today') : Number(date.slice(8))}
                      </span>
                    )}
                    <span className="visually-hidden">
                      {longDateOf(date, lang)}: {t('progress.dayValue', { n: s.taken, total: s.counted })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {meds.length > 0 && (
            <ul className="box pm-list" aria-label={t('progress.perMed')}>
              {meds.map((med) => {
                const s = stats(shown.filter((d) => d.med.id === med.id))
                const strength = strengthText(t, med.strengthValue, med.strengthUnit)
                return (
                  <li key={med.id} className="pm" aria-label={med.name} data-testid={`med-${med.name}`}>
                    <MedBar name={strength ? `${med.name} ${strength}` : med.name} s={s} />
                    {s.taken > 0 && <p className="pm-detail">{t('progress.onTime', { n: s.onTime, total: s.taken })}</p>}
                  </li>
                )
              })}
            </ul>
          )}

          <button type="button" className="btn-secondary btn-wide" aria-expanded={showLog} onClick={() => setShowLog(!showLog)}>
            {t(showLog ? 'progress.hideAll' : 'progress.seeAll')}
          </button>

          {showLog && (
            <section className="log" aria-labelledby="log-title">
              <h2 id="log-title" className="section-title">
                {t('progress.log')}
              </h2>
              {days.length === 0 && <p className="hint">{t('progress.noData')}</p>}
              {days.map(({ date, doses }) => (
                <div key={date} className="log-day">
                  <h3 className="log-date">{longDateOf(date, lang)}</h3>
                  <ul className="box log-list">
                    {doses.map((d) => (
                      <li key={`${d.med.id}@${d.scheduledAt.getTime()}`} className={`log-item log-item--${d.status}`}>
                        <span dir="ltr" className="log-time">
                          {d.time}
                        </span>
                        <span className="log-name">{d.med.name}</span>
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
            </section>
          )}
        </>
      )}
    </main>
  )
}

function MedBar({ name, s }: { name: string; s: Stats }) {
  const { t } = useI18n()
  return (
    <>
      <div className="pm-top">
        <span className="pm-name">{name}</span>
        <strong className="bar-value">{s.pct === null ? t('progress.noDataShort') : `${s.pct}%`}</strong>
      </div>
      <div className="bar" aria-hidden="true">
        <div className="bar-fill" style={{ inlineSize: `${s.pct ?? 0}%` }} />
      </div>
    </>
  )
}
