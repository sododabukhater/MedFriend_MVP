import { useI18n } from '../i18n'
import { anchorTime, type Anchor, type Prefs, type Schedule } from '../lib/anchors'
import { perDayText } from '../lib/format'
import { SUGGESTED_TIMES } from '../storage/medications'
import DoseTimeRow, { type TimeMode } from './DoseTimeRow'

// "How many times a day?" + one row per dose (clock time or a moment in the day).
// Used by Add medication step 4 (F6 / F3) and by Change times (docs/specs/TIMES.md).

export type TimesValue = { times: string[]; modes: TimeMode[]; anchors: Anchor[] }

export const EMPTY_TIMES: TimesValue = { times: [], modes: [], anchors: [] }

/** A saved medicine's times, ready to edit. */
export function timesFromSchedule(s: Schedule): TimesValue {
  return {
    times: s.times,
    modes: s.times.map((_, i) => (s.anchors[i] ? 'moment' : 'clock')),
    anchors: s.times.map((_, i) => s.anchors[i] ?? ''),
  }
}

/** What the picker holds: each dose's time on `date`, whether all are set, a clash, and the schedule to save. */
export function timesInfo(v: TimesValue, date: string, prefs: Prefs) {
  const isMoment = (i: number) => v.modes[i] === 'moment'
  const doseTime = (i: number) =>
    isMoment(i) && v.anchors[i] ? anchorTime(v.anchors[i] as Exclude<Anchor, ''>, date, prefs) : v.times[i]
  const set =
    v.times.length > 0 && v.times.every((time, i) => (isMoment(i) ? v.anchors[i] !== '' : /^\d{2}:\d{2}$/.test(time)))
  // Two doses at the same moment would share one answer, so they are not allowed.
  const dayTimes = set ? v.times.map((_, i) => doseTime(i)) : []
  const sameTime = dayTimes.find((time, i) => dayTimes.indexOf(time) !== i) ?? null
  const schedule: Schedule = {
    times: v.times.map((_, i) => doseTime(i)),
    anchors: v.times.map((_, i) => (isMoment(i) ? v.anchors[i] : '')),
  }
  return { isMoment, doseTime, ok: set && sameTime === null, sameTime, schedule }
}

type Props = {
  value: TimesValue
  onChange: (update: (old: TimesValue) => TimesValue) => void
  info: ReturnType<typeof timesInfo>
}

export default function TimesPicker({ value, onChange, info }: Props) {
  const { t } = useI18n()
  const { times, modes, anchors } = value
  const setAt = <K extends keyof TimesValue>(key: K, i: number, v: TimesValue[K][number]) =>
    onChange((old) => ({ ...old, [key]: old[key].map((x, j) => (j === i ? v : x)) }))

  return (
    <>
      <div className="choice-grid">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            className="choice"
            aria-pressed={times.length === n}
            onClick={() =>
              onChange(() => ({
                times: SUGGESTED_TIMES[n],
                modes: Array<TimeMode>(n).fill('clock'),
                anchors: Array<Anchor>(n).fill(''),
              }))
            }
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
                todayTime={info.doseTime(i)}
                onTime={(v) => setAt('times', i, v)}
                onMode={(m) => setAt('modes', i, m)}
                onAnchor={(v) => setAt('anchors', i, v)}
              />
            ))}
          </div>
          {info.sameTime && (
            <p className="field-problem" role="alert">
              {t('add.times.same', { time: info.sameTime })}
            </p>
          )}
        </>
      )}
    </>
  )
}
