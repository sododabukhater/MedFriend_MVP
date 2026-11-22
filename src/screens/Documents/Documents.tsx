import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { DocIcon, PlusIcon } from '../../components/Icons'
import LanguageSwitch from '../../components/LanguageSwitch'
import PhotoPicker from '../../components/PhotoPicker'
import ScreenHeader from '../../components/ScreenHeader'
import { useI18n, type MessageKey } from '../../i18n'
import { ammanDate, dateWithYear } from '../../lib/time'
import {
  addDocument,
  checkDocumentFile,
  deleteDocument,
  DOC_TITLE_MAX,
  DOC_TYPES,
  isPdfFile,
  listDocuments,
  TooBigError,
  WrongFileError,
  type DocType,
  type MedDocument,
} from '../../storage/documents'

// F10-lite: the document vault inside "My medicines" (Medicines | Documents switch). Spec: docs/specs/F10.md
// Three screens: the list (with type filter), "Add a document" (after choosing the file), and one document.

const ACCEPT = 'image/*,application/pdf,.pdf'
type Filter = 'all' | DocType
type View = { kind: 'list' } | { kind: 'add'; file: File } | { kind: 'open'; doc: MedDocument }

function fileProblem(err: unknown): MessageKey {
  if (err instanceof TooBigError) return 'docs.tooBig'
  if (err instanceof WrongFileError) return 'docs.wrongType'
  return 'docs.failed'
}

