import { useI18n } from '../i18n'

export type Tab = 'today' | 'meds' | 'settings'

/** Big bottom tabs: Today | My medicines | Settings. */
export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const { t } = useI18n()
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'today', label: t('tab.today'), icon: '☀' },
    { id: 'meds', label: t('home.myMeds'), icon: '💊' },
    { id: 'settings', label: t('settings.title'), icon: '⚙' },
  ]
  return (
    <nav className="tab-bar" aria-label={t('tab.label')}>
      {tabs.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className="tab"
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <span aria-hidden="true" className="tab-icon">
            {icon}
          </span>
          {label}
        </button>
      ))}
    </nav>
  )
}
