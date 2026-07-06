import { z } from 'zod'

export const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Please enter your email')
    .max(255),
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>
