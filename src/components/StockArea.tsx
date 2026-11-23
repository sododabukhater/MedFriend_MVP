import { useState } from 'react'
import { useI18n } from '../i18n'
import { amountText } from '../lib/format'
import { checkStock, daysText, type StockInfo } from '../lib/stock'
import type { Medication } from '../storage/medications'
import StockFields from './StockFields'

type Props = {
  med: Medication
  info: StockInfo | undefined
  onStock: (med: Medication, packSize: number, count: number) => Promise<void>
}

type Mode = 'view' | 'newBox' | 'edit'

/** F7 on the medicine card: "90 tablets left · about 45 days", Low / Out of stock, new box, correct the count. */
export default function StockArea({ med, info, onStock }: Props) {
  const { t, lang } = useI18n()
  const [mode, setMode] = useState<Mode>('view')
  const [pack, setPack] = useState('')
  const [left, setLeft] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [extraBoxes, setExtraBoxes] = useState(0)
  // Setting up a box: "left" follows the box size until the patient types it themselves.
  const [leftTouched, setLeftTouched] = useState(false)
  // Setting up a box: full boxes + what is left in the box in use. Correcting the count: the total.
  const check = checkStock(pack, left, info ? null : extraBoxes)

  async function save(packSize: number, count: number) {
    setBusy(true)
    setFailed(false)
    try {
      await onStock(med, packSize, count)
      setMode('view')
    } catch (err) {
      console.error('Saving the stock failed', err)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  function startEdit() {
    setPack(med.packSize !== null ? String(med.packSize) : '')
    setLeft(info ? String(info.left) : '')
    setExtraBoxes(0)
    setLeftTouched(false)
    setFailed(false)
    setMode('edit')
  }

  // The medicine has a count, but the earlier doses are still loading: show nothing rather than a wrong number.
  if (!info && med.stockSetAt !== null && med.stockCount !== null && med.packSize !== null) return null

  const boxText = med.packSize !== null ? amountText(t, med.form, med.packSize, lang) : ''

  return (
    <div className="stock" data-testid="stock">
      {info && (
        <p className={`stock-line stock-line--${info.level}`}>
          {info.level !== 'ok' && (
            <span className={`badge badge--${info.level}`}>{t(info.level === 'low' ? 'stock.low' : 'stock.out')}</span>
          )}
          <span>
            {info.level === 'out'
              ? t('stock.lineOut')
              : t('stock.line', { left: amountText(t, med.form, info.left, lang), days: daysText(t, info.days) })}
          </span>
        </p>
      )}

      {mode === 'view' &&
        (info ? (
          <div className="stock-actions">
            <button
              type="button"
              className="btn-secondary btn-stock"
              aria-label={t('stock.newBoxLabel', { name: med.name })}
              onClick={() => {
                setFailed(false)
                setMode('newBox')
              }}
            >
              {t('stock.newBox')}
            </button>
            <button
              type="button"
              className="btn-link"
              aria-label={t('stock.correctLabel', { name: med.name })}
              onClick={startEdit}
            >
              {t('stock.correct')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-link"
            aria-label={t('stock.setLabel', { name: med.name })}
            onClick={startEdit}
          >
            {t('stock.set')}
          </button>
        ))}

      {mode === 'newBox' && info && med.packSize !== null && (
        <div className="confirm" role="alertdialog" aria-label={t('stock.confirmNewBox', { pack: boxText })}>
          <p>{t('stock.confirmNewBox', { pack: boxText })}</p>
          <div className="confirm-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => save(med.packSize!, Math.round((info.left + med.packSize!) * 100) / 100)}
            >
              {t('stock.confirmYes')}
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setMode('view')}>
              {t('stock.cancel')}
            </button>
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <div className="stock-edit">
          <StockFields
            form={med.form}
            pack={pack}
            left={left}
            onPack={(v) => {
              setPack(v)
              if (!info && !leftTouched) setLeft(v) // a new box: full unless changed
            }}
            onLeft={(v) => {
              setLeft(v)
              setLeftTouched(true)
            }}
            problem={check.ok ? null : check.problem}
            extra={info ? undefined : { boxes: extraBoxes, onBoxes: setExtraBoxes, total: check.ok && !check.empty ? check.left : null }}
          />
          <div className="confirm-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !check.ok || check.empty}
              onClick={() => check.ok && !check.empty && save(check.pack, check.left)}
            >
              {busy ? t('stock.saving') : t('stock.save')}
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setMode('view')}>
              {t('stock.cancel')}
            </button>
          </div>
        </div>
      )}

      {failed && (
        <p className="field-problem" role="alert">
          {t('stock.failed')}
        </p>
      )}
    </div>
  )
}
