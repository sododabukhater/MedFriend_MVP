import { useI18n } from '../i18n'

/** Shows the name of the OTHER language; tapping switches to it. */
export default function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  const other = lang === 'ar' ? 'en' : 'ar'
  return (
    <button
      type="button"
      className="btn-lang"
      lang={other}
      aria-label={t('lang.switchLabel')}
      onClick={() => setLang(other)}
    >
      {t('lang.switchTo')}
    </button>
  )
}
