// A simple telemetry service to track key application events

export type TelemetryEvent =
  | 'otp_requested'
  | 'otp_verified'
  | 'onboarding_completed'
  | 'subscription_renewed'
  | 'invite_sent'

export const telemetry = {
  track: (event: TelemetryEvent, properties?: Record<string, any>) => {
    // In a real application, this would send data to a service like PostHog, Amplitude, etc.
    // For now, we just log to console in development
    if (import.meta.env.DEV) {
      console.log(`[Telemetry] ${event}`, properties || '')
    }
  },

  identify: (userId: string, traits?: Record<string, any>) => {
    if (import.meta.env.DEV) {
      console.log(`[Telemetry] Identify: ${userId}`, traits || '')
    }
  },
}
