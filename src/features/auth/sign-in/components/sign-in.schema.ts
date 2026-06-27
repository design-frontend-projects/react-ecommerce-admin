import { z } from 'zod'

// Auth form schema with module selection
export const userAuthFormSchema = z.object({
  branchId: z.string().min(1, 'Please select a branch'),
  email: z.string().min(1, 'Please enter your email').email('Invalid email'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').optional(),
})

export type UserAuthFormValues = z.infer<typeof userAuthFormSchema>

// Module type for sign-in
export type UserModule = 'inventory' | 'restaurant'

// Extended form values with module
export interface SignInWithModuleValues extends UserAuthFormValues {
  module: UserModule
}
