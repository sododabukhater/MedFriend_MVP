import { useState } from 'react'
import LanguageSwitch from '../../components/LanguageSwitch'
import TimesPicker, { timesFromSchedule, timesInfo, type TimesValue } from '../../components/TimesPicker'
import { useI18n } from '../../i18n'
import { usePrefs } from '../../lib/prefs'
import { ammanDate } from '../../lib/time'
import { updateTimes, type Medication } from '../../storage/medications'

// Change times (owner, 22 Nov): the doctor changes the timing, the patient changes it here without losing history.
// The new times start tomorrow; today and every earlier day keep the times they had. Spec: docs/specs/TIMES.md

type Props = {
  med: Medication
  onSaved: (med: Medication) => void
  onCancel: () => void
}

export default function ChangeTimes({ med, onSaved, onCancel }: Props) {
  const { t } = useI18n()
  const prefs = usePrefs()
  const today = ammanDate(new Date())
  const [value, setValue] = useState<TimesValue>(() => timesFromSchedule(med))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  // Clock times shown for anchored doses use the current meal times (the ones that apply from tomorrow).
  const timing = timesInfo(value, today, { ...prefs, pastMeals: [] })
  const unchanged =
    JSON.stringify(timing.schedule) === JSON.stringify(timesInfo(timesFromSchedule(med), today, { ...prefs, pastMeals: [] }).schedule)

  async function save() {
    setSaving(true)
    setSaveError(false)
    try {
      onSaved(await updateTimes(med, timing.schedule.times, timing.schedule.anchors, today))
    } catch (err) {
      console.error('Saving the new times failed', err)
      setSaveError(true)
      setSaving(false)
    }
  }

  return (
    <main className="screen">
      <div className="top-bar top-bar--split">
        <button type="button" className="btn-text" onClick={onCancel}>
          {t('add.cancel')}
        </button>
        <LanguageSwitch />
      </div>

      <section className="wizard-body">
        <h1 className="question">{t('times.title', { name: med.name })}</h1>
        <p className="notice">{t('times.hint')}</p>
        <TimesPicker value={value} onChange={setValue} info={timing} />
        {saveError && (
          <div className="alert" role="alert">
            <p>{t('db.saveFailed')}</p>
          </div>
        )}
      </section>

      <footer className="wizard-footer">
        <button type="button" className="btn-primary" disabled={saving || !timing.ok || unchanged} onClick={save}>
          {saving ? t('times.saving') : t('times.save')}
        </button>
      </footer>
    </main>
  )
}
