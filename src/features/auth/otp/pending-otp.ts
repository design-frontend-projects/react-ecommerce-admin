export type OtpContactType = 'email' | 'phone'
export type OtpFlow = 'sign-in' | 'sign-up'

export interface PendingOtpRequest {
  contactType: OtpContactType
  contact: string
  flow: OtpFlow
  redirectTo?: string
  module?: 'inventory' | 'restaurant'
}

const PENDING_OTP_KEY = 'respos_pending_otp'

export function savePendingOtpRequest(request: PendingOtpRequest) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(request))
}

export function getPendingOtpRequest(): PendingOtpRequest | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(PENDING_OTP_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as PendingOtpRequest
  } catch {
    window.sessionStorage.removeItem(PENDING_OTP_KEY)
    return null
  }
}

export function clearPendingOtpRequest() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PENDING_OTP_KEY)
}
