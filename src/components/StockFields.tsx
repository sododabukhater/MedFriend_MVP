import { useI18n, type MessageKey } from '../i18n'
import { amountText } from '../lib/format'
import { MAX_EXTRA_BOXES } from '../lib/stock'
import { cleanStrengthInput, type Form } from '../storage/medications'

type Props = {
  form: Form
  pack: string
  left: string
  onPack: (text: string) => void
  onLeft: (text: string) => void
  problem: MessageKey | null
  /**
   * Setting up a box (Add medication / Set the box size): also "How many more full boxes?" and the box in use.
   * Without it (Correct the count) the second question is the total.
   */
  extra?: { boxes: number; onBoxes: (n: number) => void; total: number | null }
}

/** F7: the box questions (unit follows the form). */
export default function StockFields({ form, pack, left, onPack, onLeft, problem, extra }: Props) {
  const { t, lang } = useI18n()
  const unit = t(`unit.${form}.other` as MessageKey)
  return (
    <div className="stock-fields">
      <CountField label={t('stock.pack.q')} unit={unit} value={pack} onChange={onPack} />
      {extra && (
        <div className="field">
          <span className="field-label" id="extra-boxes-label">
            {t('stock.extra.q')}
          </span>
          <div className="stepper stepper--small" role="group" aria-labelledby="extra-boxes-label">
            <button
              type="button"
              className="stepper-btn"
              aria-label={t('stock.extra.less')}
              disabled={extra.boxes <= 0}
              onClick={() => extra.onBoxes(extra.boxes - 1)}
            >
              −
            </button>
            <output className="stepper-value" aria-live="polite" data-testid="extra-boxes">
              {extra.boxes}
            </output>
            <button
              type="button"
              className="stepper-btn"
              aria-label={t('stock.extra.more')}
              disabled={extra.boxes >= MAX_EXTRA_BOXES}
              onClick={() => extra.onBoxes(extra.boxes + 1)}
            >
              +
            </button>
          </div>
        </div>
      )}
      <CountField label={t(extra ? 'stock.left.q' : 'stock.total.q')} unit={unit} value={left} onChange={onLeft} />
      {extra && extra.total !== null && extra.boxes > 0 && (
        <p className="stock-total" role="status">
          {t('stock.totalLine', { n: amountText(t, form, extra.total, lang) })}
        </p>
      )}
      {problem && (
        <p className="field-problem" role="status">
          {t(problem)}
        </p>
      )}
    </div>
  )
}

function CountField({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="count-input">
        <input
          className="text-input"
          type="text"
          inputMode="decimal"
          dir="ltr"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(cleanStrengthInput(e.target.value))}
        />
        <span className="count-unit">{unit}</span>
      </span>
    </label>
  )
}
