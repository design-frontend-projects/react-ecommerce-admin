import { z } from 'zod'

export const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const otpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  token: z.string().length(6, 'OTP must be exactly 6 digits'),
})

export type EmailFormData = z.infer<typeof emailSchema>
export type OtpFormData = z.infer<typeof otpSchema>