/** `switcher` = the Medicines | Documents switch, shown at the top of the list. */
export default function Documents({ switcher }: { switcher: ReactNode }) {
  const { t, lang } = useI18n()
  const [docs, setDocs] = useState<MedDocument[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<View>({ kind: 'list' })
  const [notice, setNotice] = useState<MessageKey | null>(null)
  const [problem, setProblem] = useState<MessageKey | null>(null)

  const load = useCallback(() => {
    setLoadError(false)
    listDocuments().then(setDocs, (err: unknown) => {
      console.error('Loading documents failed', err)
      setLoadError(true)
    })
  }, [])

  useEffect(load, [load])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  function chooseFile(file: File) {
    setNotice(null)
    try {
      checkDocumentFile(file)
    } catch (err) {
      setProblem(fileProblem(err))
      return
    }
    setProblem(null)
    setView({ kind: 'add', file })
  }

  if (view.kind === 'add') {
    return (
      <AddDocument
        file={view.file}
        onCancel={() => setView({ kind: 'list' })}
        onSaved={() => {
          setView({ kind: 'list' })
          setFilter('all')
          setNotice('docs.saved')
          load()
        }}
      />
    )
  }
  if (view.kind === 'open') {
    return (
      <OpenDocument
        doc={view.doc}
        onBack={() => setView({ kind: 'list' })}
        onDeleted={(doc) => {
          setDocs((list) => list?.filter((d) => d.id !== doc.id) ?? null)
          setView({ kind: 'list' })
          setNotice('docs.deleted')
        }}
      />
    )
  }

  const shown = docs?.filter((d) => filter === 'all' || d.type === filter) ?? null
  const sub = docs && docs.length > 0 ? (docs.length === 1 ? t('docs.count.one') : t('docs.count', { n: docs.length })) : undefined

  return (
    <>
      <main className="screen">
        <ScreenHeader title={t('docs.title')} sub={sub} />
        {switcher}

        {loadError && (
          <div className="alert" role="alert">
            <p>{t('db.loadFailed')}</p>
            <button type="button" className="btn-secondary" onClick={load}>
              {t('db.retry')}
            </button>
          </div>
        )}
        {problem && (
          <div className="alert" role="alert">
            <p>{t(problem)}</p>
          </div>
        )}
        <div role="status" className={notice ? 'notice' : 'visually-hidden'}>
          {notice ? t(notice) : ''}
        </div>

        {docs && docs.length > 0 && (
          <div className="doc-filters" role="group" aria-label={t('docs.filter.label')}>
            {(['all', ...DOC_TYPES] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                className="unit-chip"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {t(`docs.filter.${f}` as MessageKey)}
              </button>
            ))}
          </div>
        )}

        {shown && shown.length > 0 && (
          <ul className="doc-list box" aria-label={t('docs.title')}>
            {shown.map((doc) => (
              <li key={doc.id}>
                <button type="button" className="doc-row" onClick={() => setView({ kind: 'open', doc })}>
                  {doc.isPdf || !doc.url ? (
                    <span className="doc-thumb doc-thumb--icon" aria-hidden="true">
                      <DocIcon size={30} />
                    </span>
                  ) : (
                    <img className="doc-thumb" src={doc.url} alt="" />
                  )}
                  <span className="doc-row-text">
                    <span className="doc-row-type">{t(`docs.type.${doc.type}` as MessageKey)}</span>
                    <span className="doc-row-date">{dateWithYear(doc.date, lang)}</span>
                    {doc.title && <span className="doc-row-title">{doc.title}</span>}
                    {doc.isPdf && <span className="doc-row-pdf">{t('docs.pdf')}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {docs && docs.length === 0 && (
          <section className="empty">
            <p className="empty-state">{t('docs.empty')}</p>
          </section>
        )}
        {docs && docs.length > 0 && shown && shown.length === 0 && (
          <p className="empty-state">{t('docs.emptyType')}</p>
        )}
      </main>
      <div className="action-bar">
        <PhotoPicker className="btn-primary" accept={ACCEPT} testId="doc-input" onFile={chooseFile}>
          <PlusIcon />
          {t('docs.add')}
        </PhotoPicker>
      </div>
    </>
  )
}

/** "New document": preview, type (required), date (not in the future), optional name, Save. */
function AddDocument({ file, onCancel, onSaved }: { file: File; onCancel: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const today = ammanDate(new Date())
  const [type, setType] = useState<DocType | null>(null)
  const [date, setDate] = useState(today)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<MessageKey | null>(null)
  const [tried, setTried] = useState(false)
  const pdf = isPdfFile(file)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (pdf) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file, pdf])

  const dateProblem: MessageKey | null = !date ? 'docs.date.missing' : date > today ? 'docs.date.future' : null

  async function save() {
    setTried(true)
    if (!type || dateProblem) return
    setSaving(true)
    setProblem(null)
    try {
      await addDocument(file, { type, date, title })
      onSaved()
    } catch (err) {
      console.error('Saving the document failed', err)
      setProblem(fileProblem(err))
      setSaving(false)
    }
  }

  return (
    <main className="screen">
      <div className="top-bar top-bar--split">
        <button type="button" className="btn-text" onClick={onCancel} disabled={saving}>
          {t('add.cancel')}
        </button>
        <LanguageSwitch />
      </div>

      <section className="wizard-body">
        <h1 className="question">{t('docs.new')}</h1>
        {preview ? (
          <img className="doc-preview" src={preview} alt={t('docs.alt')} />
        ) : (
          <p className="doc-file">
            <DocIcon size={30} />
            <span dir="auto">{file.name}</span>
          </p>
        )}

        <fieldset className="strength">
          <legend className="field-label">{t('docs.type.q')}</legend>
          <div className="choice-grid">
            {DOC_TYPES.map((d) => (
              <button
                key={d}
                type="button"
                className="unit-chip"
                aria-pressed={type === d}
                onClick={() => setType(d)}
              >
                {t(`docs.type.${d}` as MessageKey)}
              </button>
            ))}
          </div>
          {tried && !type && (
            <p className="field-problem" role="alert">
              {t('docs.type.required')}
            </p>
          )}
        </fieldset>

        <label className="field-label" htmlFor="doc-date">
          {t('docs.date.label')}
        </label>
        <input
          id="doc-date"
          className="text-input"
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {dateProblem && (
          <p className="field-problem" role="alert">
            {t(dateProblem)}
          </p>
        )}

        <label className="field-label" htmlFor="doc-title">
          {t('docs.name.label')}
        </label>
        <input
          id="doc-title"
          className="text-input"
          type="text"
          dir="auto"
          maxLength={DOC_TITLE_MAX}
          placeholder={t('docs.name.hint')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {problem && (
          <div className="alert" role="alert">
            <p>{t(problem)}</p>
          </div>
        )}
      </section>

      <footer className="wizard-footer">
        <button type="button" className="btn-primary" disabled={saving} onClick={save}>
          {saving ? t('docs.saving') : t('docs.save')}
        </button>
      </footer>
    </main>
  )
}

/** One document: type, date, name; the photo, or "Open the PDF"; Delete (with confirm); Back. */
function OpenDocument({
  doc,
  onBack,
  onDeleted,
}: {
  doc: MedDocument
  onBack: () => void
  onDeleted: (doc: MedDocument) => void
}) {
  const { t, lang } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function remove() {
    setBusy(true)
    setFailed(false)
    try {
      await deleteDocument(doc)
      onDeleted(doc)
    } catch (err) {
      console.error('Deleting the document failed', err)
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <main className="screen">
      <div className="top-bar top-bar--split">
        <button type="button" className="btn-text" onClick={onBack}>
          {t('add.back')}
        </button>
        <LanguageSwitch />
      </div>

      <header className="doc-open-head">
        <h1 className="question">{t(`docs.type.${doc.type}` as MessageKey)}</h1>
        <p className="doc-row-date">{dateWithYear(doc.date, lang)}</p>
        {doc.title && <p className="doc-open-title">{doc.title}</p>}
      </header>

      {doc.isPdf ? (
        doc.url ? (
          <a className="btn-primary" href={doc.url} target="_blank" rel="noopener noreferrer">
            <DocIcon />
            {t('docs.openPdf')}
          </a>
        ) : (
          <p className="alert">{t('db.loadFailed')}</p>
        )
      ) : doc.url ? (
        <img className="doc-full" src={doc.url} alt={t('docs.alt')} />
      ) : (
        <p className="alert">{t('db.loadFailed')}</p>
      )}

      {failed && (
        <div className="alert" role="alert">
          <p>{t('db.deleteFailed')}</p>
        </div>
      )}
      {confirming ? (
        <div className="confirm" role="group" aria-label={t('docs.delete')}>
          <p>{t('docs.confirmDelete')}</p>
          <div className="confirm-actions">
            <button type="button" className="btn-danger" disabled={busy} onClick={remove}>
              {t('card.confirmYes')}
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>
              {t('card.confirmNo')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-danger-outline" onClick={() => setConfirming(true)}>
          {t('docs.delete')}
        </button>
      )}
    </main>
  )
}
