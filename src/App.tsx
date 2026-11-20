import LanguageSwitch from './components/LanguageSwitch'
import { useI18n } from './i18n'
import { useSession } from './lib/useSession'

export default function App() {
  const { t } = useI18n()
  const { state, retry } = useSession()
  return (
    // data-session lets tests wait until the anonymous Supabase session is ready.
    <div className="phone-frame" data-session={state.status}>
      <main className="screen">
        <div className="top-bar">
          <LanguageSwitch />
        </div>

        <header className="app-header">
          <h1 className="app-title">{t('app.name')}</h1>
          <p className="app-tagline">{t('home.tagline')}</p>
        </header>

        {state.status === 'error' && (
          <div className="alert" role="alert">
            <p>{t('db.unreachable')}</p>
            <button type="button" className="btn-secondary" onClick={retry}>
              {t('db.retry')}
            </button>
          </div>
        )}

        <section className="home-body">
          <p className="empty-state">{t('home.empty')}</p>
        </section>

        <footer className="primary-action">
          {/* Placeholder: the Add medication flow arrives with F6-lite. */}
          <button type="button" className="btn-primary">
            <span aria-hidden="true" className="btn-icon">+</span>
            {t('home.addMedication')}
          </button>
        </footer>
      </main>
    </div>
  )
}
