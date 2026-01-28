import { z } from 'zod'
import { passwordSchema } from '@/lib/password-validation'

export const userFormSchema = z
  .object({
    firstName: z.string().min(1, 'First Name is required.').max(255),
    lastName: z.string().min(1, 'Last Name is required.').max(255),
    username: z.string().min(1, 'Username is required.').max(255),
    phoneNumber: z.string().min(1, 'Phone number is required.').max(50),
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('Invalid email address.')
      .max(255),
    password: z.string().transform((pwd) => pwd.trim()),
    role: z.string().min(1, 'Role is required.'),
    confirmPassword: z.string().transform((pwd) => pwd.trim()),
    isEdit: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.isEdit || data.password.length > 0) {
      const result = passwordSchema.safeParse(data.password)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({ ...issue, path: ['password'] })
        })
      }
    }

    if (
      (!data.isEdit || data.password.length > 0) &&
      data.password !== data.confirmPassword
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords don't match.",
        path: ['confirmPassword'],
      })
    }
  })

export type UserForm = z.infer<typeof userFormSchema>
