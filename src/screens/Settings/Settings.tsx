import { useState } from 'react'
import LanguageSwitch from '../../components/LanguageSwitch'
import { useI18n, type MessageKey } from '../../i18n'
import { logOut } from '../../lib/auth'
import { setDemoSpeed, useDemoSpeed } from '../../lib/settings'

// Settings tab (F1): demo tools for the professor, account, disclaimer. Spec: docs/specs/F1.md

type Props = {
  email: string
  onTriggerNext: () => boolean
}

export default function Settings({ email, onTriggerNext }: Props) {
  const { t } = useI18n()
  const demo = useDemoSpeed()
  const [message, setMessage] = useState<MessageKey | null>(null)

  return (
    <main className="screen">
      <div className="top-bar">
        <LanguageSwitch />
      </div>
      <header className="app-header">
        <p className="app-title app-title--small">{t('app.name')}</p>
        <h1 className="question">{t('settings.title')}</h1>
      </header>

      <section className="settings-group" aria-labelledby="demo-title">
        <h2 id="demo-title" className="section-title">
          {t('settings.demo.title')}
        </h2>
        <div className="switch-row">
          <span id="demo-speed-label" className="switch-label">
            {t('settings.demoSpeed')}
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
            <span className="switch-text">{demo ? t('settings.on') : t('settings.off')}</span>
          </button>
        </div>
        <p className="hint">{t('settings.demoSpeed.hint')}</p>

        <button
          type="button"
          className="btn-secondary btn-wide"
          onClick={() => setMessage(onTriggerNext() ? 'settings.trigger.done' : 'settings.trigger.none')}
        >
          {t('settings.trigger')}
        </button>
        <p role="status" className="hint">
          {message ? t(message) : ''}
        </p>
      </section>

      <section className="settings-group" aria-labelledby="account-title">
        <h2 id="account-title" className="section-title">
          {t('settings.account')}
        </h2>
        <p className="signed-in-as">
          {t('auth.signedInAs')} <span dir="ltr">{email}</span>
        </p>
        <button type="button" className="btn-secondary btn-wide" onClick={() => logOut()}>
          {t('auth.logout')}
        </button>
      </section>

      <p className="disclaimer">{t('settings.disclaimer')}</p>
    </main>
  )
}
