import { z } from 'zod'

// Auth form schema with module selection
export const userAuthFormSchema = z.object({
  email: z.string().min(1, 'Please enter your email').email('Invalid email'),
  password: z
    .string()
    .min(1, 'Please enter your password')
    .min(6, 'Password must be at least 6 characters'),
})

export type UserAuthFormValues = z.infer<typeof userAuthFormSchema>

// Module type for sign-in
export type UserModule = 'inventory' | 'restaurant'

// Extended form values with module
export interface SignInWithModuleValues extends UserAuthFormValues {
  module: UserModule
}
