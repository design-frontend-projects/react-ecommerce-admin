import { z } from 'zod'
import { passwordSchema } from '@/lib/password-validation'

export const forgotPasswordFormSchema = z.object({
  email: z.string().email().max(255),
  password: passwordSchema.or(z.literal('')).optional(),
  code: z.string().optional(),
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>
