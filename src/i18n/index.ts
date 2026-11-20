import ar from './ar.json'
import en from './en.json'

// Arabic is the source language. English is a secondary language (toggle comes later).
export type Lang = 'ar' | 'en'
export type MessageKey = keyof typeof ar

const messages: Record<Lang, Record<MessageKey, string>> = { ar, en }

let current: Lang = 'ar'

export function setLang(lang: Lang): void {
  current = lang
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

/** Returns the text for a key in the current language, falling back to Arabic. */
export function t(key: MessageKey): string {
  return messages[current][key] ?? messages.ar[key]
}
