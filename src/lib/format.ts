import type { Lang, MessageKey } from '../i18n'
import type { Form, StrengthUnit } from '../storage/medications'

type T = (key: MessageKey, vars?: Record<string, string | number>) => string

/**
 * "1 tablet", "2.5 ml". Arabic follows the number (owner, 23 Nov): «حبة واحدة»، «حبتان»، «3 حبات»، «11 حبة»،
 * «نصف حبة»، «حبة ونصف». Syrup keeps the short «مل», right for every number. REVIEW-AR: the unit words.
 */
export function amountText(t: T, form: Form, amount: number, lang: Lang = 'en'): string {
  if (lang === 'ar' && form !== 'syrup') return amountAr(t, form, amount)
  const unit = t(`unit.${form}.${amount === 1 ? 'one' : 'other'}` as MessageKey)
  return `${amount} ${unit}`
}

function amountAr(t: T, form: Form, amount: number): string {
  const unit = (k: 'one' | 'two' | 'few' | 'other') => t(`unit.${form}.${k}` as MessageKey)
  const whole = Math.floor(amount)
  const half = amount - whole === 0.5
  if (amount !== whole && !half) return `${amount} ${unit('other')}` // e.g. 0.25
  if (whole === 0) return half ? t('amount.half', { unit: unit('one') }) : `0 ${unit('other')}`
  if (whole === 1) return half ? t('amount.andHalf', { amount: unit('one') }) : `${unit('one')} ${t('amount.oneWord')}`
  const text = whole === 2 ? unit('two') : whole <= 10 ? `${whole} ${unit('few')}` : `${whole} ${unit('other')}`
  return half ? t('amount.andHalf', { amount: text }) : text
}

export function perDayText(t: T, timesPerDay: number): string {
  return t(`perDay.${timesPerDay}` as MessageKey)
}

/**
 * "Glucophage 500 mg". In Arabic the strength is wrapped in invisible direction marks (first-strong isolate), so
 * right-to-left text keeps «500 ملغ» together after an English name, not «500 Glucophage ملغ» (23 Nov).
 */
export function nameWithStrength(name: string, strength: string, lang: Lang): string {
  if (!strength) return name
  return lang === 'ar' ? `${name} \u2068${strength}\u2069` : `${name} ${strength}`
}

/** "500 mg" / "500 ملغ". Empty when no strength was entered. */
export function strengthText(t: T, value: number | null, unit: StrengthUnit | null): string {
  if (value === null || unit === null) return ''
  return unit === 'percent' ? `${value}%` : `${value} ${t(`strength.${unit}` as MessageKey)}`
}
