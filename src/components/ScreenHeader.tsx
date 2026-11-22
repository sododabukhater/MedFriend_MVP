import LanguageSwitch from './LanguageSwitch'

/** Big screen title (with an optional line under it) and the language pill. */
export default function ScreenHeader({ title, sub, lang = true }: { title: string; sub?: string; lang?: boolean }) {
  return (
    <header className="screen-head">
      <div className="screen-head-text">
        <h1 className="screen-title">{title}</h1>
        {sub && <p className="screen-sub">{sub}</p>}
      </div>
      {lang && <LanguageSwitch />}
    </header>
  )
}
