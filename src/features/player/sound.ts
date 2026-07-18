/**
 * Rest-timer beep via WebAudio — no audio file. The context is created and
 * resumed on a user gesture (logging a set) so it is unlocked by the time
 * the timer fires in the background.
 */
let ctx: AudioContext | null = null

function context(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Call from a tap handler so the beep is allowed to play later. */
export function primeAudio(): void {
  context()
}

/** Two short 880 Hz blips. Best-effort — failures are silent. */
export function playBeep(): void {
  const audio = context()
  if (!audio) return
  try {
    const t = audio.currentTime
    for (const start of [0, 0.22]) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, t + start)
      gain.gain.exponentialRampToValueAtTime(0.35, t + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + start + 0.18)
      osc.connect(gain).connect(audio.destination)
      osc.start(t + start)
      osc.stop(t + start + 0.2)
    }
  } catch {
    // No sound is better than a crash mid-workout.
  }
}
