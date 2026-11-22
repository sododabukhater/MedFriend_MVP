import { useRef, type ReactNode } from 'react'

type Props = {
  className: string
  label?: string
  disabled?: boolean
  onFile: (file: File) => void
  children: ReactNode
}

/**
 * F4: a button that opens the camera or the gallery (phones) or a file picker (laptops).
 * No `capture` attribute, so the phone itself offers "Camera" or "Gallery".
 */
export default function PhotoPicker({ className, label, disabled, onFile, children }: Props) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={label}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        data-testid="photo-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = '' // choosing the same file again still counts
          if (file) onFile(file)
        }}
      />
    </>
  )
}
