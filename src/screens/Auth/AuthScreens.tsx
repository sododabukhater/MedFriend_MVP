import { useState, type FormEvent, type ReactNode } from 'react'
import LanguageSwitch from '../../components/LanguageSwitch'
import { useI18n, type MessageKey } from '../../i18n'
import {
  authErrorKey,
  DEMO_ACCOUNT,
  logIn,
  looksLikeEmail,
  MIN_PASSWORD,
  sendPasswordReset,
  setNewPassword,
  signUp,
} from '../../lib/auth'

// Login, Sign up, Forgot password and New password. Spec: docs/specs/AUTH.md
export type AuthScreen = 'login' | 'signup' | 'forgot'

type Go = (screen: AuthScreen) => void

function Layout({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n()
  return (
    <main className="screen">
      <div className="top-bar">
        <LanguageSwitch />
      </div>
      <header className="app-header">
        <p className="app-title app-title--small">{t('app.name')}</p>
        <h1 className="question">{title}</h1>
      </header>
      {children}
    </main>
  )
}

function Field(props: {
  id: string
  label: string
  type: 'email' | 'password'
  value: string
  onChange: (value: string) => void
  autoComplete: string
  autoFocus?: boolean
}) {
  return (
    <>
      <label className="field-label" htmlFor={props.id}>
        {props.label}
      </label>
      <input
        id={props.id}
        className="text-input"
        type={props.type}
        dir="ltr"
        value={props.value}
        autoComplete={props.autoComplete}
        autoFocus={props.autoFocus}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </>
  )
}

function ErrorBox({ error }: { error: MessageKey | null }) {
  const { t } = useI18n()
  if (!error) return null
  return (
    <div className="alert" role="alert">
      <p>{t(error)}</p>
    </div>
  )
}

/** Runs an auth action with a busy flag and a friendly error message. */
function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<MessageKey | null>(null)
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      console.error('Auth action failed', err)
      setError(authErrorKey(err))
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

export function LoginScreen({ go }: { go: Go }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, setError, run } = useSubmit()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!looksLikeEmail(email)) return setError('auth.err.email')
    if (!password) return setError('auth.err.noPassword')
    run(() => logIn(email, password))
  }

  return (
    <Layout title={t('auth.login.title')}>
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field id="email" label={t('auth.email')} type="email" value={email} onChange={setEmail} autoComplete="email" autoFocus />
        <Field id="password" label={t('auth.password')} type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <button type="button" className="btn-text auth-link-start" onClick={() => go('forgot')}>
          {t('auth.login.forgot')}
        </button>
        <ErrorBox error={error} />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? t('auth.wait') : t('auth.login.submit')}
        </button>
      </form>

      <div className="auth-alt">
        <p>{t('auth.login.noAccount')}</p>
        <button type="button" className="btn-secondary btn-wide" onClick={() => go('signup')}>
          {t('auth.signup.title')}
        </button>
        <button
          type="button"
          className="btn-secondary btn-wide"
          disabled={busy}
          onClick={() => run(() => logIn(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password))}
        >
          {t('auth.demo')}
        </button>
        <p className="hint">{t('auth.demo.note')}</p>
      </div>
    </Layout>
  )
}

export function SignUpScreen({ go }: { go: Go }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [checkEmail, setCheckEmail] = useState(false)
  const { busy, error, setError, run } = useSubmit()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!looksLikeEmail(email)) return setError('auth.err.email')
    if (password.length < MIN_PASSWORD) return setError('auth.err.short')
    if (password !== again) return setError('auth.err.mismatch')
    run(async () => {
      const loggedIn = await signUp(email, password)
      // Normally logged in at once. If email confirmation is ever turned on, say so.
      if (!loggedIn) setCheckEmail(true)
    })
  }

  if (checkEmail) {
    return (
      <Layout title={t('auth.signup.title')}>
        <p role="status">{t('auth.signup.checkEmail')}</p>
        <button type="button" className="btn-secondary btn-wide" onClick={() => go('login')}>
          {t('auth.backToLogin')}
        </button>
      </Layout>
    )
  }

  return (
    <Layout title={t('auth.signup.title')}>
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field id="email" label={t('auth.email')} type="email" value={email} onChange={setEmail} autoComplete="email" autoFocus />
        <Field id="password" label={t('auth.newPassword', { n: MIN_PASSWORD })} type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <Field id="again" label={t('auth.passwordAgain')} type="password" value={again} onChange={setAgain} autoComplete="new-password" />
        <ErrorBox error={error} />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? t('auth.wait') : t('auth.signup.submit')}
        </button>
      </form>
      <div className="auth-alt">
        <p>{t('auth.signup.haveAccount')}</p>
        <button type="button" className="btn-secondary btn-wide" onClick={() => go('login')}>
          {t('auth.login.title')}
        </button>
      </div>
    </Layout>
  )
}

export function ForgotScreen({ go }: { go: Go }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const { busy, error, setError, run } = useSubmit()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!looksLikeEmail(email)) return setError('auth.err.email')
    run(async () => {
      await sendPasswordReset(email)
      setSent(true)
    })
  }

  return (
    <Layout title={t('auth.forgot.title')}>
      {sent ? (
        // Same message whether or not the account exists (does not reveal who has an account).
        <p role="status" className="notice">
          {t('auth.forgot.sent')}
        </p>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          <p className="hint">{t('auth.forgot.hint')}</p>
          <Field id="email" label={t('auth.email')} type="email" value={email} onChange={setEmail} autoComplete="email" autoFocus />
          <ErrorBox error={error} />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? t('auth.wait') : t('auth.forgot.submit')}
          </button>
        </form>
      )}
      <div className="auth-alt">
        <button type="button" className="btn-secondary btn-wide" onClick={() => go('login')}>
          {t('auth.backToLogin')}
        </button>
      </div>
    </Layout>
  )
}

/** Shown after the patient opens the reset link from the email. */
export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const { busy, error, setError, run } = useSubmit()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError('auth.err.short')
    if (password !== again) return setError('auth.err.mismatch')
    run(async () => {
      await setNewPassword(password)
      onDone()
    })
  }

  return (
    <Layout title={t('auth.reset.title')}>
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field id="password" label={t('auth.newPassword', { n: MIN_PASSWORD })} type="password" value={password} onChange={setPassword} autoComplete="new-password" autoFocus />
        <Field id="again" label={t('auth.passwordAgain')} type="password" value={again} onChange={setAgain} autoComplete="new-password" />
        <ErrorBox error={error} />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? t('auth.wait') : t('auth.reset.submit')}
        </button>
      </form>
    </Layout>
  )
}
