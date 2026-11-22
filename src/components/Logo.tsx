/** Med Friend logo mark (from the brand deck "17 Screens", slide S-P-01): teal tile, white M, mint plus. */
export default function Logo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="logo-mark">
      <rect width="100" height="100" rx="28" fill="#1A6B5A" />
      <path
        d="M27 61V35l12 17 12-17v26"
        fill="none"
        stroke="#fff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M70 32v20M60 42h20" stroke="#2EC4A0" strokeWidth="8" strokeLinecap="round" />
    </svg>
  )
}
