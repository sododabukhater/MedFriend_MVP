import { PlusIcon } from '../../components/Icons'
import MedicationCard from '../../components/MedicationCard'
import ScreenHeader from '../../components/ScreenHeader'
import { useI18n, type MessageKey } from '../../i18n'
import type { Medication } from '../../storage/medications'

// "My medicines" tab (F6): one list of medicines, and one big "Add a medicine" button above the tabs.

type Props = {
  meds: Medication[] | null
  loadError: boolean
  error: MessageKey | null
  notice: MessageKey | null
  onRetry: () => void
  onAdd: () => void
  onDelete: (med: Medication) => Promise<void>
}

export default function Medicines({ meds, loadError, error, notice, onRetry, onAdd, onDelete }: Props) {
  const { t } = useI18n()
  const sub = meds && meds.length > 0 ? (meds.length === 1 ? t('home.count.one') : t('home.count', { n: meds.length })) : undefined

  return (
    <>
      <main className="screen">
        <ScreenHeader title={t('home.myMeds')} sub={sub} />

        {loadError && (
          <div className="alert" role="alert">
            <p>{t('db.loadFailed')}</p>
            <button type="button" className="btn-secondary" onClick={onRetry}>
              {t('db.retry')}
            </button>
          </div>
        )}
        {error && (
          <div className="alert" role="alert">
            <p>{t(error)}</p>
          </div>
        )}
        <div role="status" className={notice ? 'notice' : 'visually-hidden'}>
          {notice ? t(notice) : ''}
        </div>

        {meds && meds.length > 0 && (
          <ul className="med-list box">
            {meds.map((med) => (
              <MedicationCard key={med.id} med={med} onDelete={onDelete} />
            ))}
          </ul>
        )}
        {meds && meds.length === 0 && (
          <section className="empty">
            <p className="empty-state">{t('home.empty')}</p>
          </section>
        )}
      </main>
      <div className="action-bar">
        <button type="button" className="btn-primary" onClick={onAdd}>
          <PlusIcon />
          {t('home.addMedication')}
        </button>
      </div>
    </>
  )
}
