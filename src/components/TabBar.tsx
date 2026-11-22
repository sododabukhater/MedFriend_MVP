import type { ReactNode } from 'react'
import { useI18n } from '../i18n'
import { BarsIcon, GearIcon, PillIcon, SunIcon } from './Icons'

export type Tab = 'today' | 'meds' | 'progress' | 'settings'

/** Big bottom tabs: Today | My medicines | Progress | Settings. */
export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const { t } = useI18n()
  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'today', label: t('tab.today'), icon: <SunIcon size={26} /> },
    { id: 'meds', label: t('home.myMeds'), icon: <PillIcon size={26} /> },
    { id: 'progress', label: t('progress.title'), icon: <BarsIcon size={26} /> },
    { id: 'settings', label: t('settings.title'), icon: <GearIcon size={26} /> },
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
          {icon}
          <span className="tab-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
