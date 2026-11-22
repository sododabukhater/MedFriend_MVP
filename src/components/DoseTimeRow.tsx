import { useI18n, type MessageKey } from '../i18n'
import { anchorLabel, MEALS, PRAYER_ANCHORS, RAMADAN_ANCHORS, RELATIONS, type Anchor, type Meal } from '../lib/anchors'
import { usePrefs } from '../lib/prefs'

// F3: one dose in Add medication, step 4: a clock time, or a moment in the day (prayer, meal, Suhoor / Iftar).
// Prayer and Ramadan moments appear only when "Prayer and Ramadan times" is on in Settings. Spec: docs/specs/F3.md

export type TimeMode = 'clock' | 'moment'

type Props = {
  n: number
  time: string
  mode: TimeMode
  anchor: Anchor
  /** Today's time of this dose (for an anchor: worked out for today). */
  todayTime: string
  onTime: (time: string) => void
  onMode: (mode: TimeMode) => void
  onAnchor: (anchor: Anchor) => void
}

export default function DoseTimeRow({ n, time, mode, anchor, todayTime, onTime, onMode, onAnchor }: Props) {
  const { t } = useI18n()
  const prefs = usePrefs()
  const meal = MEALS.find((m) => anchor.startsWith(`${m}:`)) as Meal | undefined
  const relation = meal ? anchor.split(':')[1] : null

  return (
    <fieldset className="dose-time">
      <legend className="field-label">{t('add.times.dose', { n })}</legend>
      <div className="segmented" role="group" aria-label={t('add.times.modeLabel', { n })}>
        <button type="button" aria-pressed={mode === 'clock'} onClick={() => onMode('clock')}>
          {t('add.times.mode.clock')}
        </button>
        <button type="button" aria-pressed={mode === 'moment'} onClick={() => onMode('moment')}>
          {t('add.times.mode.moment')}
        </button>
      </div>

      {mode === 'clock' ? (
        <label className="time-row">
          <span className="visually-hidden">{t('add.times.timeLabel', { n })}</span>
          <input className="time-input" type="time" required value={time} onChange={(e) => onTime(e.target.value)} />
        </label>
      ) : (
        <div className="anchor-picker">
          {prefs.prayer ? (
            <>
              <p className="anchor-group">{t('add.times.prayers')}</p>
              <div className="anchor-grid">
                {PRAYER_ANCHORS.map((a) => (
                  <button key={a} type="button" className="choice" aria-pressed={anchor === a} onClick={() => onAnchor(a)}>
                    {anchorLabel(t, a)}
                  </button>
                ))}
              </div>
              <p className="anchor-group">{t('add.times.ramadan')}</p>
              <div className="anchor-grid">
                {RAMADAN_ANCHORS.map((a) => (
                  <button key={a} type="button" className="choice" aria-pressed={anchor === a} onClick={() => onAnchor(a)}>
                    {anchorLabel(t, a)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="hint">{t('add.times.prayerOff')}</p>
          )}

          <p className="anchor-group">{t('add.times.meals')}</p>
          <div className="anchor-grid anchor-grid--3">
            {MEALS.map((m) => (
              <button
                key={m}
                type="button"
                className="choice"
                aria-pressed={meal === m}
                onClick={() => onAnchor(`${m}:${relation ?? 'with'}` as Anchor)}
              >
                {t(`meal.${m}` as MessageKey)}
              </button>
            ))}
          </div>
          {meal && (
            <div className="segmented segmented--3" role="group" aria-label={t('add.times.relation')}>
              {RELATIONS.map((r) => (
                <button key={r} type="button" aria-pressed={relation === r} onClick={() => onAnchor(`${meal}:${r}` as Anchor)}>
                  {t(`rel.${r}` as MessageKey)}
                </button>
              ))}
            </div>
          )}

          {anchor ? (
            <p className="notice" data-testid={`anchor-${n}`}>
              {t('add.times.chosen', { anchor: anchorLabel(t, anchor), time: todayTime })}
            </p>
          ) : (
            <p className="hint">{t('add.times.pick')}</p>
          )}
        </div>
      )}
    </fieldset>
  )
}
