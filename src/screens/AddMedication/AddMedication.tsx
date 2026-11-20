import { useState } from 'react'
import Autocomplete from '../../components/Autocomplete'
import LanguageSwitch from '../../components/LanguageSwitch'
import { useI18n, type MessageKey } from '../../i18n'
import { amountText, perDayText, strengthText } from '../../lib/format'
import {
  addMedication,
  amountStep,
  cleanStrengthInput,
  FORMS,
  MAX_STRENGTH,
  STRENGTH_UNITS,
  SUGGESTED_TIMES,
  type Form,
  type Medication,
  type StrengthUnit,
} from '../../storage/medications'

// F6-lite: 4 steps, one question per screen, then a review screen. Spec: docs/specs/F6.md
type Step = 1 | 2 | 3 | 4 | 5 // 5 = review

type Props = {
  onSaved: (med: Medication) => void
  onCancel: () => void
}

const MAX_AMOUNT = 100

export default function AddMedication({ onSaved, onCancel }: Props) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [fromList, setFromList] = useState(false)
  // Strength is optional: a number (typed) + a unit (chosen). Both or neither.
  const [strengthInput, setStrengthInput] = useState('')
  const [strengthUnit, setStrengthUnit] = useState<StrengthUnit | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  // Starts at 0 on purpose: the app never suggests a dose.
  const [amount, setAmount] = useState(0)
  const [times, setTimes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const parsed = Number(strengthInput)
  const strengthValue =
    strengthInput !== '' && Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_STRENGTH ? parsed : null
  const strengthProblem: MessageKey | null =
    strengthInput !== '' && !strengthUnit
      ? 'add.strength.needUnit'
      : strengthUnit && strengthValue === null
        ? 'add.strength.needNumber'
        : null

  const answered: Record<Step, boolean> = {
    1: name.trim().length > 0 && strengthProblem === null,
    2: form !== null,
    3: amount > 0,
    4: times.length > 0 && times.every((time) => /^\d{2}:\d{2}$/.test(time)),
    5: true,
  }

  function chooseForm(next: Form) {
    // The unit changes with the form, so the amount is asked again.
    if (next !== form) setAmount(0)
    setForm(next)
  }

  async function save() {
    if (!form) return
    setSaving(true)
    setSaveError(false)
    try {
      const med = await addMedication({
        name,
        fromList,
        strengthValue,
        strengthUnit: strengthValue === null ? null : strengthUnit,
        form,
        amount,
        timesPerDay: times.length,
        times,
      })
      onSaved(med)
    } catch (err) {
      console.error('Saving medication failed', err)
      setSaveError(true)
      setSaving(false)
    }
  }

  const stepValue = amountStep(form ?? 'tablet')

  return (
    <main className="screen">
      <div className="top-bar top-bar--split">
        <button type="button" className="btn-text" onClick={onCancel}>
          {t('add.cancel')}
        </button>
        <LanguageSwitch />
      </div>

      <header className="wizard-header">
        <p className="wizard-progress">
          {step <= 4 ? t('add.step', { n: step }) : t('add.title')}
        </p>
        {step <= 4 && (
          <div className="progress-bar" aria-hidden="true">
            <div className="progress-fill" style={{ inlineSize: `${(step / 4) * 100}%` }} />
          </div>
        )}
      </header>

      <section className="wizard-body">
        {step === 1 && (
          <>
            <h1 className="question">{t('add.name.q')}</h1>
            <p className="hint">{t('add.name.hint')}</p>
            <Autocomplete
              value={name}
              onChange={(value, picked) => {
                setName(value)
                setFromList(picked)
              }}
            />
            <fieldset className="strength">
              <legend className="field-label">{t('add.strength.label')}</legend>
              <p className="hint">{t('add.strength.hint')}</p>
              <input
                className="text-input strength-number"
                type="text"
                inputMode="decimal"
                dir="ltr"
                autoComplete="off"
                aria-label={t('add.strength.number')}
                value={strengthInput}
                onChange={(e) => setStrengthInput(cleanStrengthInput(e.target.value))}
              />
              <div className="unit-row" role="group" aria-label={t('add.strength.unit')}>
                {STRENGTH_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    className="unit-chip"
                    aria-pressed={strengthUnit === u}
                    // Tapping the chosen unit again clears it.
                    onClick={() => setStrengthUnit(strengthUnit === u ? null : u)}
                  >
                    {t(`strength.${u}` as MessageKey)}
                  </button>
                ))}
              </div>
              {strengthProblem && (
                <p className="field-problem" role="status">
                  {t(strengthProblem)}
                </p>
              )}
            </fieldset>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="question">{t('add.form.q')}</h1>
            <div className="choice-grid">
              {FORMS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="choice"
                  aria-pressed={form === f}
                  onClick={() => chooseForm(f)}
                >
                  {t(`form.${f}` as MessageKey)}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && form && (
          <>
            <h1 className="question">{t('add.amount.q')}</h1>
            <div className="stepper">
              <button
                type="button"
                className="stepper-btn"
                aria-label={t('add.amount.less')}
                disabled={amount <= 0}
                onClick={() => setAmount((a) => Math.max(0, a - stepValue))}
              >
                −
              </button>
              <output className="stepper-value" aria-live="polite" data-testid="amount">
                {amountText(t, form, amount)}
              </output>
              <button
                type="button"
                className="stepper-btn"
                aria-label={t('add.amount.more')}
                disabled={amount >= MAX_AMOUNT}
                onClick={() => setAmount((a) => Math.min(MAX_AMOUNT, a + stepValue))}
              >
                +
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="question">{t('add.times.q')}</h1>
            <div className="choice-grid">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="choice"
                  aria-pressed={times.length === n}
                  onClick={() => setTimes(SUGGESTED_TIMES[n])}
                >
                  {perDayText(t, n)}
                </button>
              ))}
            </div>
            {times.length > 0 && (
              <>
                <p className="hint">{t('add.times.hint')}</p>
                <div className="time-list">
                  {times.map((time, i) => (
                    <label key={i} className="time-row">
                      <span>{t('add.times.timeLabel', { n: i + 1 })}</span>
                      <input
                        className="time-input"
                        type="time"
                        required
                        value={time}
                        onChange={(e) =>
                          setTimes((all) => all.map((old, j) => (j === i ? e.target.value : old)))
                        }
                      />
                    </label>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {step === 5 && form && (
          <>
            <h1 className="question">{t('add.review.title')}</h1>
            <dl className="review">
              <dt>{t('add.review.name')}</dt>
              <dd>{name.trim()}</dd>
              {strengthValue !== null && (
                <>
                  <dt>{t('add.review.strength')}</dt>
                  <dd>{strengthText(t, strengthValue, strengthUnit)}</dd>
                </>
              )}
              <dt>{t('add.review.form')}</dt>
              <dd>{t(`form.${form}` as MessageKey)}</dd>
              <dt>{t('add.review.amount')}</dt>
              <dd>{amountText(t, form, amount)}</dd>
              <dt>{t('add.review.times')}</dt>
              <dd>
                {perDayText(t, times.length)}: <span dir="ltr">{[...times].sort().join(' · ')}</span>
              </dd>
            </dl>
            {saveError && (
              <div className="alert" role="alert">
                <p>{t('db.saveFailed')}</p>
              </div>
            )}
          </>
        )}
      </section>

      <footer className="wizard-footer">
        {step > 1 && (
          <button
            type="button"
            className="btn-secondary btn-back"
            disabled={saving}
            onClick={() => setStep((s) => (s - 1) as Step)}
          >
            {t('add.back')}
          </button>
        )}
        {step < 5 ? (
          <button
            type="button"
            className="btn-primary"
            disabled={!answered[step]}
            onClick={() => setStep((s) => (s + 1) as Step)}
          >
            {t('add.next')}
          </button>
        ) : (
          <button type="button" className="btn-primary" disabled={saving} onClick={save}>
            {saving ? t('add.saving') : t('add.save')}
          </button>
        )}
      </footer>
    </main>
  )
}
