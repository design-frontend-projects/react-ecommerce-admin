import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

const safeNumber = (defaultVal = 0) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return defaultVal
    const num = Number(val)
    return isNaN(num) ? defaultVal : num
  }, z.number())

const safeNullableNumber = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return null
  const num = Number(val)
  return isNaN(num) ? null : num
}, z.number().nullable().optional())

export const movementRowSchema = z
  .object({
    id: z.string(),
    movement_no: z.preprocess(
      (val) => (val != null ? String(val) : null),
      z.string().nullable().optional()
    ),
    movement_type: z.string(),
    reference_type: z.string().nullable().optional(),
    reference_id: z.string().nullable().optional(),
    warehouse_id: z.string().nullable().optional(),
    warehouse_location_id: z.string().nullable().optional(),
    location_id: z.string().nullable().optional(),
    condition: z.string().nullable().optional().default('good'),
    batch_id: z.string().nullable().optional(),
    serial_id: z.string().nullable().optional(),
    quantity_delta: safeNullableNumber,
    qty_before: safeNullableNumber,
    qty_in: safeNumber(0).optional(),
    qty_out: safeNumber(0).optional(),
    qty_after: safeNullableNumber,
    unit_cost: safeNumber(0).default(0),
    total_cost: safeNumber(0).default(0),
    movement_date: z.preprocess(
      (val) =>
        val instanceof Date
          ? val.toISOString()
          : val != null
            ? String(val)
            : new Date().toISOString(),
      z.string()
    ),
    remarks: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    source_document_id: z.string().nullable().optional(),
    source_document_type: z.string().nullable().optional(),
    store_id: z.string().nullable().optional(),
    product_variant_id: z.string(),
    product_variants: z
      .object({
        id: z.string(),
        sku: z.string().nullable().optional(),
        barcode: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    warehouses: z
      .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        code: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    warehouse_locations: z
      .object({
        id: z.string(),
        code: z.string().optional(),
        name: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    stores: z
      .object({
        store_id: z.string(),
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
  })
  .transform((row) => {
    const delta = row.quantity_delta ?? 0
    const qty_in =
      row.qty_in !== undefined && row.qty_in > 0
        ? row.qty_in
        : delta > 0
          ? delta
          : 0
    const qty_out =
      row.qty_out !== undefined && row.qty_out > 0
        ? row.qty_out
        : delta < 0
          ? Math.abs(delta)
          : 0
    return {
      ...row,
      quantity_delta: delta,
      qty_in,
      qty_out,
    }
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

