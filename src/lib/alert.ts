// Chime + vibration when a reminder or follow-up appears (F1). No sound file: a short tone made in the browser.
// Browsers allow sound only after the first tap on the page, so the audio is unlocked on the first tap.

let audio: AudioContext | null = null

function unlock() {
  try {
    audio ??= new AudioContext()
    void audio.resume()
  } catch {
    // No Web Audio: vibration and the banner still work.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

function chime() {
  if (!audio || audio.state !== 'running') return
  const start = audio.currentTime
  // Two soft notes (E5 then A5), each fading out.
  ;[659.25, 880].forEach((freq, i) => {
    const osc = audio!.createOscillator()
    const gain = audio!.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t0 = start + i * 0.22
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6)
    osc.connect(gain).connect(audio!.destination)
    osc.start(t0)
    osc.stop(t0 + 0.65)
  })
}

/** Plays the chime and vibrates (phones that allow it). Stronger vibration for the follow-up. */
export function alertPatient(followUp: boolean): void {
  chime()
  try {
    navigator.vibrate?.(followUp ? [300, 150, 300, 150, 300] : [200, 100, 200])
  } catch {
    // Vibration not allowed: ignore.
  }
}
