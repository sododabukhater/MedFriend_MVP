import type { MessageKey } from '../i18n'
import type { Form, StrengthUnit } from '../storage/medications'

type T = (key: MessageKey, vars?: Record<string, string | number>) => string

/** "1 tablet", "2.5 ml", "2 حبة" (REVIEW-AR: Arabic uses one unit word for every number). */
export function amountText(t: T, form: Form, amount: number): string {
  const unit = t(`unit.${form}.${amount === 1 ? 'one' : 'other'}` as MessageKey)
  return `${amount} ${unit}`
}

export function perDayText(t: T, timesPerDay: number): string {
  return t(`perDay.${timesPerDay}` as MessageKey)
}

/** "500 mg" / "500 ملغ". Empty when no strength was entered. */
export function strengthText(t: T, value: number | null, unit: StrengthUnit | null): string {
  if (value === null || unit === null) return ''
  return unit === 'percent' ? `${value}%` : `${value} ${t(`strength.${unit}` as MessageKey)}`
}
