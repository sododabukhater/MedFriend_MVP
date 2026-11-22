import { useState } from 'react'
import { CheckIcon, PartIcon, PlusIcon } from '../../components/Icons'
import { anchorLabel } from '../../lib/anchors'
import ReadAloudButton from '../../components/ReadAloudButton'
import ScreenHeader from '../../components/ScreenHeader'
import { useI18n, type MessageKey } from '../../i18n'
import type { Dose } from '../../lib/doses'
import { amountText, strengthText } from '../../lib/format'
import { ammanTime, DAY_PARTS, longDate } from '../../lib/time'
import { doseSpeech } from '../../lib/speech'
import type { DoseAction, DosesApi } from '../../lib/useDoses'

// F2: today's doses. Top card = the dose due now (or next); then the count; then one box per part of the day.
// Tapping a dose row opens Taken / Skip / Undo for that dose. Specs: docs/specs/F2.md, docs/specs/DESIGN.md

type Props = {
  api: DosesApi
  onAdd: () => void
  /** The reminder panel is open and shows save errors itself. */
  reminderOpen: boolean
}

/** The dose for the top card: due now, else snoozed, else the next upcoming one. */
function heroDose(doses: Dose[]): Dose | undefined {
  return (
    doses.find((d) => d.status === 'due') ??
    doses.find((d) => d.status === 'snoozed') ??
    doses.find((d) => d.status === 'upcoming')
  )
}

