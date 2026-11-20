import { t } from './i18n'

export default function App() {
  return (
    <div className="phone-frame">
      <main className="screen">
        <header className="app-header">
          <h1 className="app-title">{t('app.name')}</h1>
          <p className="app-tagline">{t('home.tagline')}</p>
        </header>

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
