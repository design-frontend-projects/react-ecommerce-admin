import { z } from 'zod'

export const userAuthFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Please enter your email')
    .email('Invalid email address')
    .max(255),
  password: z
    .string()
    .min(1, 'Please enter your password')
    .min(7, 'Password must be at least 7 characters long')
    .max(255),
})

export type UserAuthFormValues = z.infer<typeof userAuthFormSchema>
