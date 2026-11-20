import type { MessageKey } from '../i18n'
import type { Form } from '../storage/medications'

type T = (key: MessageKey, vars?: Record<string, string | number>) => string

/** "1 tablet", "2.5 ml", "2 حبة" (REVIEW-AR: Arabic uses one unit word for every number). */
export function amountText(t: T, form: Form, amount: number): string {
  const unit = t(`unit.${form}.${amount === 1 ? 'one' : 'other'}` as MessageKey)
  return `${amount} ${unit}`
}

export function perDayText(t: T, timesPerDay: number): string {
  return t(`perDay.${timesPerDay}` as MessageKey)
}
