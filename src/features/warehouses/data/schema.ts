import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const locationTypeSchema = z.enum(['zone', 'rack', 'shelf', 'bin'])
export type LocationType = z.infer<typeof locationTypeSchema>

// Phone validation: permits international format (e.g., +1234567890, (123) 456-7890, etc.) or empty
const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/

export const warehouseInputSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  storeId: z.string().uuid().optional().nullable(),
  countryId: z.string().uuid().optional().nullable(),
  cityId: z.string().uuid().optional().nullable(),
  warehouseTypeId: z.string().uuid().optional().nullable(),
  code: z
    .string()
    .min(1, 'Code is required.')
    .max(30, 'Code cannot exceed 30 characters.')
    .trim(),
  name: z
    .string()
    .min(1, 'Name is required.')
    .max(120, 'Name cannot exceed 120 characters.')
    .trim(),
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format.')
    .optional()
    .nullable()
    .or(z.literal('')),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z.string().max(255, 'Address cannot exceed 255 characters.').optional().nullable(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters.').optional().nullable(),
  allowNegativeStock: z.boolean().optional().default(false),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
})
export type WarehouseInput = z.infer<typeof warehouseInputSchema>

export const locationInputSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  locationType: locationTypeSchema,
  code: z
    .string()
    .min(1, 'Code is required.')
    .max(50, 'Code cannot exceed 50 characters.')
    .trim(),
  name: z.string().max(100, 'Name cannot exceed 100 characters.').optional().nullable(),
  isPickable: z.boolean().optional().default(true),
  isReceivable: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
})
export type LocationInput = z.infer<typeof locationInputSchema>

export const warehouseListItemSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  is_default: z.boolean(),
  is_active: z.boolean(),
  allow_negative_stock: z.boolean().optional().default(false),
  country_id: z.string().uuid().nullable().optional(),
  city_id: z.string().uuid().nullable().optional(),
  branch_id: z.string().uuid().nullable().optional(),
  store_id: z.string().uuid().nullable().optional(),
  warehouse_type_id: z.string().uuid().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]).optional().nullable(),
  updated_at: z.union([z.string(), z.date()]).optional().nullable(),
  store_warehouses: z
    .array(
      z.object({
        id: z.string().uuid(),
        is_default: z.boolean(),
        priority: z.number().int(),
        allow_fulfillment: z.boolean().optional(),
        allow_replenishment: z.boolean().optional(),
        allow_returns: z.boolean().optional(),
        lead_time_days: z.number().int().nullable().optional(),
        distance_km: z.coerce.number().nullable().optional(),
        transit_cost: z.coerce.number().nullable().optional(),
        is_active: z.boolean().optional(),
        stores: z
          .object({
            store_id: z.string(),
            name: z.string().nullable().optional(),
          })
          .nullable()
          .optional(),
      })
    )
    .optional()
    .default([]),
  stores: z
    .object({
      store_id: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  branches: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  countries: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      code: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  cities: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  _count: z
    .object({
      warehouse_locations: z.number().optional().default(0),
      stock_balances: z.number().optional().default(0),
    })
    .optional()
    .nullable(),
})
export type WarehouseListItem = z.infer<typeof warehouseListItemSchema>

export const warehouseLocationSchema = z.object({
  id: z.string().uuid(),
  warehouse_id: z.string(),
  parent_id: z.string().nullable(),
  location_type: locationTypeSchema,
  code: z.string(),
  name: z.string().nullable(),
  path: z.string().nullable(),
  is_default: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  is_pickable: z.boolean().optional().default(true),
  is_receivable: z.boolean().optional().default(true),
})
export type WarehouseLocation = z.infer<typeof warehouseLocationSchema>

export const warehouseListResponseSchema = successEnvelope(
  z.array(warehouseListItemSchema)
)
export const locationListResponseSchema = successEnvelope(
  z.array(warehouseLocationSchema)
)

