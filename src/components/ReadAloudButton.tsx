import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { speak } from '../lib/speech'
import { SpeakerIcon } from './Icons'

type Props = {
  /** What to read. */
  text: string
  /** Medicine name, for the button's accessible label. */
  name: string
  className?: string
}

/** F5: 🔊 "Read aloud" — reads the dose in the app language; says so when the device has no voice for it. */
export default function ReadAloudButton({ text, name, className = 'btn-secondary btn-on-tint' }: Props) {
  const { t, lang } = useI18n()
  const [noVoice, setNoVoice] = useState(false)
  useEffect(() => setNoVoice(false), [text])

  return (
    <>
      <button
        type="button"
        className={`${className} btn-with-icon btn-read`}
        aria-label={t('voice.readLabel', { name })}
        onClick={() => setNoVoice(!speak(text, lang))}
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
