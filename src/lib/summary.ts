import type { Lang, MessageKey } from '../i18n'
import type { Medication } from '../storage/medications'
import { lastDays, SHORT_DAYS, stats, type LoggedDose, type Stats } from './adherence'
import { anchorLabel } from './anchors'
import { amountText, strengthText } from './format'
import type { Profile } from './profile'
import { ammanDate, longDate } from './time'

// F9: the doctor summary. Built once, shown as a document on screen / in print, and as WhatsApp text.
// Spec: docs/specs/F9.md

type T = (key: MessageKey, vars?: Record<string, string | number>) => string

export type SummaryMed = {
  name: string // "Glucophage 500 mg"
  amount: string // "1 tablet"
  often: string // "twice a day"
  times: string // "08:00, 20:00"
}

export type SummaryPeriod = { label: string; stats: Stats }

export type Summary = {
  name: string // "" when not saved yet
  born: string | null // "1968 (58 years old)"
  date: string // "Sunday 22 November"
  meds: SummaryMed[]
  periods: SummaryPeriod[] // last 7 days, last 30 days
  perMed: { name: string; stats: Stats }[] // last 30 days
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
  return {
    name: profile.name,
    born:
      profile.birthYear === null
        ? null
        : t('summary.bornValue', { year: profile.birthYear, age: thisYear - profile.birthYear }),
    date: longDate(now, lang),
    meds: meds.map((med) => ({
      name: fullName(med),
      amount: amountText(t, med.form, med.amount),
      often: t(`often.${med.timesPerDay}` as MessageKey),
      // F3: an anchored dose reads "After Fajr" instead of a clock time.
      times: med.times.map((time, i) => (med.anchors[i] ? anchorLabel(t, med.anchors[i]) : time)).join(lang === 'ar' ? '، ' : ', '),
    })),
    periods: [
      { label: t('progress.last7'), stats: stats(lastDays(all, now, SHORT_DAYS)) },
      { label: t('progress.last30'), stats: stats(all) },
    ],
    perMed: meds.map((med) => ({ name: fullName(med), stats: stats(all.filter((d) => d.med.id === med.id)) })),
  }
}

/** "Last 7 days: 19 of 45 doses (42%)" */
export function periodLine(t: T, p: SummaryPeriod): string {
  const s = p.stats
  return s.pct === null
    ? t('summary.periodNone', { period: p.label })
    : t('summary.period', { period: p.label, n: s.taken, total: s.counted, pct: s.pct })
}

export function pctText(t: T, s: Stats): string {
  return s.pct === null ? t('progress.noDataShort') : `${s.pct}%`
}

/** Plain text for WhatsApp (*bold* is WhatsApp's own formatting). */
export function summaryText(t: T, s: Summary): string {
  const lines = [`*${t('summary.title')}*`, t('app.name')]
  if (s.name) lines.push(t('summary.patient', { name: s.name }))
  if (s.born) lines.push(t('summary.born', { born: s.born }))
  lines.push(t('summary.date', { date: s.date }), '', `*${t('summary.meds')}*`)
  if (s.meds.length === 0) lines.push(t('summary.noMeds'))
  for (const m of s.meds) {
    lines.push(`- ${m.name}: ${t('summary.medLine', { amount: m.amount, often: m.often, times: m.times })}`)
  }
  lines.push('', `*${t('summary.taken')}*`, ...s.periods.map((p) => periodLine(t, p)))
  if (s.perMed.length > 0) {
    lines.push('', t('summary.perMed'))
    for (const m of s.perMed) lines.push(`- ${m.name}: ${pctText(t, m.stats)}`)
  }
  lines.push('', t('summary.footer'))
  return lines.join('\n')
}

/** WhatsApp's share link: opens the app (or WhatsApp Web) with the text ready; the patient picks the contact. */
export function whatsAppLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
