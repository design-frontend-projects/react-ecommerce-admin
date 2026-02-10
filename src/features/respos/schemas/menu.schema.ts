// ResPOS Menu Zod Schemas
import { z } from 'zod'

// ============ Menu Category Schemas ============

// Form schema with explicit required types (avoids RHF resolver issues)
export const menuCategoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  name_ar: z.string().max(100).optional(),
  icon: z.string().max(50).optional(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
})

export type MenuCategoryForm = z.infer<typeof menuCategoryFormSchema>

// ============ Menu Item Schemas ============

// Inline variant schema for the form
const variantInlineSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Variant name is required'),
  price_adjustment: z.number(),
  is_default: z.boolean(),
})

// Inline property schema for the form
const propertyInlineSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Property name is required'),
  is_required: z.boolean(),
  max_selections: z.number().int().min(1),
  options: z.array(
    z.object({
      name: z.string().min(1, 'Option name is required'),
      price: z.number().min(0),
    })
  ),
})

export const menuItemFormSchema = z.object({
  category_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Name is required').max(200),
  name_ar: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  description_ar: z.string().max(1000).optional(),
  base_price: z.number().min(0, 'Price must be positive'),
  image_url: z.string().url().optional().or(z.literal('')),
  is_available: z.boolean(),
  preparation_time: z.number().int().min(1),
  allergens: z.array(z.string()),
  tags: z.array(z.string()),
  variants: z.array(variantInlineSchema),
  properties: z.array(propertyInlineSchema),
})

export type MenuItemForm = z.infer<typeof menuItemFormSchema>

// ============ Item Variant Schemas ============

export const itemVariantFormSchema = z.object({
  item_id: z.string().uuid(),
  name: z.string().min(1, 'Variant name is required').max(100),
  price_adjustment: z.number(),
  is_default: z.boolean(),
})

export type ItemVariantForm = z.infer<typeof itemVariantFormSchema>

// ============ Item Property Schemas ============

export const propertyOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required'),
  price: z.number().min(0),
})

export const itemPropertyFormSchema = z.object({
  item_id: z.string().uuid(),
  name: z.string().min(1, 'Property name is required').max(100),
  options: z
    .array(propertyOptionSchema)
    .min(1, 'At least one option is required'),
  is_required: z.boolean(),
  max_selections: z.number().int().min(1),
})

export type PropertyOption = z.infer<typeof propertyOptionSchema>
export type ItemPropertyForm = z.infer<typeof itemPropertyFormSchema>
