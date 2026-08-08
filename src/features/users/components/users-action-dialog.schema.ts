import { z } from 'zod'

/**
 * Add/Edit user form. No password field: on add the server generates a temporary password
 * (revealed once); on edit, password changes go through the dedicated reset flow.
 */
export const userFormSchema = z
  .object({
    firstName: z.string().min(1, 'First Name is required.').max(255),
    lastName: z.string().min(1, 'Last Name is required.').max(255),
    username: z.string().max(255).optional(),
    phoneNumber: z.string().max(50).optional(),
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('Invalid email address.')
      .max(255),
    role: z.string().optional(),
    branchId: z.string().optional(),
    isEdit: z.boolean(),
    isTenant: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.isTenant && !data.isEdit) {
      if (!data.role || data.role.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Role is required.',
          path: ['role'],
        })
      }
      if (!data.username || data.username.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Username is required.',
          path: ['username'],
        })
      }
      if (!data.phoneNumber || data.phoneNumber.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone number is required.',
          path: ['phoneNumber'],
        })
      }
    }
  })

export type UserForm = z.infer<typeof userFormSchema>
