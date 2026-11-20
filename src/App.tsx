import { useCallback, useEffect, useState } from 'react'
import LanguageSwitch from './components/LanguageSwitch'
import MedicationCard from './components/MedicationCard'
import { useI18n, type MessageKey } from './i18n'
import { useSession } from './lib/useSession'
import AddMedication from './screens/AddMedication/AddMedication'
import { deleteMedication, listMedications, type Medication } from './storage/medications'

type MedsState = { status: 'loading' } | { status: 'ready'; meds: Medication[] } | { status: 'error' }

export default function App() {
  const { t } = useI18n()
  const { state, retry } = useSession()
  const [screen, setScreen] = useState<'home' | 'add'>('home')
  const [meds, setMeds] = useState<MedsState>({ status: 'loading' })
  const [notice, setNotice] = useState<MessageKey | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)

  const load = useCallback(() => {
    setMeds({ status: 'loading' })
    listMedications().then(
      (list) => setMeds({ status: 'ready', meds: list }),
      (err: unknown) => {
        console.error('Loading medications failed', err)
        setMeds({ status: 'error' })
      },
    )
  }, [])

  useEffect(() => {
    if (state.status === 'ready') load()
  }, [state.status, load])

  // The confirmation message disappears after a few seconds.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  async function handleDelete(med: Medication) {
    setError(null)
    try {
      await deleteMedication(med.id)
      setMeds((s) => (s.status === 'ready' ? { ...s, meds: s.meds.filter((m) => m.id !== med.id) } : s))
      setNotice('home.deleted')
    } catch (err) {
      console.error('Deleting medication failed', err)
      setError('db.deleteFailed')
    }
  }

  return (
    // data-session lets tests wait until the anonymous Supabase session is ready.
    <div className="phone-frame" data-session={state.status}>
      {screen === 'add' ? (
        <AddMedication
          onCancel={() => setScreen('home')}
          onSaved={(med) => {
            if (meds.status === 'ready') setMeds({ status: 'ready', meds: [...meds.meds, med] })
            else load()
            setNotice('home.saved')
            setError(null)
            setScreen('home')
          }}
        />
      ) : (
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
          {state.status === 'ready' && meds.status === 'error' && (
            <div className="alert" role="alert">
              <p>{t('db.loadFailed')}</p>
              <button type="button" className="btn-secondary" onClick={load}>
                {t('db.retry')}
              </button>
            </div>
          )}
          {error && (
            <div className="alert" role="alert">
              <p>{t(error)}</p>
            </div>
          )}
          <div role="status" className={notice ? 'notice' : 'visually-hidden'}>
            {notice ? t(notice) : ''}
          </div>

          {meds.status === 'ready' && meds.meds.length > 0 ? (
            <section className="med-section">
              <h2 className="section-title">{t('home.myMeds')}</h2>
              <ul className="med-list">
                {meds.meds.map((med) => (
                  <MedicationCard key={med.id} med={med} onDelete={handleDelete} />
                ))}
              </ul>
            </section>
          ) : (
            <section className="home-body">
              {meds.status === 'ready' && <p className="empty-state">{t('home.empty')}</p>}
            </section>
          )}

          <footer className="primary-action">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setNotice(null)
                setScreen('add')
              }}
            >
              <span aria-hidden="true" className="btn-icon">
                +
              </span>
              {t('home.addMedication')}
            </button>
          </footer>
        </main>
      )}
    </div>
  )
}
