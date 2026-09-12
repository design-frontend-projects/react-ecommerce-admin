import { z } from 'zod'

export const storeWarehouseItemSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  store_id: z.string(),
  warehouse_id: z.string(),
  is_default: z.boolean(),
  priority: z.number().int(),
  allow_fulfillment: z.boolean().default(true),
  allow_replenishment: z.boolean().default(true),
  allow_returns: z.boolean().default(true),
  lead_time_days: z.number().int().nullable().optional(),
  distance_km: z.coerce.number().nullable().optional(),
  transit_cost: z.coerce.number().nullable().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.date()]).optional().nullable(),
  updated_at: z.union([z.string(), z.date()]).optional().nullable(),
  warehouses: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      address: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      is_active: z.boolean().optional(),
      cities: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable()
        .optional(),
      branches: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable()
        .optional(),
    })
    .optional(),
  stores: z
    .object({
      store_id: z.string(),
      name: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      status: z.boolean().nullable().optional(),
      cities: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable()
        .optional(),
    })
    .optional(),
})

export type StoreWarehouseItem = z.infer<typeof storeWarehouseItemSchema>

export const storeWarehouseListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(storeWarehouseItemSchema),
})

export const storeWarehouseInputSchema = z.object({
  storeId: z.string().uuid('Invalid store ID'),
  warehouseId: z.string().uuid('Please select a warehouse'),
  isDefault: z.boolean().default(false),
  priority: z.coerce.number().int().min(1, 'Priority must be at least 1').default(1),
  allowFulfillment: z.boolean().default(true),
  allowReplenishment: z.boolean().default(true),
  allowReturns: z.boolean().default(true),
  leadTimeDays: z.coerce.number().int().min(0).optional().nullable(),
  distanceKm: z.coerce.number().min(0).optional().nullable(),
  transitCost: z.coerce.number().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
})

export type StoreWarehouseInput = z.infer<typeof storeWarehouseInputSchema>

export const storeWarehouseUpdateSchema = z.object({
  isDefault: z.boolean().optional(),
  priority: z.coerce.number().int().min(1).optional(),
  allowFulfillment: z.boolean().optional(),
  allowReplenishment: z.boolean().optional(),
  allowReturns: z.boolean().optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional().nullable(),
  distanceKm: z.coerce.number().min(0).optional().nullable(),
  transitCost: z.coerce.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
})

export type StoreWarehouseUpdateInput = z.infer<typeof storeWarehouseUpdateSchema>
