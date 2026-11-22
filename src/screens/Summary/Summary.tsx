import type { User } from '@supabase/supabase-js'
import LanguageSwitch from '../../components/LanguageSwitch'
import ProfileForm from '../../components/ProfileForm'
import { useI18n } from '../../i18n'
import { profileOf } from '../../lib/profile'
import { buildSummary, summaryText, whatsAppLink } from '../../lib/summary'
import { ammanDate } from '../../lib/time'
import { useHistory } from '../../lib/useHistory'
import type { Medication } from '../../storage/medications'

// F9: one-page summary for the doctor: who, what, how regularly. Print / Save as PDF and WhatsApp.
// Spec: docs/specs/F9.md

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

      <article className="box summary" data-testid="summary-page">
        <header className="summary-head">
          <h1 className="summary-title">{t('summary.title')}</h1>
          {s.patient && <p className="summary-patient">{s.patient}</p>}
          {s.born && <p>{s.born}</p>}
          <p className="summary-date">{s.date}</p>
        </header>

        <section aria-labelledby="sum-meds">
          <h2 id="sum-meds" className="summary-h2">
            {t('summary.meds')}
          </h2>
          {s.meds.length === 0 ? (
            <p>{t('summary.noMeds')}</p>
          ) : (
            <ul className="summary-list">
              {s.meds.map((m, i) => (
                <li key={i}>
                  <strong>{m.name}</strong>
                  <span className="summary-detail">{m.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="sum-taken">
          <h2 id="sum-taken" className="summary-h2">
            {t('summary.taken')}
          </h2>
          {ready ? (
            <>
              {s.periods.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {s.perMed.length > 0 && (
                <>
                  <h3 className="summary-h3">{t('summary.perMed')}</h3>
                  <ul className="summary-list summary-pct">
                    {s.perMed.map((m, i) => (
                      <li key={i}>
                        <span>{m.name}</span>
                        <strong>{m.pct}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="hint">{t('summary.loading')}</p>
          )}
        </section>

        <p className="summary-footer">{t('summary.footer')}</p>
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
