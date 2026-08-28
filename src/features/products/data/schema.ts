import { z } from 'zod'

export const productTypeEnum = z.enum([
  'simple',
  'variant',
  'bundle',
  'service',
  'composite',
])
export type ProductType = z.infer<typeof productTypeEnum>

export const trackingModeEnum = z.enum([
  'none',
  'batch',
  'serial',
  'batch_and_serial',
])
export type TrackingMode = z.infer<typeof trackingModeEnum>

export const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().max(100).optional().nullable(),
  name: z.string().max(200).optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  cost_price: z.coerce
    .number()
    .min(0, 'Cost must be 0 or greater')
    .optional()
    .nullable(),
  stock_quantity: z.coerce.number().default(0),
  min_stock: z.coerce.number().default(0),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.any().optional().nullable(),
  is_active: z.boolean().default(true),
  uom_id: z.string().uuid().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  attributes_label: z.string().optional(),
})
export type ProductVariant = z.infer<typeof productVariantSchema>

export const variantRowSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  cost_price: z.coerce
    .number()
    .min(0, 'Cost must be 0 or greater')
    .optional()
    .nullable(),
  stock_quantity: z.coerce.number().default(0),
  min_stock: z.coerce.number().default(0),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  uom_id: z.string().uuid().optional().nullable(),
  attributes_label: z.string().optional(),
})
export type VariantRowFormData = z.infer<typeof variantRowSchema>

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().optional().nullable(),
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().max(100).optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.string().max(50).optional().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  reorder_level: z.coerce.number().optional().nullable(),
  has_variants: z.boolean().default(false),
  is_deleted: z.boolean().default(false),
  deleted_at: z.string().optional().nullable(),
  base_price: z.coerce
    .number()
    .min(0, 'Price must be 0 or greater')
    .optional()
    .nullable(),
  has_expiration: z.boolean().default(false),
  expiration_date: z.string().optional().nullable(),
  is_marketplace: z.boolean().default(false),
  base_uom_id: z.string().uuid().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  product_type: productTypeEnum.default('simple'),
  product_type_id: z.string().uuid().optional().nullable(),
  tracking_mode: trackingModeEnum.default('none'),
  is_stock_item: z.boolean().default(true),
  reorderable: z.boolean().default(true),
  tax_code: z.string().optional().nullable(),
  tax_classification_id: z.string().uuid().optional().nullable(),
  is_batch_tracked: z.boolean().default(false),
  is_serial_tracked: z.boolean().default(false),
  product_variants: z.array(productVariantSchema).optional(),
})

export type Product = z.infer<typeof productSchema> & {
  // Legacy / convenience aliases
  product_id?: string | number
  categories?: { id?: string; name: string } | null
  brands?: { id?: string; name: string; code?: string | null } | null
  base_uom?: { id?: string; name: string; code?: string } | null
  suppliers?: { id?: string; name: string; code?: string | null } | null
  product_types?: { id?: string; name: string; name_ar?: string | null; code?: string | null; icon?: string | null; color?: string | null } | null
}

export const baseProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().optional().nullable(),
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().max(100).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  base_uom_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  product_type: productTypeEnum.default('simple'),
  product_type_id: z.string().uuid().optional().nullable(),
  tracking_mode: trackingModeEnum.default('none'),
  base_price: z.coerce
    .number()
    .min(0, 'Price must be 0 or greater')
    .optional()
    .nullable(),
  tax_code: z.string().optional().nullable(),
  tax_classification_id: z.string().uuid().optional().nullable(),
  reorder_level: z.coerce.number().optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.string().max(50).optional().nullable(),
  is_active: z.boolean().default(true),
  is_stock_item: z.boolean().default(true),
  reorderable: z.boolean().default(true),
  is_batch_tracked: z.boolean().default(false),
  is_serial_tracked: z.boolean().default(false),
  has_variants: z.boolean().default(false),
  has_expiration: z.boolean().default(false),
  expiration_date: z.union([z.date(), z.string()]).optional().nullable(),
  is_marketplace: z.boolean().default(false),
})
export type BaseProductFormData = z.infer<typeof baseProductSchema>

export const productWizardSchema = z.object({
  base: baseProductSchema,
  variants: z
    .array(variantRowSchema)
    .min(1, 'At least one variant is required'),
})
export type ProductWizardFormData = z.infer<typeof productWizardSchema>

export const productActionFormSchema = baseProductSchema.extend({
  variants: z.array(variantRowSchema).optional(),
})
export type ProductActionFormData = z.infer<typeof productActionFormSchema>
