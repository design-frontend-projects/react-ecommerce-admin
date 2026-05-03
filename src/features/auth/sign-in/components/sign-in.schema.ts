import { z } from 'zod'

const contactTypeSchema = z.enum(['email', 'phone'])

// Auth form schema with module selection
export const userAuthFormSchema = z
  .object({
    branchId: z.string().uuid('Please select a valid branch'),
    contactType: contactTypeSchema,
    contact: z.string().trim().min(1, 'Please enter your email or phone'),
  })
  .superRefine((value, ctx) => {
    if (value.contactType === 'email') {
      const result = z.string().email().safeParse(value.contact)
      if (!result.success) {
        ctx.addIssue({
          code: 'custom',
          path: ['contact'],
          message: 'Invalid email',
        })
      }
    }

    if (value.contactType === 'phone' && !value.contact.startsWith('+')) {
      ctx.addIssue({
        code: 'custom',
        path: ['contact'],
        message: 'Use international phone format, for example +201000000000',
      })
    }
  })

export type UserAuthFormValues = z.infer<typeof userAuthFormSchema>

// Module type for sign-in
export type UserModule = 'inventory' | 'restaurant'

// Extended form values with module
export interface SignInWithModuleValues extends UserAuthFormValues {
  module: UserModule
}
