import { z } from 'zod'

/**
 * Add/Edit user form. No password field: on add the server generates a temporary password
 * (revealed once); on edit, password changes go through the dedicated reset flow.
 */
export const userFormSchema = z
  .object({
    firstName: z.string().min(1, 'First Name is required.').max(100),
    lastName: z.string().min(1, 'Last Name is required.').max(100),
    username: z.string().max(255).optional(),
    phoneNumber: z.string().max(50).optional(),
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('Invalid email address.')
      .max(255),
    idNumber: z.string().max(100).optional(),
    role: z.string().optional(),
    primaryModule: z.enum(['inventory', 'restaurant']).default('inventory'),
    modules: z.array(z.enum(['inventory', 'restaurant'])).default(['inventory']),
    isRestaurantUser: z.boolean().default(false),
    refundPinCode: z.string().max(20).optional(),
    isActive: z.boolean().default(true),
    branchId: z.string().optional(),
    countryId: z.string().optional(),
    cityId: z.string().optional(),
    storeId: z.string().optional(),
    warehouseId: z.string().optional(),
    channelId: z.string().optional(),
    isEdit: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.isEdit) {
      if (!data.role || data.role.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Role is required.',
          path: ['role'],
        })
      }
    }
    if (data.refundPinCode && data.refundPinCode.trim().length > 0) {
      if (!/^\d{4,8}$/.test(data.refundPinCode.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Refund PIN must be 4 to 8 digits.',
          path: ['refundPinCode'],
        })
      }
    }
  })

export type UserForm = z.infer<typeof userFormSchema>

