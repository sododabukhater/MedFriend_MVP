import { useCallback, useEffect, useState } from 'react'
import LanguageSwitch from './components/LanguageSwitch'
import MedicationCard from './components/MedicationCard'
import { useI18n, type MessageKey } from './i18n'
import { logOut } from './lib/auth'
import { useAuth } from './lib/useAuth'
import AddMedication from './screens/AddMedication/AddMedication'
import {
  ForgotScreen,
  LoginScreen,
  NewPasswordScreen,
  SignUpScreen,
  type AuthScreen,
} from './screens/Auth/AuthScreens'
import { deleteMedication, listMedications, type Medication } from './storage/medications'

type MedsState = { status: 'loading' } | { status: 'ready'; meds: Medication[] } | { status: 'error' }

export default function App() {
  const { t } = useI18n()
  const { state: auth, finishRecovery } = useAuth()
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login')
  const [screen, setScreen] = useState<'home' | 'add'>('home')
  const [meds, setMeds] = useState<MedsState>({ status: 'loading' })
  const [notice, setNotice] = useState<MessageKey | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const userId = auth.status === 'signedIn' ? auth.user.id : null

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

  // Load this account's medicines after login (and again if a different account logs in).
  useEffect(() => {
    if (userId) load()
  }, [userId, load])

  // Back to a clean start after logout.
  useEffect(() => {
    if (auth.status === 'signedOut') {
      setAuthScreen('login')
      setScreen('home')
      setMeds({ status: 'loading' })
      setError(null)
    }
  }, [auth.status])

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

  function content() {
    if (auth.status === 'loading') return null
    if (auth.status === 'signedOut') {
      if (authScreen === 'signup') return <SignUpScreen go={setAuthScreen} />
      if (authScreen === 'forgot') return <ForgotScreen go={setAuthScreen} />
      return <LoginScreen go={setAuthScreen} />
    }
    if (auth.recovery) {
      return (
        <NewPasswordScreen
          onDone={() => {
            finishRecovery()
            setNotice('auth.reset.done')
          }}
        />
      )
    }
    if (screen === 'add') {
      return (
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
      )
    }
    return (
      <main className="screen">
        <div className="top-bar top-bar--split">
          <button type="button" className="btn-text" onClick={() => logOut()}>
            {t('auth.logout')}
          </button>
          <LanguageSwitch />
        </div>

        <header className="app-header">
          <h1 className="app-title">{t('app.name')}</h1>
          <p className="app-tagline">{t('home.tagline')}</p>
          <p className="signed-in-as">
            {t('auth.signedInAs')} <span dir="ltr">{auth.user.email}</span>
          </p>
        </header>

        {meds.status === 'error' && (
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
    )
  }

  return (
    // data-auth lets tests wait until the login state is known.
    <div className="phone-frame" data-auth={auth.status}>
      {content()}
    </div>
  )
}
