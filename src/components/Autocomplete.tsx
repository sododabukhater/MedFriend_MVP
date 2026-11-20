import { useId, useMemo, useState } from 'react'
import { isArabic, searchDrugs, type Drug } from '../data/drugs'
import { useI18n } from '../i18n'

type Props = {
  value: string
  onChange: (value: string, fromList: boolean) => void
}

/** Medicine name box with up to 6 suggestions from the local list. Free text is always allowed. */
export default function Autocomplete({ value, onChange }: Props) {
  const { t } = useI18n()
  const inputId = useId()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const suggestions = useMemo(() => searchDrugs(value), [value])
  const showList = open && suggestions.length > 0

  function pick(drug: Drug) {
    // Fill in the same script the patient typed in (Arabic or Latin).
    onChange(isArabic(value) ? drug.ar : drug.brand, true)
    setOpen(false)
  }

  return (
    <div className="autocomplete">
      <label className="field-label" htmlFor={inputId}>
        {t('add.name.label')}
      </label>
      <input
        id={inputId}
        className="text-input"
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus
        maxLength={200}
        value={value}
        onChange={(e) => {
          onChange(e.target.value, false)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {showList && (
        <ul id={listId} className="suggestions" role="listbox" aria-label={t('add.name.suggestions')}>
          {suggestions.map((drug) => (
            <li key={drug.brand} role="option" aria-selected={false}>
              <button type="button" className="suggestion" onClick={() => pick(drug)}>
                <span className="suggestion-name">
                  <span lang="en">{drug.brand}</span> · <span lang="ar">{drug.ar}</span>
                </span>
                <span className="suggestion-generic" lang="en">
                  {drug.generic}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
