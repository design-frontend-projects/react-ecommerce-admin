import { z } from 'zod'

/**
 * Add/Edit user form. No password field: on add the server generates a temporary password
 * (revealed once); on edit, password changes go through the dedicated reset flow.
 */
export const userFormSchema = z.object({
  firstName: z.string().min(1, 'First Name is required.').max(255),
  lastName: z.string().min(1, 'Last Name is required.').max(255),
  username: z.string().min(1, 'Username is required.').max(255),
  phoneNumber: z.string().min(1, 'Phone number is required.').max(50),
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Invalid email address.')
    .max(255),
  role: z.string().min(1, 'Role is required.'),
  branchId: z.string().optional(),
  isEdit: z.boolean(),
})

export type UserForm = z.infer<typeof userFormSchema>
