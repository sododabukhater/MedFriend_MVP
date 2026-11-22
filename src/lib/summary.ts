import type { Lang, MessageKey } from '../i18n'
import type { Medication } from '../storage/medications'
import { lastDays, SHORT_DAYS, stats, type LoggedDose } from './adherence'
import { amountText, strengthText } from './format'
import type { Profile } from './profile'
import { ammanDate, longDate } from './time'

// F9: the doctor summary, as lines used both on screen and in the WhatsApp text. Spec: docs/specs/F9.md

type T = (key: MessageKey, vars?: Record<string, string | number>) => string

export type Summary = {
  patient: string | null // "Patient: Sami Haddad"
  born: string | null // "Born 1968 (58 years old)"
  date: string // "Date: Sunday 22 November"
  meds: { name: string; detail: string }[]
  periods: string[] // "Last 7 days: 19 of 45 doses (42%)"
  perMed: { name: string; pct: string }[]
}

export function buildSummary(
  t: T,
  lang: Lang,
  profile: Profile,
  meds: Medication[],
  all: LoggedDose[],
  now: Date,
): Summary {
  const thisYear = Number(ammanDate(now).slice(0, 4))
  const fullName = (med: Medication) => {
    const strength = strengthText(t, med.strengthValue, med.strengthUnit)
    return strength ? `${med.name} ${strength}` : med.name
  }
  const period = (label: MessageKey, doses: LoggedDose[]) => {
    const s = stats(doses)
    return s.pct === null
      ? t('summary.periodNone', { period: t(label) })
      : t('summary.period', { period: t(label), n: s.taken, total: s.counted, pct: s.pct })
  }
  return {
    patient: profile.name ? t('summary.patient', { name: profile.name }) : null,
    born:
      profile.birthYear === null ? null : t('summary.born', { year: profile.birthYear, age: thisYear - profile.birthYear }),
    date: t('summary.date', { date: longDate(now, lang) }),
    meds: meds.map((med) => ({
      name: fullName(med),
      detail: t('summary.medLine', {
        amount: amountText(t, med.form, med.amount),
        often: t(`often.${med.timesPerDay}` as MessageKey),
        times: med.times.join(lang === 'ar' ? '، ' : ', '),
      }),
    })),
    periods: [period('progress.last7', lastDays(all, now, SHORT_DAYS)), period('progress.last30', all)],
    perMed: meds.map((med) => {
      const s = stats(all.filter((d) => d.med.id === med.id))
      return { name: fullName(med), pct: s.pct === null ? t('progress.noDataShort') : `${s.pct}%` }
    }),
  }
}

/** Plain text for WhatsApp (*bold* is WhatsApp's own formatting). */
export function summaryText(t: T, s: Summary): string {
  const lines = [`*${t('summary.title')}*`]
  if (s.patient) lines.push(s.patient)
  if (s.born) lines.push(s.born)
  lines.push(s.date, '', `*${t('summary.meds')}*`)
  if (s.meds.length === 0) lines.push(t('summary.noMeds'))
  for (const m of s.meds) lines.push(`- ${m.name}: ${m.detail}`)
  lines.push('', `*${t('summary.taken')}*`, ...s.periods)
  if (s.perMed.length > 0) {
    lines.push('', t('summary.perMed'))
    for (const m of s.perMed) lines.push(`- ${m.name}: ${m.pct}`)
  }
  lines.push('', t('summary.footer'))
  return lines.join('\n')
}

/** WhatsApp's share link: opens the app (or WhatsApp Web) with the text ready; the patient picks the contact. */
export function whatsAppLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
