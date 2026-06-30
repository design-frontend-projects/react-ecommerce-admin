import { z } from 'zod'

export const userAuthFormSchema = z
  .object({
    branchId: z.string().min(1, 'Please select a branch'),
    contactType: z.enum(['email', 'phone']),
    contact: z.string().min(1, 'Please enter your email or phone number'),
    password: z.string().min(1, 'Please enter your password'),
  })
  .refine(
    (data) => {
      if (data.contactType === 'email') {
        return z.string().email().safeParse(data.contact).success
      }
      // Simple phone number validation (e.g. at least 7 digits, digits and optional leading +)
      return /^\+?[0-9\s\-()]{7,20}$/.test(data.contact)
    },
    {
      message: 'Invalid email or phone number format',
      path: ['contact'],
    }
  )

export type UserAuthFormValues = z.infer<typeof userAuthFormSchema>

// Module type for sign-in
export type UserModule = 'inventory' | 'restaurant'

// Extended form values with module
export interface SignInWithModuleValues extends UserAuthFormValues {
  module: UserModule
}
