import { z } from 'zod'

export const signUpFormSchema = z.object({
  email: z
    .email('Invalid email address')
    .min(1, 'Please enter your email')
    .max(255),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').optional(),
})

export type SignUpFormValues = z.infer<typeof signUpFormSchema>
