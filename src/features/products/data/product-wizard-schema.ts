import { z } from 'zod'

export const baseProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().optional().nullable(),
  category_id: z.coerce.number().optional().nullable(),
  is_active: z.boolean().default(true),
  has_variants: z.boolean().default(true),
  supplier_id: z.coerce.number().optional().nullable(),
  store_id: z.string().optional().nullable(),
  
  // Note: if has_variants is false, these might be required by business logic,
  // but the wizard is typically used when has_variants is true
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  base_price: z.coerce.number().min(0, 'Price must be 0 or greater').optional().nullable(),
})

export const variantRowSchema = z.object({
  id: z.string().optional(), // In case of editing
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  cost_price: z.coerce.number().min(0, 'Cost must be 0 or greater').optional().nullable(),
  stock_quantity: z.coerce.number().default(0),
  min_stock: z.coerce.number().default(0),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  
  // A UI-specific field to help name the variant (e.g. "Spicy - Large")
  // We can map this to dimensions JSON or just use it to generate the SKU.
  attributes_label: z.string().optional(),
})


export const productWizardSchema = z.object({
  base: baseProductSchema,
  variants: z.array(variantRowSchema).min(1, "At least one variant is required"),
})

export type BaseProductFormData = z.infer<typeof baseProductSchema>
export type VariantRowFormData = z.infer<typeof variantRowSchema>
export type ProductWizardFormData = z.infer<typeof productWizardSchema>
