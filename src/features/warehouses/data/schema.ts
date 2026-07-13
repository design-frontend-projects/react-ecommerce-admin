import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const locationTypeSchema = z.enum(['zone', 'rack', 'shelf', 'bin'])
export type LocationType = z.infer<typeof locationTypeSchema>

export const warehouseInputSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  storeId: z.string().uuid().optional().nullable(),
  code: z.string().min(1, 'Code is required.').max(30),
  name: z.string().min(1, 'Name is required.').max(120),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
export type WarehouseInput = z.infer<typeof warehouseInputSchema>

export const locationInputSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  locationType: locationTypeSchema,
  code: z.string().min(1, 'Code is required.').max(50),
  name: z.string().optional().nullable(),
  isPickable: z.boolean().optional(),
  isReceivable: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
export type LocationInput = z.infer<typeof locationInputSchema>

export const warehouseListItemSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  is_default: z.boolean(),
  is_active: z.boolean(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  stores: z
    .object({ store_id: z.string(), name: z.string().nullable() })
    .nullable(),
  branches: z.object({ id: z.string(), name: z.string() }).nullable(),
  _count: z.object({ warehouse_locations: z.number() }).optional(),
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
  is_default: z.boolean(),
  is_active: z.boolean(),
  is_pickable: z.boolean(),
  is_receivable: z.boolean(),
})
export type WarehouseLocation = z.infer<typeof warehouseLocationSchema>

export const warehouseListResponseSchema = successEnvelope(
  z.array(warehouseListItemSchema)
)
export const locationListResponseSchema = successEnvelope(
  z.array(warehouseLocationSchema)
)
