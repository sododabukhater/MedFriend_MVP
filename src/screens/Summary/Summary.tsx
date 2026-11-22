import type { User } from '@supabase/supabase-js'
import LanguageSwitch from '../../components/LanguageSwitch'
import Logo from '../../components/Logo'
import ProfileForm from '../../components/ProfileForm'
import { useI18n } from '../../i18n'
import { profileOf } from '../../lib/profile'
import { buildSummary, pctText, summaryText, whatsAppLink } from '../../lib/summary'
import { ammanDate } from '../../lib/time'
import { useHistory } from '../../lib/useHistory'
import type { Medication } from '../../storage/medications'

// F9: one-page summary for the doctor: who, what, how regularly. Print / Save as PDF and WhatsApp.
// Laid out as a document (A4 when printed); the logo sits in the top-right corner. Spec: docs/specs/F9.md

type Props = {
  user: User
  meds: Medication[]
  onBack: () => void
}

export default function Summary({ user, meds, onBack }: Props) {
  const { t, lang } = useI18n()
  const { now, ready, loadError, reload, all } = useHistory(meds)
  const profile = profileOf(user)
  const s = buildSummary(t, lang, profile, meds, all, now)
  const thisYear = Number(ammanDate(now).slice(0, 4))

  return (
    <main className="screen summary-screen">
      <div className="top-bar top-bar--split no-print">
        <button type="button" className="btn-text" onClick={onBack}>
          {t('add.back')}
        </button>
        <LanguageSwitch />
      </div>

      {!profile.name && (
        <div className="group no-print">
          <p className="hint">{t('summary.needName')}</p>
          <ProfileForm profile={profile} thisYear={thisYear} />
        </div>
      )}

      {loadError && (
        <div className="alert no-print" role="alert">
          <p>{t('db.loadFailed')}</p>
          <button type="button" className="btn-secondary" onClick={reload}>
            {t('db.retry')}
          </button>
        </div>
      )}

      <article className="doc" data-testid="summary-page">
        <header className="doc-head">
          <div className="doc-title-block">
            <h1 className="doc-title">{t('summary.title')}</h1>
            <p className="doc-date">{s.date}</p>
          </div>
          <div className="doc-brand">
            <Logo size={44} />
            <div className="doc-brand-name">
              <span lang="en">Med Friend</span>
              <span lang="ar">صديقك الطبي</span>
            </div>
          </div>
        </header>

        <dl className="doc-patient">
          <div>
            <dt>{t('summary.label.patient')}</dt>
            <dd data-testid="patient-name">{s.name || t('summary.notSet')}</dd>
          </div>
          <div>
            <dt>{t('summary.label.born')}</dt>
            <dd>{s.born ?? t('summary.notSet')}</dd>
          </div>
        </dl>

        <section aria-labelledby="sum-meds">
          <h2 id="sum-meds" className="doc-h2">
            {t('summary.meds')}
          </h2>
          {s.meds.length === 0 ? (
            <p>{t('summary.noMeds')}</p>
          ) : (
            <table className="doc-table doc-meds">
              <thead>
                <tr>
                  <th scope="col">{t('summary.col.medicine')}</th>
                  <th scope="col">{t('summary.col.amount')}</th>
                  <th scope="col">{t('summary.col.often')}</th>
                  <th scope="col">{t('summary.col.times')}</th>
                </tr>
              </thead>
              <tbody>
                {s.meds.map((m, i) => (
                  <tr key={i}>
                    <th scope="row">{m.name}</th>
                    <td>{m.amount}</td>
                    <td>{m.often}</td>
                    <td dir="ltr" className="doc-times">
                      {m.times}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="sum-taken">
          <h2 id="sum-taken" className="doc-h2">
            {t('summary.taken')}
          </h2>
          {ready ? (
            <>
              <div className="doc-stats">
                {s.periods.map((p) => (
                  <div key={p.label} className="doc-stat">
                    <span className="doc-stat-label">{p.label}</span>
                    <span className="doc-stat-pct">{pctText(t, p.stats)}</span>
                    <span className="doc-stat-detail">
                      {p.stats.pct === null
                        ? t('progress.noData')
                        : t('summary.ofDoses', { n: p.stats.taken, total: p.stats.counted })}
                    </span>
                  </div>
                ))}
              </div>
              {s.perMed.length > 0 && (
                <table className="doc-table doc-permed">
                  <caption>{t('summary.perMed')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('summary.col.medicine')}</th>
                      <th scope="col">{t('summary.col.taken')}</th>
                      <th scope="col">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.perMed.map((m, i) => (
                      <tr key={i}>
                        <th scope="row">{m.name}</th>
                        <td>
                          {m.stats.pct === null ? (
                            <span className="doc-bar-text">{t('progress.noData')}</span>
                          ) : (
                            <span className="doc-bar-cell">
                              <span className="doc-bar" aria-hidden="true">
                                <span style={{ inlineSize: `${m.stats.pct}%` }} />
                              </span>
                              <span className="doc-bar-text">
                                {t('summary.ofDoses', { n: m.stats.taken, total: m.stats.counted })}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="doc-pct">{pctText(t, m.stats)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p className="hint">{t('summary.loading')}</p>
          )}
        </section>

        <footer className="doc-footer">{t('summary.footer')}</footer>
      </article>

      <div className="summary-actions no-print">
        <button type="button" className="btn-primary" disabled={!ready} onClick={() => window.print()}>
          {t('summary.print')}
        </button>
        <a
          className={`btn-secondary btn-wide btn-link-button${ready ? '' : ' is-disabled'}`}
          href={whatsAppLink(summaryText(t, s))}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!ready}
          onClick={(e) => {
            if (!ready) e.preventDefault()
          }}
        >
          {t('summary.whatsapp')}
        </a>
      </div>
    </main>
  )
}
