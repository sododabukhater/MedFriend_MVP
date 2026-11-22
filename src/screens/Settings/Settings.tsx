import { useState } from 'react'
import DaySettings from '../../components/DaySettings'
import ProfileForm from '../../components/ProfileForm'
import { usePrefs } from '../../lib/prefs'
import ScreenHeader from '../../components/ScreenHeader'
import { useI18n, type MessageKey } from '../../i18n'
import { DEMO_ACCOUNT, logOut } from '../../lib/auth'
import type { Profile } from '../../lib/profile'
import { setDemoSpeed, useDemoSpeed } from '../../lib/settings'
import { setReadAloud, useReadAloud } from '../../lib/speech'
import { ammanDate } from '../../lib/time'

// Settings: my details (F9), language, demo tools for the professor, account (Log out, Reset all data), disclaimer.
// Specs: docs/specs/F1.md, docs/specs/DESIGN.md

type Props = {
  email: string
  profile: Profile
  onTriggerNext: () => boolean
  /** Deletes all medicines and dose logs of this account. */
  onReset: () => Promise<void>
}

export default function Settings({ email, profile, onTriggerNext, onReset }: Props) {
  const { t, lang, setLang } = useI18n()
  const demo = useDemoSpeed()
  const readAloud = useReadAloud()
  const prefs = usePrefs()
  const [message, setMessage] = useState<MessageKey | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const isDemoAccount = email.toLowerCase() === DEMO_ACCOUNT.email

  async function reset() {
    setBusy(true)
    try {
      await onReset()
      setMessage('settings.reset.done')
      setConfirming(false)
    } catch (err) {
      console.error('Reset failed', err)
      setMessage('settings.reset.failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen">
      <ScreenHeader title={t('settings.title')} lang={false} />

      <section className="group" aria-labelledby="profile-title">
        <h2 id="profile-title" className="group-title">
          {t('profile.title')}
        </h2>
        <ProfileForm profile={profile} thisYear={Number(ammanDate(new Date()).slice(0, 4))} />
      </section>

      <section className="group" aria-labelledby="day-title">
        <h2 id="day-title" className="group-title">
          {t('settings.day.title')}
        </h2>
        <DaySettings prefs={prefs} />
      </section>

      <section className="group" aria-labelledby="lang-title">
        <h2 id="lang-title" className="group-title">
          {t('settings.language')}
        </h2>
        <div className="segmented" role="group" aria-labelledby="lang-title">
          <button type="button" lang="ar" aria-pressed={lang === 'ar'} onClick={() => setLang('ar')}>
            العربية
          </button>
          <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </section>

      <section className="group" aria-labelledby="reminders-title">
        <h2 id="reminders-title" className="group-title">
          {t('settings.reminders.title')}
        </h2>
        <div className="box">
          <div className="item">
            <span className="item-text">
              <span id="read-aloud-label">{t('settings.readAloud')}</span>
              <small className="item-hint">{t('settings.readAloud.short')}</small>
            </span>
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={readAloud}
              aria-labelledby="read-aloud-label"
              onClick={() => setReadAloud(!readAloud)}
            >
              <span className="switch-knob" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <section className="group" aria-labelledby="demo-title">
        <h2 id="demo-title" className="group-title">
          {t('settings.demo.title')}
        </h2>
        <div className="box">
          <div className="item">
            <span className="item-text">
              <span id="demo-speed-label">{t('settings.demoSpeed')}</span>
              <small className="item-hint">{t('settings.demoSpeed.short')}</small>
            </span>
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={demo}
              aria-labelledby="demo-speed-label"
              onClick={() => setDemoSpeed(!demo)}
            >
              <span className="switch-knob" aria-hidden="true" />
            </button>
          </div>
          <div className="item item--button">
            <button
              type="button"
              className="btn-secondary btn-wide"
              onClick={() => setMessage(onTriggerNext() ? 'settings.trigger.done' : 'settings.trigger.none')}
            >
              {t('settings.trigger')}
            </button>
          </div>
        </div>
        <p className="hint">{t('settings.demoSpeed.hint')}</p>
      </section>

      <section className="group" aria-labelledby="account-title">
        <h2 id="account-title" className="group-title">
          {t('settings.account')}
        </h2>
        <div className="box">
          <div className="item">
            <p className="signed-in-as">
              {t('auth.signedInAs')} <span dir="ltr">{email}</span>
            </p>
          </div>
          <div className="item item--button">
            <button type="button" className="btn-secondary btn-wide btn-quiet" onClick={() => logOut()}>
              {t('auth.logout')}
            </button>
          </div>
          <div className="item item--button">
            {isDemoAccount ? (
              <p className="hint">{t('settings.reset.demo')}</p>
            ) : confirming ? (
              <div className="confirm confirm--flat" role="alertdialog" aria-label={t('settings.reset.confirm')}>
                <p>{t('settings.reset.confirm')}</p>
                <div className="confirm-actions">
                  <button type="button" className="btn-danger" disabled={busy} onClick={reset}>
                    {t('settings.reset.yes')}
                  </button>
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>
                    {t('settings.reset.no')}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn-danger-outline btn-wide" onClick={() => setConfirming(true)}>
                {t('settings.reset')}
              </button>
            )}
          </div>
        </div>
      </section>

      <p role="status" className={message ? 'notice' : 'visually-hidden'}>
        {message ? t(message) : ''}
      </p>

      <p className="disclaimer">{t('settings.disclaimer')}</p>
    </main>
  )
}
