import type { ReactNode } from 'react'
import type { DayPart } from '../lib/time'

// Line icons (24×24, drawn with the current text colour). Decorative: always aria-hidden.

type P = { size?: number }

function Svg({ size = 24, width = 2, children }: { size?: number; width?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const SunIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)

export const NoonIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
  </Svg>
)

export const EveningIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 7v3M5.6 11.6l1.4 1.4M18.4 11.6 17 13" />
  </Svg>
)

export const MoonIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </Svg>
)

export function PartIcon({ part, size }: { part: DayPart; size?: number }) {
  if (part === 'morning') return <SunIcon size={size} />
  if (part === 'noon') return <NoonIcon size={size} />
  if (part === 'evening') return <EveningIcon size={size} />
  return <MoonIcon size={size} />
}

export const PillIcon = ({ size }: P) => (
  <Svg size={size}>
    <rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)" />
    <path d="m9.4 8.3 5.2 7.4" />
  </Svg>
)

export const BarsIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M5 20V12M12 20V5M19 20v-9" />
  </Svg>
)

export const GearIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
  </Svg>
)

export const CheckIcon = ({ size }: P) => (
  <Svg size={size} width={2.6}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)

export const PlusIcon = ({ size }: P) => (
  <Svg size={size} width={2.6}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const CameraIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Svg>
)

/** F10: a page (PDF / document). */
export const DocIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
    <path d="M14 2v5h5M8.5 13h7M8.5 17h7" />
  </Svg>
)

export const SpeakerIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </Svg>
)
