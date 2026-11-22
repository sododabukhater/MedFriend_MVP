import { useEffect, useState } from 'react'
import Autocomplete from '../../components/Autocomplete'
import { CameraIcon } from '../../components/Icons'
import PhotoPicker from '../../components/PhotoPicker'
import StockFields from '../../components/StockFields'
import LanguageSwitch from '../../components/LanguageSwitch'
import { useI18n, type MessageKey } from '../../i18n'
import DoseTimeRow, { type TimeMode } from '../../components/DoseTimeRow'
import { anchorLabel, anchorTime, type Anchor } from '../../lib/anchors'
import { amountText, perDayText, strengthText } from '../../lib/format'
import { usePrefs } from '../../lib/prefs'
import { checkStock } from '../../lib/stock'
import { ammanDate } from '../../lib/time'
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
import { NotAnImageError, savePhoto, shrinkPhoto } from '../../storage/photos'

// F6-lite: 4 steps, one question per screen, an optional box step (F7), an optional photo step (F4), then a review.
// Specs: docs/specs/F6.md, docs/specs/F7.md, docs/specs/F4.md
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 // 5 = box (F7, optional), 6 = photo (optional), 7 = review
const STEPS = 6

type Props = {
  /** photoFailed: the medicine was saved but its photo was not. */
  onSaved: (med: Medication, photoFailed: boolean) => void
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
  // F3: each dose is a clock time or a moment in the day (anchor).
  const [modes, setModes] = useState<TimeMode[]>([])
  const [anchors, setAnchors] = useState<Anchor[]>([])
  const prefs = usePrefs()
  const today = ammanDate(new Date())
  const isMoment = (i: number) => modes[i] === 'moment'
  /** Today's time of each dose (anchored doses: worked out from the anchor). */
  const doseTime = (i: number) => (isMoment(i) && anchors[i] ? anchorTime(anchors[i] as Exclude<Anchor, ''>, today, prefs) : times[i])
  // F4: the chosen photo, already shrunk, and a preview link for it.
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [photoProblem, setPhotoProblem] = useState<MessageKey | null>(null)
  useEffect(() => {
    if (!photo) return setPreview(null)
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  async function choosePhoto(file: File) {
    setPhotoProblem(null)
    try {
      setPhoto(await shrinkPhoto(file))
    } catch (err) {
      console.error('Reading the photo failed', err)
      setPhotoProblem(err instanceof NotAnImageError ? 'photo.notImage' : 'photo.failed')
    }
  }
  // F7: the box. What is left starts equal to the box size (a new box) until the patient changes it.
  const [packText, setPackText] = useState('')
  const [leftText, setLeftText] = useState('')
  const [leftTouched, setLeftTouched] = useState(false)
  const stock = checkStock(packText, leftText, true)
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
    4: times.length > 0 && times.every((time, i) => (isMoment(i) ? anchors[i] !== '' : /^\d{2}:\d{2}$/.test(time))),
    5: stock.ok,
    6: true,
    7: true,
  }

  function chooseForm(next: Form) {
    // The unit changes with the form, so the amount (and the box) is asked again.
    if (next !== form) {
      setAmount(0)
      setPackText('')
      setLeftText('')
      setLeftTouched(false)
    }
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
        times: times.map((_, i) => doseTime(i)),
        anchors: times.map((_, i) => (isMoment(i) ? anchors[i] : '')),
        packSize: stock.ok && !stock.empty ? stock.pack : null,
        stockCount: stock.ok && !stock.empty ? stock.left : null,
      })
      if (!photo) return onSaved(med, false)
      try {
        onSaved({ ...med, ...(await savePhoto(med.id, null, photo)) }, false)
      } catch (err) {
        console.error('Saving the photo failed', err)
        onSaved(med, true)
      }
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
          {step <= STEPS ? t('add.step', { n: step }) : t('add.title')}
        </p>
        {step <= STEPS && (
          <div className="progress-bar" aria-hidden="true">
            <div className="progress-fill" style={{ inlineSize: `${(step / STEPS) * 100}%` }} />
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
                  onClick={() => {
                    setTimes(SUGGESTED_TIMES[n])
                    setModes(Array<TimeMode>(n).fill('clock'))
                    setAnchors(Array<Anchor>(n).fill(''))
                  }}
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
                    <DoseTimeRow
                      key={i}
                      n={i + 1}
                      time={time}
                      mode={modes[i] ?? 'clock'}
                      anchor={anchors[i] ?? ''}
                      todayTime={doseTime(i)}
                      onTime={(v) => setTimes((all) => all.map((old, j) => (j === i ? v : old)))}
                      onMode={(m) => setModes((all) => all.map((old, j) => (j === i ? m : old)))}
                      onAnchor={(v) => setAnchors((all) => all.map((old, j) => (j === i ? v : old)))}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {step === 5 && form && (
          <>
            <h1 className="question">{t('stock.step.q')}</h1>
            <p className="hint">{t('stock.step.hint')}</p>
            <StockFields
              form={form}
              pack={packText}
              left={leftText}
              onPack={(v) => {
                setPackText(v)
                if (!leftTouched) setLeftText(v)
              }}
              onLeft={(v) => {
                setLeftText(v)
                setLeftTouched(true)
              }}
              problem={stock.ok ? null : stock.problem}
            />
          </>
        )}

        {step === 6 && (
          <>
            <h1 className="question">{t('photo.step.q')}</h1>
            <p className="hint">{t('photo.step.hint')}</p>
            {preview && <img className="pill-photo pill-photo--step" src={preview} alt={t('photo.alt', { name: name.trim() })} />}
            <PhotoPicker className={preview ? 'btn-secondary btn-wide btn-with-icon' : 'photo-add photo-add--big'} onFile={choosePhoto}>
              <CameraIcon size={28} />
              {preview ? t('photo.step.retake') : t('photo.step.take')}
            </PhotoPicker>
            {preview && (
              <button type="button" className="btn-link btn-link--danger" onClick={() => setPhoto(null)}>
                {t('photo.remove')}
              </button>
            )}
            {photoProblem && (
              <p className="field-problem" role="alert">
                {t(photoProblem)}
              </p>
            )}
          </>
        )}

        {step === 7 && form && (
          <>
            <h1 className="question">{t('add.review.title')}</h1>
            {preview && <img className="pill-photo pill-photo--card" src={preview} alt={t('photo.alt', { name: name.trim() })} />}
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
              {stock.ok && !stock.empty && (
                <>
                  <dt>{t('add.review.box')}</dt>
                  <dd>{t('stock.review', { pack: amountText(t, form, stock.pack), left: stock.left })}</dd>
                </>
              )}
              <dt>{t('add.review.times')}</dt>
              <dd>
                {perDayText(t, times.length)}:{' '}
                {times
                  .map((_, i) => ({ i, at: doseTime(i) }))
                  .sort((x, y) => x.at.localeCompare(y.at))
                  .map(({ i, at }) => (isMoment(i) ? `${anchorLabel(t, anchors[i])} (${at})` : at))
                  .join(', ')}
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
        {step <= STEPS ? (
          <button
            type="button"
            className="btn-primary"
            disabled={!answered[step]}
            onClick={() => setStep((s) => (s + 1) as Step)}
          >
            {(step === 5 && stock.ok && stock.empty) || (step === 6 && !photo) ? t('photo.skip') : t('add.next')}
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
