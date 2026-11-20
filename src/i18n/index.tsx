import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import ar from './ar.json'
import en from './en.json'

// Build phase: English is the working/default language; Arabic is kept in sync.
// Before code freeze, change DEFAULT_LANG to 'ar'.
export const DEFAULT_LANG: Lang = 'en'

export type Lang = 'ar' | 'en'
export type MessageKey = keyof typeof en

const messages: Record<Lang, Record<MessageKey, string>> = { ar, en }
const STORAGE_KEY = 'medfriend.lang'

function readSavedLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ar' || saved === 'en') return saved
  } catch {
    // Storage unavailable (e.g. private mode): fall back to default.
  }
  return DEFAULT_LANG
}

/** Sets <html lang/dir> and the page title so layout flips between LTR and RTL. */
export function applyLangToDocument(lang: Lang): void {
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.title = messages[lang]['app.name']
}

/** Language to use on startup; also applied to the document before first render. */
export function initialLang(): Lang {
  const lang = readSavedLang()
  applyLangToDocument(lang)
  return lang
}

type I18n = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: MessageKey) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    applyLangToDocument(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not saved; the choice still applies for this visit.
    }
  }, [])

  const t = useCallback(
    (key: MessageKey) => messages[lang][key] ?? messages.en[key] ?? key,
    [lang],
  )

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
