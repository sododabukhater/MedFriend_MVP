import { useCallback, useEffect, useState } from 'react'
import LanguageSwitch from './components/LanguageSwitch'
import MedicationCard from './components/MedicationCard'
import ReminderBanner from './components/ReminderBanner'
import TabBar, { type Tab } from './components/TabBar'
import { useI18n, type MessageKey } from './i18n'
import { useAuth } from './lib/useAuth'
import { useDoses } from './lib/useDoses'
import AddMedication from './screens/AddMedication/AddMedication'
import {
  ForgotScreen,
  LoginScreen,
  NewPasswordScreen,
  SignUpScreen,
  type AuthScreen,
} from './screens/Auth/AuthScreens'
import Progress from './screens/Progress/Progress'
import Settings from './screens/Settings/Settings'
import Today from './screens/Today/Today'
import { deleteMedication, listMedications, type Medication } from './storage/medications'

type MedsState = { status: 'loading' } | { status: 'ready'; meds: Medication[] } | { status: 'error' }

export default function App() {
  const { t } = useI18n()
  const { state: auth, finishRecovery } = useAuth()
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login')
  const [tab, setTab] = useState<Tab>('today')
  const [adding, setAdding] = useState(false)
  const [meds, setMeds] = useState<MedsState>({ status: 'loading' })
  const [notice, setNotice] = useState<MessageKey | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const userId = auth.status === 'signedIn' ? auth.user.id : null
  // Today's doses and reminders (shared by the Today tab and the reminder banner).
  const doses = useDoses(meds.status === 'ready' ? meds.meds : null, userId)

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

  // Back to a clean start after logout; after login the app opens on Today.
  useEffect(() => {
    if (auth.status === 'signedOut') {
      setAuthScreen('login')
      setTab('today')
      setAdding(false)
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

  function startAdding() {
    setNotice(null)
    setAdding(true)
  }

  function signedInScreen() {
    if (auth.status !== 'signedIn') return null
    if (tab === 'today') {
      return (
        <>
          {meds.status === 'error' && (
            <div className="alert alert--top" role="alert">
              <p>{t('db.loadFailed')}</p>
              <button type="button" className="btn-secondary" onClick={load}>
                {t('db.retry')}
              </button>
            </div>
          )}
          {meds.status === 'ready' && <Today api={doses} onAdd={startAdding} />}
        </>
      )
    }
    if (tab === 'progress') {
      return meds.status === 'ready' ? <Progress meds={meds.meds} /> : null
    }
    if (tab === 'settings') {
      return <Settings email={auth.user.email ?? ''} onTriggerNext={doses.triggerNext} />
    }
    return (
      <main className="screen">
        <div className="top-bar">
          <LanguageSwitch />
        </div>

        <header className="app-header">
          <p className="app-title app-title--small">{t('app.name')}</p>
          <h1 className="question">{t('home.myMeds')}</h1>
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
          <button type="button" className="btn-primary" onClick={startAdding}>
            <span aria-hidden="true" className="btn-icon">
              +
            </span>
            {t('home.addMedication')}
          </button>
        </footer>
      </main>
    )
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
            setTab('meds')
          }}
        />
      )
    }
    if (adding) {
      return (
        <AddMedication
          onCancel={() => setAdding(false)}
          onSaved={(med) => {
            if (meds.status === 'ready') setMeds({ status: 'ready', meds: [...meds.meds, med] })
            else load()
            setNotice('home.saved')
            setError(null)
            setAdding(false)
            setTab('meds') // shows the new card with "Medication saved"
          }}
        />
      )
    }
    return (
      <>
        <ReminderBanner
          reminders={doses.reminders}
          busyKey={doses.busyKey}
          onAnswer={(reminder, action) => doses.answer(reminder.dose, action)}
        />
        {signedInScreen()}
        <TabBar tab={tab} onChange={setTab} />
      </>
    )
  }

  return (
    // data-auth lets tests wait until the login state is known.
    <div className="phone-frame" data-auth={auth.status}>
      {content()}
    </div>
  )
}
