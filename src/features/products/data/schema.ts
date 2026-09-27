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

export const attributeDataTypeEnum = z.enum([
  'text',
  'number',
  'boolean',
  'color',
  'select',
])
export type AttributeDataType = z.infer<typeof attributeDataTypeEnum>

export interface TaxRateBrief {
  id: string
  tax_type: string
  rate: number | string
  description?: string | null
  is_inclusive?: boolean | null
}

// ── Attribute Schemas ────────────────────────────────────────────────────────

export const attributeValueSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  attribute_definition_id: z.string().uuid(),
  value: z.string().min(1, 'Value is required').max(200),
  value_ar: z.string().max(200).optional().nullable(),
  color_hex: z.string().max(10).optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().optional().nullable(),
})
export type AttributeValue = z.infer<typeof attributeValueSchema>

export const attributeDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  name_ar: z.string().max(100).optional().nullable(),
  data_type: attributeDataTypeEnum.default('text'),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  attribute_values: z.array(attributeValueSchema).optional(),
})
export type AttributeDefinition = z.infer<typeof attributeDefinitionSchema>

export const productVariantAttributeSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  product_variant_id: z.string().uuid(),
  attribute_definition_id: z.string().uuid(),
  attribute_value_id: z.string().uuid(),
  attribute_definition: attributeDefinitionSchema.optional(),
  attribute_value: attributeValueSchema.optional(),
})
export type ProductVariantAttribute = z.infer<typeof productVariantAttributeSchema>

// ── Supplier Junction Schemas ────────────────────────────────────────────────

export const productSupplierSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  product_variant_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid(),
  supplier_product_code: z.string().max(100).optional().nullable(),
  supplier_barcode: z.string().max(100).optional().nullable(),
  purchase_uom_id: z.string().uuid().optional().nullable(),
  minimum_order_qty: z.coerce.number().default(0),
  lead_time_days: z.coerce.number().default(0),
  unit_cost: z.coerce.number().default(0),
  is_preferred: z.boolean().default(false),
  is_active: z.boolean().default(true),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  supplier: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string().optional().nullable(),
      contact_person: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
    })
    .optional(),
  purchase_uom: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string(),
    })
    .optional()
    .nullable(),
})
export type ProductSupplier = z.infer<typeof productSupplierSchema>

export const supplierRowSchema = z.object({
  id: z.string().optional(),
  supplier_id: z.string().min(1, 'Supplier is required'),
  supplier_product_code: z.string().optional().nullable(),
  supplier_barcode: z.string().optional().nullable(),
  purchase_uom_id: z.string().optional().nullable().or(z.literal('')),
  minimum_order_qty: z.coerce.number().default(0),
  lead_time_days: z.coerce.number().default(0),
  unit_cost: z.coerce.number().default(0),
  is_preferred: z.boolean().default(false),
  is_active: z.boolean().default(true),
})
export type SupplierRowFormData = z.infer<typeof supplierRowSchema>

// ── Product Media Schemas ────────────────────────────────────────────────────

export const productMediaSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  storage_path: z.string().max(500),
  file_name: z.string().max(255),
  mime_type: z.string().max(100).default('image/jpeg'),
  file_size: z.union([z.number(), z.bigint()]).optional().nullable(),
  alt_text: z.string().max(255).optional().nullable(),
  sort_order: z.number().int().default(0),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
})
export type ProductMedia = z.infer<typeof productMediaSchema>

// ── Product Variants Schemas ─────────────────────────────────────────────────

export const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().max(100).optional().nullable(),
  name: z.string().max(200).optional().nullable(),
  tax_rate_id: z.string().uuid().optional().nullable().or(z.literal('')),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.any().optional().nullable(),
  is_active: z.boolean().default(true),
  expiration_date: z.string().optional().nullable(),
  uom_id: z.string().uuid().optional().nullable().or(z.literal('')),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  attributes_label: z.string().optional(),
  // Joined relation fields
  tax_rates: z.custom<TaxRateBrief>().optional().nullable(),
  price_list_items: z.array(z.any()).optional(),
  stock_balances: z.array(z.any()).optional(),
  product_variant_attributes: z.array(productVariantAttributeSchema).optional(),
  product_barcodes: z.array(z.any()).optional(),
})
export type ProductVariant = z.infer<typeof productVariantSchema>

