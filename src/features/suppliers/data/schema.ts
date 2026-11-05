import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const supplierInputSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(150),
  code: z.string().max(50).optional().nullable().or(z.literal('')),

  // Contact info
  contact_person: z.string().max(100).optional().nullable().or(z.literal('')),
  contactPerson: z.string().max(100).optional().nullable().or(z.literal('')),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z.string().max(50).optional().nullable().or(z.literal('')),
  address: z.string().max(255).optional().nullable().or(z.literal('')),
  website: z.string().max(255).optional().nullable().or(z.literal('')),

  // Commercial & tax
  tax_number: z.string().max(50).optional().nullable().or(z.literal('')),
  taxNumber: z.string().max(50).optional().nullable().or(z.literal('')),
  payment_terms_days: z.coerce
    .number()
    .int()
    .min(0, 'Payment terms must be non-negative')
    .optional()
    .nullable(),
  paymentTermsDays: z.coerce
    .number()
    .int()
    .min(0, 'Payment terms must be non-negative')
    .optional()
    .nullable(),

  // Metadata & flags
  notes: z.string().max(1000).optional().nullable().or(z.literal('')),
  is_preferred: z.boolean().optional(),
  isPreferred: z.boolean().optional(),
  is_active: z.boolean().optional(),
  isActive: z.boolean().optional(),

  // Relations
  supplierCategoryId: z.string().uuid().optional().nullable(),
  supplier_category_id: z.string().uuid().optional().nullable(),
  cityId: z.string().uuid().optional().nullable(),
  city_id: z.string().uuid().optional().nullable(),
})

export type SupplierInput = z.infer<typeof supplierInputSchema>

export const supplierListItemSchema = z.object({
  id: z.string().uuid(),
  supplier_id: z.string().uuid().optional(), // For backward compatibility
  tenant_id: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable().optional(),
  supplier_category_id: z.string().uuid().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  tax_number: z.string().nullable().optional(),
  payment_terms_days: z.number().nullable().optional(),
  address: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  city_id: z.string().uuid().nullable().optional(),
  is_preferred: z.boolean().nullable().optional(),
  created_at: z.union([z.string(), z.date()]).nullable().optional(),
  _count: z
    .object({
      products: z.number().optional(),
      purchase_orders: z.number().optional(),
    })
    .optional(),
})

export type SupplierListItem = z.infer<typeof supplierListItemSchema>

export const supplierListResponseSchema = successEnvelope(
  z.array(supplierListItemSchema)
)
