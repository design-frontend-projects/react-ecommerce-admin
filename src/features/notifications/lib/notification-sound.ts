/**
 * Browser Audio Synthesizer for Real-Time In-App Notifications
 * Uses standard Web Audio API with zero external MP3 dependencies.
 */

export type SoundSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL'

export function playNotificationSound(severity: string = 'INFO') {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    const sev = severity.toUpperCase()

    if (sev === 'CRITICAL' || sev === 'ERROR') {
      // Urgent attention dual-pulse
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(440, now) // A4
      osc.frequency.setValueAtTime(880, now + 0.12) // A5
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35)

      osc.start(now)
      osc.stop(now + 0.35)
    } else if (sev === 'WARNING') {
      // Warm alert tone
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1) // E5
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

      osc.start(now)
      osc.stop(now + 0.3)
    } else if (sev === 'SUCCESS') {
      // Uplifting ascending chime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08) // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16) // G5
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

      osc.start(now)
      osc.stop(now + 0.45)
    } else {
      // Default: Gentle harmonic sine chime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now) // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15) // A5
      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

      osc.start(now)
      osc.stop(now + 0.4)
    }
  } catch {
    // AudioContext can be blocked by browser autoplay policies until user interacts
  }
}
