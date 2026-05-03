import { z } from 'zod'

export const signUpFormSchema = z
  .object({
    contactType: z.enum(['email', 'phone']),
    contact: z.string().trim().min(1, 'Please enter your email or phone').max(255),
  })
  .superRefine((value, ctx) => {
    if (value.contactType === 'email') {
      const result = z.string().email().safeParse(value.contact)
      if (!result.success) {
        ctx.addIssue({
          code: 'custom',
          path: ['contact'],
          message: 'Invalid email address',
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

export type SignUpFormValues = z.infer<typeof signUpFormSchema>