export default function Today({ api, onAdd, reminderOpen }: Props) {
  const { t, lang } = useI18n()
  const { now, doses, ready, loadError, saveError, busyKey, answer, reload } = api
  const [openKey, setOpenKey] = useState<string | null>(null)
  const taken = doses.filter((d) => d.status === 'taken').length
  const hero = heroDose(doses)

  function act(dose: Dose, action: DoseAction) {
    setOpenKey(null)
    answer(dose, action)
  }

  return (
    <main className="screen">
      <ScreenHeader title={t('today.title')} sub={longDate(now, lang)} />

      {loadError && (
        <div className="alert" role="alert">
          <p>{t('db.loadFailed')}</p>
          <button type="button" className="btn-secondary" onClick={reload}>
            {t('db.retry')}
          </button>
        </div>
      )}
      {saveError && !reminderOpen && (
        <div className="alert" role="alert">
          <p>{t('db.saveFailed')}</p>
        </div>
      )}

      {ready && doses.length === 0 && (
        <section className="empty">
          <p className="empty-state">{t('today.empty')}</p>
          <button type="button" className="btn-primary" onClick={onAdd}>
            <PlusIcon />
            {t('home.addMedication')}
          </button>
        </section>
      )}

      {ready && hero && <HeroCard dose={hero} busy={busyKey === hero.key} onAnswer={(a) => act(hero, a)} />}
      {ready && doses.length > 0 && !hero && <p className="all-done">{t('hero.done')}</p>}

      {doses.length > 0 && (
        <div className="today-count">
          <p className="today-summary" data-testid="summary">
            {t('today.summary', { taken, total: doses.length })}
          </p>
          <Segments taken={taken} total={doses.length} />
        </div>
      )}

      {DAY_PARTS.map((part) => {
        const inPart = doses.filter((d) => d.part === part)
        if (inPart.length === 0) return null
        return (
          <section key={part} className="band" aria-labelledby={`part-${part}`}>
            <div className={`band-head tint--${part}`}>
              <PartIcon part={part} size={22} />
              <h2 id={`part-${part}`} className="day-part-title">
                {t(`part.${part}` as MessageKey)}
              </h2>
            </div>
            <ul className="dose-list">
              {inPart.map((dose) => (
                <DoseRow
                  key={dose.key}
                  dose={dose}
                  open={openKey === dose.key}
                  busy={busyKey === dose.key}
                  onToggle={() => setOpenKey(openKey === dose.key ? null : dose.key)}
                  onAnswer={(action) => act(dose, action)}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}

function Segments({ taken, total }: { taken: number; total: number }) {
  // One segment per dose; a plain bar when there are too many to tell apart.
  if (total > 12) {
    return (
      <div className="meter" aria-hidden="true">
        <span style={{ inlineSize: `${(taken / total) * 100}%` }} />
      </div>
    )
  }
  return (
    <div className="segments" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < taken ? 'on' : undefined} />
      ))}
    </div>
  )
}

function HeroCard({ dose, busy, onAnswer }: { dose: Dose; busy: boolean; onAnswer: (action: DoseAction) => void }) {
  const { t, lang } = useI18n()
  const { med } = dose
  const strength = strengthText(t, med.strengthValue, med.strengthUnit)
  const part = t(`partIn.${dose.part}` as MessageKey)
  const label =
    dose.status === 'due'
      ? t('hero.now', { part })
      : dose.status === 'snoozed'
        ? t('hero.snoozed', { time: ammanTime(dose.snoozedUntil!) })
        : t('hero.next', { part })

  return (
    <section className={`hero tint--${dose.part}`} aria-labelledby="hero-label" data-testid="hero">
      <p id="hero-label" className="hero-label">
        <PartIcon part={dose.part} size={22} />
        {label}
      </p>
      <p className="big-time" dir="ltr">
        {dose.time}
      </p>
      {dose.anchor && <p className="anchor-tag">{anchorLabel(t, dose.anchor)}</p>}
      <div className="hero-med">
        {med.photoUrl && <img className="pill-photo pill-photo--hero" src={med.photoUrl} alt={t('photo.alt', { name: med.name })} />}
        <div>
          <p className="hero-name">
            {med.name}
            {strength && ` ${strength}`}
          </p>
          <p className="hero-amount">{amountText(t, med.form, med.amount)}</p>
        </div>
      </div>
      <button type="button" className="btn-primary btn-take-big" disabled={busy} onClick={() => onAnswer('taken')}>
        <CheckIcon size={26} />
        {t('hero.take')}
      </button>
      <div className="hero-more">
        {dose.status === 'due' && (
          <button type="button" className="btn-secondary btn-on-tint" disabled={busy} onClick={() => onAnswer('snoozed')}>
            {t('hero.later')}
          </button>
        )}
        <button type="button" className="btn-secondary btn-on-tint" disabled={busy} onClick={() => onAnswer('skipped')}>
          {t('dose.skip')}
        </button>
      </div>
      <ReadAloudButton text={doseSpeech(t, lang, dose)} name={med.name} className="btn-link btn-read--link" />
    </section>
  )
}

type RowProps = {
  dose: Dose
  open: boolean
  busy: boolean
  onToggle: () => void
  onAnswer: (action: DoseAction) => void
}

function DoseRow({ dose, open, busy, onToggle, onAnswer }: RowProps) {
  const { t } = useI18n()
  const { med, time, status } = dose
  const answered = status === 'taken' || status === 'skipped'
  const strength = strengthText(t, med.strengthValue, med.strengthUnit)
  const actionsId = `actions-${dose.key}`

  return (
    <li className={`dose dose--${status}`} aria-label={`${time} ${med.name}`} data-status={status}>
      <button type="button" className="dose-row" aria-expanded={open} aria-controls={actionsId} onClick={onToggle}>
        <span className="dose-when">
          <span className="dose-time" dir="ltr">
            {time}
          </span>
          {med.photoUrl && <img className="pill-photo pill-photo--thumb" src={med.photoUrl} alt="" />}
        </span>
        <span className="dose-name">
          {med.name}
          {strength && <span className="med-strength"> {strength}</span>}
          <span className="dose-amount">{amountText(t, med.form, med.amount)}</span>
          {dose.anchor && <span className="dose-anchor">{anchorLabel(t, dose.anchor)}</span>}
        </span>
        <span className="dose-status">
          <StatusText dose={dose} />
        </span>
      </button>
      {open && (
        <div id={actionsId} className="dose-actions">
          {answered ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              aria-label={t('dose.undoLabel', { name: med.name, time })}
              onClick={() => onAnswer('undo')}
            >
              {t('dose.undo')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-take"
                disabled={busy}
                aria-label={t('dose.takeLabel', { name: med.name, time })}
                onClick={() => onAnswer('taken')}
              >
                <CheckIcon size={22} />
                {t('hero.take')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                aria-label={t('dose.skipLabel', { name: med.name, time })}
                onClick={() => onAnswer('skipped')}
              >
                {t('dose.skip')}
              </button>
            </>
          )}
        </div>
      )}
    </li>
  )
}

function StatusText({ dose }: { dose: Dose }) {
  const { t } = useI18n()
  switch (dose.status) {
    case 'taken': {
      const at = ammanTime(dose.log!.recordedAt)
      return (
        <>
          <span className="visually-hidden">{t('status.taken', { time: at })}</span>
          <span className="taken-at" aria-hidden="true" dir="ltr">
            <CheckIcon size={18} />
            {at}
          </span>
        </>
      )
    }
    case 'snoozed':
      return <>{t('status.snoozed', { time: ammanTime(dose.snoozedUntil!) })}</>
    case 'open':
      return null
    default:
      return <>{t(`status.${dose.status}` as MessageKey)}</>
  }
}
