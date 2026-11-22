import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_PREFS, type Prefs } from './anchors'

// F3: the patient's meal times and prayer switch, shared by every screen that works out dose times.
const PrefsContext = createContext<Prefs>(DEFAULT_PREFS)

export function PrefsProvider({ prefs, children }: { prefs: Prefs; children: ReactNode }) {
  return <PrefsContext.Provider value={prefs}>{children}</PrefsContext.Provider>
}

export function usePrefs(): Prefs {
  return useContext(PrefsContext)
}
