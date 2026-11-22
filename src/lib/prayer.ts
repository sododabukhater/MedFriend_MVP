import { ammanInstant, ammanTime } from './time'

// F3: prayer times for Amman, calculated in the app (no internet service, no dependency). Spec: docs/specs/F3.md
// Method of the Jordanian Ministry of Awqaf: Fajr and Isha at 18° below the horizon, Asr when a shadow equals the
// object's length (standard), Maghrib 5 minutes after sunset. Checked against the official timetable in tests/F3.spec.ts.
// Sun position: the standard low-precision formulas (accurate to about a minute), as in the PrayTimes.org method.

export type Prayer = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
export const PRAYERS: Exclude<Prayer, 'sunrise'>[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

const AMMAN = { lat: 31.9539, lng: 35.9106 }
const FAJR_ANGLE = 18
const ISHA_ANGLE = 18
const MAGHRIB_AFTER_SUNSET_MIN = 5

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const fix = (a: number, b: number) => ((a % b) + b) % b

/** Sun declination (degrees) and equation of time (hours) for a Julian day. */
function sunPosition(jd: number) {
  const d = jd - 2451545.0
  const g = fix(357.529 + 0.98560028 * d, 360)
  const q = fix(280.459 + 0.98564736 * d, 360)
  const l = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360)
  const e = 23.439 - 0.00000036 * d
  const ra = fix(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(l)), Math.cos(rad(l)))) / 15, 24)
  return {
    declination: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(l)))),
    equation: q / 15 - ra,
  }
}

/** Prayer times on an Amman date ("YYYY-MM-DD") as "HH:MM" in Amman time. */
export function prayerTimes(date: string): Record<Prayer, string> {
  const [y, m, day] = date.split('-').map(Number)
  // Julian day at 00:00 UTC of that date.
  const jd = Date.UTC(y, m - 1, day) / 86400000 + 2440587.5

  // Hours in UTC; each value refined once with the sun position at that moment.
  const noon = (t: number) => fix(12 - sunPosition(jd + t / 24).equation, 24) - AMMAN.lng / 15
  const hourAngle = (t: number, angle: number, before: boolean) => {
    const { declination } = sunPosition(jd + t / 24)
    const cos =
      (-Math.sin(rad(angle)) - Math.sin(rad(declination)) * Math.sin(rad(AMMAN.lat))) /
      (Math.cos(rad(declination)) * Math.cos(rad(AMMAN.lat)))
    const h = deg(Math.acos(Math.max(-1, Math.min(1, cos)))) / 15
    return noon(t) + (before ? -h : h)
  }
  const asrTime = (t: number) => {
    const { declination } = sunPosition(jd + t / 24)
    const angle = -deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(AMMAN.lat - declination))))))
    return hourAngle(t, angle, false)
  }

  // First guesses (hours, UTC), then one refinement pass.
  let t = { fajr: 2, sunrise: 4, dhuhr: 10, asr: 13, sunset: 15, isha: 17 }
  for (let i = 0; i < 2; i++) {
    t = {
      fajr: hourAngle(t.fajr, FAJR_ANGLE, true),
      sunrise: hourAngle(t.sunrise, 0.833, true),
      dhuhr: noon(t.dhuhr),
      asr: asrTime(t.asr),
      sunset: hourAngle(t.sunset, 0.833, false),
      isha: hourAngle(t.isha, ISHA_ANGLE, false),
    }
  }

  const clock = (hoursUtc: number, plusMin = 0) => {
    // Round to the nearest minute, as official timetables do.
    const ms = Date.UTC(y, m - 1, day) + Math.round(hoursUtc * 60 + plusMin) * 60000
    return ammanTime(new Date(ms))
  }
  return {
    fajr: clock(t.fajr),
    sunrise: clock(t.sunrise),
    dhuhr: clock(t.dhuhr),
    asr: clock(t.asr),
    maghrib: clock(t.sunset, MAGHRIB_AFTER_SUNSET_MIN),
    isha: clock(t.isha),
  }
}

/** Kept for symmetry with other time helpers: the moment of a prayer on an Amman date. */
export function prayerInstant(date: string, prayer: Prayer): Date {
  return ammanInstant(date, prayerTimes(date)[prayer])
}
