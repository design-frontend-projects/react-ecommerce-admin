import { z } from 'zod'

const successEnvelope = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ success: z.literal(true), data: schema })

export const shipmentStatusSchema = z.enum([
  'draft',
  'confirmed',
  'picking',
  'packed',
  'delivered',
  'invoiced',
  'completed',
  'cancelled',
])
export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>

export const shipmentItemInputSchema = z.object({
  productVariantId: z.string().uuid('Select a product variant.'),
  shippedQty: z.coerce.number().positive('Quantity must be greater than 0.'),
  unitCost: z.coerce.number().min(0).optional(),
})

export const createShipmentInputSchema = z.object({
  warehouseId: z.string().uuid('Select a warehouse.'),
  salesOrderId: z.string().uuid().optional().nullable(),
  items: z.array(shipmentItemInputSchema).min(1, 'Add at least one item.'),
})

export type ShipmentItemInput = z.infer<typeof shipmentItemInputSchema>
export type CreateShipmentInput = z.infer<typeof createShipmentInputSchema>

export const salesShipmentListItemSchema = z.object({
  id: z.string().uuid(),
  shipment_no: z.string(),
  warehouse_id: z.string(),
  sales_order_id: z.string().nullable().optional(),
  status: shipmentStatusSchema,
  shipped_at: z.string().nullable().optional(),
  created_at: z.string(),
  warehouses: z
    .object({ id: z.string(), name: z.string(), code: z.string() })
    .nullable()
    .optional(),
  items: z.array(z.unknown()).optional(),
})

export type SalesShipmentListItem = z.infer<typeof salesShipmentListItemSchema>

export const salesShipmentsResponseSchema = successEnvelope(
  z.array(salesShipmentListItemSchema)
)
