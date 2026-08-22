import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const supplierInputSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(150),
  code: z.string().optional().nullable(),
  supplierCategoryId: z.string().uuid().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  paymentTermsDays: z.coerce.number().int().min(0).optional(),
  address: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  cityId: z.string().uuid().optional().nullable(),
  isPreferred: z.boolean().optional(),
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
  payment_terms_days: z.number().optional(),
  address: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  city_id: z.string().uuid().nullable().optional(),
  is_preferred: z.boolean().nullable().optional(),
  created_at: z.union([z.string(), z.date()]).optional(),
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
