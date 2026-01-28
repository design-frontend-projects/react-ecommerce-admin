import { z } from 'zod'
import { passwordSchema } from '@/lib/password-validation'

export const signUpFormSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Please enter your email')
      .email('Invalid email address')
      .max(255),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

export type SignUpFormValues = z.infer<typeof signUpFormSchema>