export const variantRowSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  tax_rate_id: z.string().uuid().optional().nullable().or(z.literal('')),
  tax_rates: z.custom<TaxRateBrief>().optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  expiration_date: z.union([z.date(), z.string()]).optional().nullable(),
  uom_id: z.string().uuid().optional().nullable().or(z.literal('')),
  attributes_label: z.string().optional(),
  price: z.coerce.number().optional().default(0),
  cost_price: z.coerce.number().optional().default(0),
  attributes: z
    .array(
      z.object({
        attributeDefinitionId: z.string(),
        attributeValueId: z.string(),
      })
    )
    .optional(),
})
export type VariantRowFormData = z.infer<typeof variantRowSchema>

// ── Product Master Schema ────────────────────────────────────────────────────

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  product_code: z.string().max(30).optional().nullable(),
  name: z.string().min(1, 'Product name is required').max(200),
  name_ar: z.string().max(200).optional().nullable(),
  description: z.string().optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().max(100).optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.string().max(50).optional().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  has_variants: z.boolean().default(false),
  is_deleted: z.boolean().default(false),
  deleted_at: z.string().optional().nullable(),
  has_expiration: z.boolean().default(false),
  is_marketplace: z.boolean().default(false),
  base_uom_id: z.string().uuid().optional().nullable().or(z.literal('')),
  brand_id: z.string().uuid().optional().nullable().or(z.literal('')),
  category_id: z.string().uuid().optional().nullable().or(z.literal('')),
  supplier_id: z.string().uuid().optional().nullable().or(z.literal('')),
  product_type: productTypeEnum.default('simple'),
  product_type_id: z.string().uuid().optional().nullable().or(z.literal('')),
  tracking_mode: trackingModeEnum.default('none'),
  is_stock_item: z.boolean().default(true),
  reorderable: z.boolean().default(true),
  is_batch_tracked: z.boolean().default(false),
  is_serial_tracked: z.boolean().default(false),
  product_variants: z.array(productVariantSchema).optional(),
  product_suppliers: z.array(productSupplierSchema).optional(),
  product_media: z.array(productMediaSchema).optional(),
})

export type Product = z.infer<typeof productSchema> & {
  // Legacy / convenience aliases
  product_id?: string | number
  categories?: { id?: string; name: string; name_ar?: string | null } | null
  brands?: { id?: string; name: string; name_ar?: string | null; code?: string | null } | null
  base_uom?: { id?: string; name: string; code?: string } | null
  suppliers?: { id?: string; name: string; code?: string | null } | null
  product_types?: {
    id?: string
    name: string
    name_ar?: string | null
    code?: string | null
    icon?: string | null
    color?: string | null
  } | null
}

export const baseProductSchema = z.object({
  product_code: z.string().max(30).optional().nullable(),
  name: z.string().min(1, 'Product name is required').max(200),
  name_ar: z.string().max(200).optional().nullable(),
  description: z.string().optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().max(100).optional().nullable(),
  category_id: z.string().uuid().optional().nullable().or(z.literal('')),
  brand_id: z.string().uuid().optional().nullable().or(z.literal('')),
  base_uom_id: z.string().uuid().optional().nullable().or(z.literal('')),
  supplier_id: z.string().uuid().optional().nullable().or(z.literal('')),
  product_type: productTypeEnum.default('simple'),
  product_type_id: z.string().uuid().optional().nullable().or(z.literal('')),
  tracking_mode: trackingModeEnum.default('none'),
  weight: z.coerce.number().optional().nullable(),
  dimensions: z.string().max(50).optional().nullable(),
  is_active: z.boolean().default(true),
  is_stock_item: z.boolean().default(true),
  reorderable: z.boolean().default(true),
  is_batch_tracked: z.boolean().default(false),
  is_serial_tracked: z.boolean().default(false),
  has_variants: z.boolean().default(false),
  has_expiration: z.boolean().default(false),
  is_marketplace: z.boolean().default(false),
})
export type BaseProductFormData = z.infer<typeof baseProductSchema>

export const productWizardSchema = z.object({
  base: baseProductSchema,
  variants: z
    .array(variantRowSchema)
    .min(1, 'At least one variant is required'),
  suppliers: z.array(supplierRowSchema).optional(),
})
export type ProductWizardFormData = z.infer<typeof productWizardSchema>

export const productActionFormSchema = baseProductSchema.extend({
  variants: z.array(variantRowSchema).optional(),
  suppliers: z.array(supplierRowSchema).optional(),
})
export type ProductActionFormData = z.infer<typeof productActionFormSchema>
