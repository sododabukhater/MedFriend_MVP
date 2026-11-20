import { useSyncExternalStore } from 'react'

// Per-device settings (localStorage). Spec: docs/specs/F1.md

const DEMO_KEY = 'medfriend.demoSpeed'
const listeners = new Set<() => void>()

function readDemo(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === 'on'
  } catch {
    return false
  }
}

let demoSpeed = readDemo()

export function setDemoSpeed(on: boolean): void {
  demoSpeed = on
  try {
    if (on) localStorage.setItem(DEMO_KEY, 'on')
    else localStorage.removeItem(DEMO_KEY)
  } catch {
    // Not saved; still applies for this visit.
  }
  listeners.forEach((fn) => fn())
}

/** Demo speed: every "minute" in reminders and Missed becomes one second. */
export function useDemoSpeed(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => demoSpeed,
  )
}

/** Length of one "minute" for reminder timings, in milliseconds. */
export function minuteMs(demo: boolean): number {
  return demo ? 1000 : 60_000
}
