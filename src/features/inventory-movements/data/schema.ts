import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const movementRowSchema = z.object({
  id: z.string().uuid(),
  movement_no: z.coerce.string().nullable().optional(),
  movement_type: z.string(),
  reference_type: z.string().nullable(),
  reference_id: z.string().nullable(),
  warehouse_id: z.string().nullable().optional(),
  warehouse_location_id: z.string().nullable().optional(),
  condition: z.string().default('good').optional(),
  batch_id: z.string().nullable().optional(),
  serial_id: z.string().nullable().optional(),
  qty_before: z.coerce.number().optional().nullable(),
  qty_in: z.coerce.number(),
  qty_out: z.coerce.number(),
  qty_after: z.coerce.number().optional().nullable(),
  unit_cost: z.coerce.number(),
  total_cost: z.coerce.number(),
  movement_date: z.string(),
  remarks: z.string().nullable(),
  store_id: z.string().nullable(),
  product_variant_id: z.string(),
  product_variants: z
    .object({ id: z.string(), sku: z.string(), barcode: z.string().nullable().optional() })
    .nullable()
    .optional(),
  warehouses: z
    .object({ id: z.string(), name: z.string().nullable(), code: z.string().nullable().optional() })
    .nullable()
    .optional(),
  warehouse_locations: z
    .object({ id: z.string(), code: z.string().optional(), name: z.string().nullable().optional() })
    .nullable()
    .optional(),
  stores: z
    .object({ store_id: z.string(), name: z.string().nullable() })
    .nullable()
    .optional(),
  branches: z
    .object({ id: z.string(), name: z.string().nullable() })
    .nullable()
    .optional(),
})

export type MovementRow = z.infer<typeof movementRowSchema>

export const movementsResponseSchema = successEnvelope(
  z.array(movementRowSchema)
)

export interface MovementFilters {
  movementType?: string
  warehouseId?: string
  storeId?: string
  productVariantId?: string
  referenceType?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}

