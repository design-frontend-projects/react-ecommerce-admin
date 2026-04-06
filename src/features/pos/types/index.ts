import { CheckoutRequestType } from '../schemas/checkout'

export interface CheckoutRequest extends CheckoutRequestType {}

export interface CheckoutResponse {
  success: boolean
  invoiceNo?: string
  invoiceId?: string
  transactionId?: string
  timestamp?: string
  error?: {
    code: string
    message: string
    details?: any
  }
}
