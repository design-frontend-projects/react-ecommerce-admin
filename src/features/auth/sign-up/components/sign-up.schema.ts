import { z } from 'zod'

export const signUpFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z
    .email('Invalid email address')
    .min(1, 'Please enter your email')
    .max(255),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type SignUpFormValues = z.infer<typeof signUpFormSchema>
