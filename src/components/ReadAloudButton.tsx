import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { speak, type SpeechPart } from '../lib/speech'
import { SpeakerIcon } from './Icons'

type Props = {
  /** What to read (an Arabic sentence can carry an English name, said by the English voice). */
  parts: SpeechPart[]
  /** Medicine name, for the button's accessible label. */
  name: string
  className?: string
}

/** F5: 🔊 "Read aloud" — reads the dose in the app language; says so when the device has no voice for it. */
export default function ReadAloudButton({ parts, name, className = 'btn-secondary btn-on-tint' }: Props) {
  const { t, lang } = useI18n()
  const [noVoice, setNoVoice] = useState(false)
  const key = JSON.stringify(parts)
  useEffect(() => setNoVoice(false), [key])

  return (
    <>
      <button
        type="button"
        className={`${className} btn-with-icon btn-read`}
        aria-label={t('voice.readLabel', { name })}
        onClick={() => setNoVoice(!speak(parts, lang))}
      >
        <SpeakerIcon size={24} />
        {t('voice.read')}
      </button>
      {noVoice && (
        <p className="voice-none" role="status">
          {t('voice.none')}
        </p>
      )}
    </>
  )
}
