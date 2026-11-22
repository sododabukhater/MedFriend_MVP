import { useEffect, useId, useState, type FormEvent } from 'react'
import { useI18n, type MessageKey } from '../i18n'
import { checkProfile, cleanYearInput, MAX_NAME, saveProfile, type Profile } from '../lib/profile'

/** "My details": name + year of birth (F9). Used in Settings and on the summary when no name is saved yet. */
export default function ProfileForm({ profile, thisYear }: { profile: Profile; thisYear: number }) {
  const { t } = useI18n()
  const nameId = useId()
  const yearId = useId()
  const [name, setName] = useState(profile.name)
  const [year, setYear] = useState(profile.birthYear === null ? '' : String(profile.birthYear))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ key: MessageKey; ok: boolean } | null>(null)

  // Fresh account details can arrive just after the screen opens (see useAuth): show them.
  useEffect(() => {
    setName(profile.name)
    setYear(profile.birthYear === null ? '' : String(profile.birthYear))
  }, [profile.name, profile.birthYear])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const checked = checkProfile(name, year, thisYear)
    if (!checked.ok) return setMessage({ key: checked.error, ok: false })
    setBusy(true)
    setMessage(null)
    try {
      await saveProfile(checked.profile)
      setMessage({ key: 'profile.saved', ok: true })
    } catch (err) {
      console.error('Saving profile failed', err)
      setMessage({ key: 'db.saveFailed', ok: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="box profile-form" onSubmit={submit} noValidate>
      <label className="field-label" htmlFor={nameId}>
        {t('profile.name')}
      </label>
      <input
        id={nameId}
        className="text-input"
        type="text"
        autoComplete="name"
        maxLength={MAX_NAME}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="field-label" htmlFor={yearId}>
        {t('profile.year')}
      </label>
      <input
        id={yearId}
        className="text-input year-input"
        type="text"
        inputMode="numeric"
        dir="ltr"
        value={year}
        onChange={(e) => setYear(cleanYearInput(e.target.value))}
      />
      {message && (
        <p className={message.ok ? 'notice' : 'field-problem'} role={message.ok ? 'status' : 'alert'}>
          {t(message.key)}
        </p>
      )}
      <button type="submit" className="btn-secondary btn-wide" disabled={busy}>
        {busy ? t('profile.saving') : t('profile.save')}
      </button>
    </form>
  )
}
