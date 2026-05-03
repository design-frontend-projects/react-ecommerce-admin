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
  sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(request))
}

export function getPendingOtpRequest(): PendingOtpRequest | null {
  const raw = sessionStorage.getItem(PENDING_OTP_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as PendingOtpRequest
  } catch {
    sessionStorage.removeItem(PENDING_OTP_KEY)
    return null
  }
}

export function clearPendingOtpRequest() {
  sessionStorage.removeItem(PENDING_OTP_KEY)
}
