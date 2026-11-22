import { useEffect, useId, useState, type FormEvent } from 'react'
import { useI18n, type MessageKey } from '../i18n'
import { mealChange, MEALS, savePrefs, type MealTimes, type Prefs } from '../lib/anchors'
import { PRAYERS, prayerTimes } from '../lib/prayer'
import { ammanDate } from '../lib/time'

// F3, Settings → "My day": the "Prayer and Ramadan times" switch (off by default) and the patient's meal times.
// Both are saved with the login account. Spec: docs/specs/F3.md

export default function DaySettings({ prefs }: { prefs: Prefs }) {
  const { t } = useI18n()
  const switchLabel = useId()
  const [meals, setMeals] = useState<MealTimes>(prefs.meals)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ key: MessageKey; ok: boolean } | null>(null)
  const today = prayerTimes(ammanDate(new Date()))

  // Fresh account details can arrive just after the screen opens: show them.
  const mealsKey = JSON.stringify(prefs.meals)
  useEffect(() => setMeals(JSON.parse(mealsKey) as MealTimes), [mealsKey])

  async function run(change: Partial<Prefs>, ok: MessageKey | null) {
    setBusy(true)
    setMessage(null)
    try {
      await savePrefs(change)
      if (ok) setMessage({ key: ok, ok: true })
    } catch (err) {
      console.error('Saving my day failed', err)
      setMessage({ key: 'db.saveFailed', ok: false })
    } finally {
      setBusy(false)
    }
  }

  function saveMeals(e: FormEvent) {
    e.preventDefault()
    // New meal times start tomorrow: today and earlier days keep theirs (docs/specs/TIMES.md).
    if (JSON.stringify(meals) === JSON.stringify(prefs.meals)) return setMessage({ key: 'settings.meals.saved', ok: true })
    run(mealChange(prefs, meals, ammanDate(new Date())), 'settings.meals.saved')
  }

  return (
    <div className="box">
      <div className="item">
        <span className="item-text">
          <span id={switchLabel}>{t('settings.prayer')}</span>
          <small className="item-hint">{t('settings.prayer.hint')}</small>
        </span>
        <button
          type="button"
          role="switch"
          className="switch"
          aria-checked={prefs.prayer}
          aria-labelledby={switchLabel}
          disabled={busy}
          onClick={() => run({ prayer: !prefs.prayer }, null)}
        >
          <span className="switch-knob" aria-hidden="true" />
        </button>
      </div>
      {prefs.prayer && (
        <div className="item prayer-today" data-testid="prayer-today">
          <span className="item-hint">{t('settings.prayer.today')}</span>
          <dl className="prayer-list">
            {PRAYERS.map((p) => (
              <div key={p}>
                <dt>{t(`prayer.${p}` as MessageKey)}</dt>
                <dd dir="ltr">{today[p]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <form className="item meal-form" onSubmit={saveMeals} noValidate>
        <span className="item-text">{t('settings.meals.title')}</span>
        <div className="meal-grid">
          {MEALS.map((m) => (
            <label key={m} className="meal-field">
              <span>{t(`meal.${m}` as MessageKey)}</span>
              <input
                className="time-input"
                type="time"
                required
                value={meals[m]}
                onChange={(e) => setMeals({ ...meals, [m]: e.target.value })}
              />
            </label>
          ))}
        </div>
        {message && (
          <p className={message.ok ? 'notice' : 'field-problem'} role={message.ok ? 'status' : 'alert'}>
            {t(message.key)}
          </p>
        )}
        <button
          type="submit"
          className="btn-secondary btn-wide"
          disabled={busy || MEALS.some((m) => !/^\d{2}:\d{2}$/.test(meals[m]))}
        >
          {t('settings.meals.save')}
        </button>
      </form>
    </div>
  )
}
