import { useI18n, type MessageKey } from '../i18n'
import { cleanStrengthInput, type Form } from '../storage/medications'

type Props = {
  form: Form
  pack: string
  left: string
  onPack: (text: string) => void
  onLeft: (text: string) => void
  problem: MessageKey | null
}

/** F7: "How many in one box?" and "How many are left in it now?" (unit follows the form). */
export default function StockFields({ form, pack, left, onPack, onLeft, problem }: Props) {
  const { t } = useI18n()
  const unit = t(`unit.${form}.other` as MessageKey)
  return (
    <div className="stock-fields">
      <label className="field">
        <span className="field-label">{t('stock.pack.q')}</span>
        <span className="count-input">
          <input
            className="text-input"
            type="text"
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            value={pack}
            onChange={(e) => onPack(cleanStrengthInput(e.target.value))}
          />
          <span className="count-unit">{unit}</span>
        </span>
      </label>
      <label className="field">
        <span className="field-label">{t('stock.left.q')}</span>
        <span className="count-input">
          <input
            className="text-input"
            type="text"
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            value={left}
            onChange={(e) => onLeft(cleanStrengthInput(e.target.value))}
          />
          <span className="count-unit">{unit}</span>
        </span>
      </label>
      {problem && (
        <p className="field-problem" role="status">
          {t(problem)}
        </p>
      )}
    </div>
  )
}
