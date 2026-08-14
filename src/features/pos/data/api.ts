import { v4 as uuidv4 } from 'uuid'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { generateInvoiceNumber } from '@/lib/utils/invoice-generator'
import type { CheckoutRequestType } from '../schemas/checkout'
import type { CheckoutResponse } from '../types'

export type PosProductVariant = {
  id: string
  sku: string
  barcode: string | null
  price: number
  stock_quantity: number
  min_stock: number
  is_active: boolean
  dimensions?: string | null
}

export type PosProduct = {
  product_id: number
  name: string
  sku: string
  barcode: string | null
  base_price: number
  category_id: string | null
  category_name: string | null
  has_variants: boolean
  product_variants: PosProductVariant[]
}

export type PosCategory = {
  category_id: string
  name: string
  slug: string
}

export async function getPosProducts(): Promise<PosProduct[]> {
  // Offline reads are served by the persisted query cache + the service-worker
  // Supabase cache (NetworkFirst), so no per-call IndexedDB fallback is needed.
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      product_id,
      store_id,
      category_id,
      categories ( name ),
      name,
      description,
      sku,
      barcode,
      base_price,
      is_active,
      has_variants,
      product_variants ( id, sku, barcode, price, dimensions, stock_quantity, min_stock, is_active )
    `
    )
    .eq('is_active', true)
    .neq('is_deleted', true)
    .order('name')

  if (error) throw error

  const mapped = (data || []).map((p) => {
    const categoryName = Array.isArray(p.categories)
      ? p.categories[0]?.name
      : (p.categories as { name?: string } | null)?.name

    return {
      product_id: p.product_id,
      store_id: p.store_id || '',
      name: p.name,
      sku: p.sku || '',
      barcode: p.barcode,
      base_price: Number(p.base_price || 0),
      category_id: p.category_id,
      category_name: categoryName || null,
      has_variants: !!p.has_variants,
      product_variants:
        p.product_variants?.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          barcode: variant.barcode,
          price: Number(variant.price || 0),
          stock_quantity: Number(variant.stock_quantity || 0),
          min_stock: Number(variant.min_stock || 0),
          is_active: variant.is_active ?? true,
          dimensions: variant.dimensions,
        })) || [],
      description: p.description,
      is_active: p.is_active ? 1 : 0,
    }
  })

  return mapped.map((p) => ({
    product_id: p.product_id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    base_price: p.base_price,
    category_id: String(p.category_id),
    category_name: p.category_name,
    has_variants: p.has_variants,
    product_variants: p.product_variants,
  }))
}

export async function getPosCategories(): Promise<PosCategory[]> {
  // Offline reads are served by the persisted query cache + the service-worker
  // Supabase cache; no per-call IndexedDB fallback is needed.
  const { data, error } = await supabase
    .from('categories')
    .select('category_id, name, slug')
    .order('name')

  if (error) {
    console.error('Error fetching categories:', error) // eslint-disable-line no-console
    return []
  }

  return data.map((c) => ({
    category_id: c.category_id,
    name: c.name,
    slug: c.slug,
  }))
}

export async function getInclusiveTaxRates() {
  const { data, error } = await supabase
    .from('tax_rates')
    .select('*')
    .eq('is_active', true)
    .eq('is_inclusive', true)

  if (error) {
    console.error('Error fetching inclusive tax rates:', error) // eslint-disable-line no-console
    return []
  }
  return data || []
}

export async function validatePosPromotion(code: string) {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Promotion code not found or inactive.')
    }
    throw new Error(`Error fetching promotion: ${error.message}`)
  }

  const now = new Date()
  if (data.start_date && new Date(data.start_date) > now) {
    throw new Error('Promotion has not started yet.')
  }
  if (data.end_date && new Date(data.end_date) < now) {
    throw new Error('Promotion has expired.')
  }

  if (data.usage_limit) {
    const { count } = await supabase
      .from('promotion_usage')
      .select('*', { count: 'exact', head: true })
      .eq('promotion_id', data.promotion_id)

    if (count !== null && count >= data.usage_limit) {
      throw new Error('Promotion usage limit reached.')
    }
  }

  // We are bypassing customer usage limit for walk-ins per plan approval.

  return data
}

type SerializedShipmentDetails = {
  recipientName?: string
  recipientPhone?: string
  deliveryAddress?: string
  city?: string
  state?: string
  postalCode?: string
  notes?: string
}

function isRestaurantModuleContext(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.location.pathname.includes('/respos')
  )
}

export function parseSerializedShipmentDetails(
  notes: string | null
): SerializedShipmentDetails | null {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as SerializedShipmentDetails
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function extractShipmentNotes(
  notes: string | null,
  details: SerializedShipmentDetails | null
) {
  if (details) {
    return details.notes ?? null
  }

  return notes
}

export const NON_RESTAURANT_SHIPMENT_STATUSES = [
  'prepared',
  'pending',
  'approved',
  'in_transit',
  'shipped',
  'delivered',
  'cancelled',
  'failed',
  'delayed',
  'refundable',
] as const

export type NonRestaurantShipmentStatus =
  (typeof NON_RESTAURANT_SHIPMENT_STATUSES)[number]

export function normalizeNonRestaurantShipmentStatus(
  status: string | null | undefined
): NonRestaurantShipmentStatus {
  const normalizedStatus = (status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

  if (
    (NON_RESTAURANT_SHIPMENT_STATUSES as readonly string[]).includes(
      normalizedStatus
    )
  ) {
    return normalizedStatus as NonRestaurantShipmentStatus
  }

  return 'prepared'
}

export function validateNonRestaurantShipmentStatus(
  status: string
): NonRestaurantShipmentStatus {
  const normalizedStatus = normalizeNonRestaurantShipmentStatus(status)

  if (
    normalizedStatus !== status.trim().toLowerCase().replace(/\s+/g, '_') &&
    !(
      status.trim().toLowerCase().replace(/\s+/g, '_') === 'prepared' &&
      normalizedStatus === 'prepared'
    )
  ) {
    throw new Error(`Invalid shipment status: ${status}`)
  }

  return normalizedStatus
}

export type NonRestaurantShipment = {
  shipment_id: number
  order_id: number
  tracking_number: string | null
  shipped_date: string | null
  delivered_date: string | null
  carrier: string | null
  status: NonRestaurantShipmentStatus
  notes: string | null
  recipient_name: string | null
  recipient_phone: string | null
  delivery_address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
}

type ShipmentsRow = {
  shipment_id: number
  order_id: number
  tracking_number: string | null
  shipped_date: string | null
  delivered_date: string | null
  carrier: string | null
  status: string | null
  notes: string | null
}

export type NonRestaurantShipmentUpdateInput = {
  shipmentId: string | number
  status: string
  tracking_number?: string | null
  carrier?: string | null
  notes?: string | null
}

type ShipmentStatusUpdateBase = {
  status: NonRestaurantShipmentStatus
  shipped_date?: string | null
  delivered_date?: string | null
}

export function buildNonRestaurantShipmentNotesUpdate(params: {
  existingNotes: string | null
  nextNotes: string | null
}): string | null {
  const { existingNotes, nextNotes } = params
  const parsedDetails = parseSerializedShipmentDetails(existingNotes)

  if (!parsedDetails) {
    return nextNotes
  }

  const mergedDetails: SerializedShipmentDetails = {
    ...parsedDetails,
    notes: nextNotes ?? undefined,
  }

  return JSON.stringify(mergedDetails)
}

export function buildNonRestaurantShipmentStatusUpdates(params: {
  nextStatus: NonRestaurantShipmentStatus
  existing: Pick<ShipmentsRow, 'shipped_date' | 'delivered_date'>
  nowIso?: string
}): ShipmentStatusUpdateBase {
  const { nextStatus, existing, nowIso = new Date().toISOString() } = params
  const updates: ShipmentStatusUpdateBase = { status: nextStatus }

  if (
    (nextStatus === 'shipped' || nextStatus === 'in_transit') &&
    !existing.shipped_date
  ) {
    updates.shipped_date = nowIso
  }

  if (nextStatus === 'delivered') {
    updates.delivered_date = nowIso

    if (!existing.shipped_date) {
      updates.shipped_date = nowIso
    }
  }

  if (nextStatus === 'prepared') {
    updates.shipped_date = null
    updates.delivered_date = null
  }

  return updates
}

function mapNonRestaurantShipmentRow(
  shipment: ShipmentsRow
): NonRestaurantShipment {
  const details = parseSerializedShipmentDetails(shipment.notes)

  return {
    shipment_id: shipment.shipment_id,
    order_id: shipment.order_id,
    tracking_number: shipment.tracking_number,
    shipped_date: shipment.shipped_date,
    delivered_date: shipment.delivered_date,
    carrier: shipment.carrier,
    status: normalizeNonRestaurantShipmentStatus(shipment.status),
    notes: extractShipmentNotes(shipment.notes, details),
    recipient_name: details?.recipientName || null,
    recipient_phone: details?.recipientPhone || null,
    delivery_address: details?.deliveryAddress || null,
    city: details?.city || null,
    state: details?.state || null,
    postal_code: details?.postalCode || null,
  }
}

export async function getNonRestaurantShipments(): Promise<
  NonRestaurantShipment[]
> {
  const { data, error } = await supabase
    .from('shipments')
    .select(
      'shipment_id, order_id, tracking_number, shipped_date, delivered_date, carrier, status, notes'
    )
    .order('shipment_id', { ascending: false })

  if (error) throw error

  return (data as ShipmentsRow[] | null)?.map(mapNonRestaurantShipmentRow) ?? []
}

export async function updateNonRestaurantShipment(
  input: NonRestaurantShipmentUpdateInput
) {
  const numericShipmentId = Number(input.shipmentId)

  if (!Number.isFinite(numericShipmentId)) {
    throw new Error(`Invalid shipment id: ${input.shipmentId}`)
  }

  const nextStatus = validateNonRestaurantShipmentStatus(input.status)

  const { data: existing, error: existingError } = await supabase
    .from('shipments')
    .select('shipment_id, shipped_date, delivered_date, notes')
    .eq('shipment_id', numericShipmentId)
    .single()

  if (existingError) throw existingError

  const statusUpdates = buildNonRestaurantShipmentStatusUpdates({
    nextStatus,
    existing: existing as Pick<ShipmentsRow, 'shipped_date' | 'delivered_date'>,
  })

  const updates: {
    status: NonRestaurantShipmentStatus
    shipped_date?: string | null
    delivered_date?: string | null
    tracking_number?: string | null
    carrier?: string | null
    notes?: string | null
  } = {
    ...statusUpdates,
  }

  if ('tracking_number' in input) {
    updates.tracking_number = input.tracking_number ?? null
  }

  if ('carrier' in input) {
    updates.carrier = input.carrier ?? null
  }

  if ('notes' in input) {
    updates.notes = buildNonRestaurantShipmentNotesUpdate({
      existingNotes: (existing as Pick<ShipmentsRow, 'notes'>).notes ?? null,
      nextNotes: input.notes ?? null,
    })
  }

  const { error } = await supabase
    .from('shipments')
    .update(updates)
    .eq('shipment_id', numericShipmentId)

  if (error) throw error

  return { id: String(numericShipmentId), ...updates }
}

type PosSalesOrderRow = {
  sale_id: number
  sale_date: string | null
  status: string | null
  payment_method: string | null
  subtotal: number | string | null
  discount_amount: number | string | null
  tax_amount: number | string | null
  total_amount: number | string | null
}

type PosSaleItemWithProductRow = {
  sale_item_id: number
  product_id: number
  quantity: number | string
  unit_price: number | string
  subtotal: number | string | null
  products:
    | {
        name: string | null
        sku: string | null
      }
    | Array<{
        name: string | null
        sku: string | null
      }>
    | null
}

export type NonRestaurantShipmentOrderItem = {
  sale_item_id: number | string
  product_id: number | string
  product_name: string | null
  product_sku: string | null
  quantity: number
  unit_price: number
  line_subtotal: number
}

export type NonRestaurantShipmentOrderDetails = {
  sale_id: number | string
  sale_date: string | null
  status: string | null
  payment_method: string | null
  subtotal: number | string | null
  discount_amount: number | string | null
  tax_amount: number | string | null
  total_amount: number | string | null
  items: NonRestaurantShipmentOrderItem[]
}

export type NonRestaurantShipmentDetails = {
  shipment: NonRestaurantShipment
  order: NonRestaurantShipmentOrderDetails | null
}

export async function getNonRestaurantShipmentDetails(
  shipmentId: string | number
): Promise<NonRestaurantShipmentDetails> {
  const numericShipmentId = Number(shipmentId)

  if (!Number.isFinite(numericShipmentId)) {
    throw new Error(`Invalid shipment id: ${shipmentId}`)
  }

  const { data: shipmentRow, error: shipmentError } = await supabase
    .from('shipments')
    .select(
      'id, sales_invoice_id, order_id, tracking_number, shipped_date, delivered_date, carrier, status, notes'
    )
    .eq('id', numericShipmentId)
    .single()

  if (shipmentError) throw shipmentError

  const shipment = mapNonRestaurantShipmentRow(shipmentRow as ShipmentsRow)

  const invoiceId = (shipmentRow as any).sales_invoice_id
  if (invoiceId) {
    const { data: invoiceRow, error: invoiceError } = await supabase
      .from('sales_invoices')
      .select(
        'id, invoice_date, status, subtotal, discount_amount, tax_amount, total_amount'
      )
      .eq('id', invoiceId)
      .maybeSingle()

    if (invoiceError) throw invoiceError

    if (!invoiceRow) {
      return {
        shipment,
        order: null,
      }
    }

    const { data: invoiceItems, error: itemsError } = await supabase
      .from('sales_invoice_items')
      .select(
        'id, product_variant_id, quantity, unit_price, line_subtotal, product_variants(products(name, sku))'
      )
      .eq('invoice_id', invoiceRow.id)
      .order('line_no', { ascending: true })

    if (itemsError) throw itemsError

    const mappedItems: NonRestaurantShipmentOrderItem[] =
      ((invoiceItems as any[]) || []).map((item) => {
        const product = Array.isArray(item.product_variants?.products)
          ? item.product_variants?.products[0]
          : item.product_variants?.products
        const quantity = Number(item.quantity || 0)
        const unitPrice = Number(item.unit_price || 0)

        return {
          sale_item_id: item.id,
          product_id: item.product_variant_id,
          product_name: product?.name || null,
          product_sku: product?.sku || null,
          quantity,
          unit_price: unitPrice,
          line_subtotal:
            item.line_subtotal !== null && item.line_subtotal !== undefined
              ? Number(item.line_subtotal)
              : quantity * unitPrice,
        }
      })

    return {
      shipment,
      order: {
        sale_id: invoiceRow.id,
        sale_date: invoiceRow.invoice_date,
        status: invoiceRow.status,
        payment_method: 'sale',
        subtotal: invoiceRow.subtotal,
        discount_amount: invoiceRow.discount_amount,
        tax_amount: invoiceRow.tax_amount,
        total_amount: invoiceRow.total_amount,
        items: mappedItems,
      },
    }
  }

  return {
    shipment,
    order: null,
  }
}

export async function createPosTransaction(
  payload: CheckoutRequestType
): Promise<CheckoutResponse> {
  const selectedBranchId = useAuthStore.getState().auth.selectedBranchId

  if (!selectedBranchId) {
    return {
      success: false,
      error: {
        code: 'BRANCH_REQUIRED',
        message: 'Please select a branch before checkout.',
      },
    }
  }

  const firstInvalidItem = payload.items.find((item) => !item.productVariantId)
  if (firstInvalidItem) {
    return {
      success: false,
      error: {
        code: 'VARIANT_ID_REQUIRED',
        message: `Missing product variant ID for product ${firstInvalidItem.productId}.`,
      },
    }
  }

  const normalizedItems = payload.items.map((item) => ({
    ...item,
    productVariantId: item.productVariantId as string,
  }))

  try {
    const isRestaurant = isRestaurantModuleContext()
    const invoiceNo = generateInvoiceNumber()
    const transactionId = uuidv4()

    // 1. Create Sales Invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('sales_invoices')
      .insert({
        branch_id: selectedBranchId,
        store_id: payload.storeId,
        customer_id: payload.customerId,
        invoice_no: invoiceNo,
        invoice_date: new Date().toISOString(),
        status: 'paid',
        subtotal: payload.subtotal,
        total_amount: payload.totalAmount,
        discount_amount: payload.discountTotal || 0,
        tax_amount: payload.taxTotal || 0,
        paid_amount: payload.totalAmount,
        notes: payload.notes,
      })
      .select('id')
      .single()

    if (invoiceError)
      throw new Error(`Invoice creation failed: ${invoiceError.message}`)

    // 2. Create Sales Invoice Items
    const invoiceItems = normalizedItems.map((item, index) => ({
      invoice_id: invoice.id,
      product_variant_id: item.productVariantId,
      line_no: index + 1,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_subtotal: item.quantity * item.unitPrice,
      line_total:
        item.quantity * item.unitPrice -
        (item.discountAmount || 0) +
        (item.taxAmount || 0),
      discount_amount: item.discountAmount || 0,
      tax_amount: item.taxAmount || 0,
    }))

    const { error: itemsError } = await supabase
      .from('sales_invoice_items')
      .insert(invoiceItems)

    if (itemsError)
      throw new Error(`Invoice items creation failed: ${itemsError.message}`)

    // 3. Create Restaurant Order (restaurant module only)
    let restaurantOrderId: string | null = null
    if (isRestaurant) {
      const orderId = uuidv4()
      const { data: resOrder, error: orderError } = await supabase
        .from('res_orders')
        .insert({
          id: orderId,
          order_number: invoiceNo,
          total_amount: payload.totalAmount,
          subtotal: payload.subtotal,
          tax_amount: payload.taxTotal || 0,
          discount_amount: payload.discountTotal || 0,
          status: 'completed',
          payment_method: payload.paymentMethod,
          paid_at: new Date().toISOString(),
          notes: payload.notes,
        })
        .select('id')
        .single()

      if (orderError)
        throw new Error(`Order creation failed: ${orderError.message}`)
      restaurantOrderId = resOrder.id
    }

    // Insert promotion usage if promotionId is present
    if (payload.promotionId) {
      const { error: promoUsageError } = await supabase
        .from('promotion_usage')
        .insert({
          promotion_id: payload.promotionId,
          customer_id: payload.customerId || null,
          res_order_id: restaurantOrderId || null,
        })
      if (promoUsageError) {
        console.warn('Failed to record promotion usage', promoUsageError) // eslint-disable-line no-console
      }
    }

    // 4. Create Shipment if requested
    if (payload.isShipment && payload.shipment) {
      if (isRestaurant) {
        const { error: shipmentError } = await supabase
          .from('res_shipments')
          .insert({
            order_id: restaurantOrderId,
            recipient_name: payload.shipment.recipientName,
            recipient_phone: payload.shipment.recipientPhone,
            delivery_address: payload.shipment.deliveryAddress,
            city: payload.shipment.city,
            state: payload.shipment.state,
            postal_code: payload.shipment.postalCode,
            notes: payload.shipment.notes,
            status: 'pending',
          })

        if (shipmentError)
          throw new Error(`Shipment creation failed: ${shipmentError.message}`)
      } else {
        const serializedShipment = JSON.stringify({
          recipientName: payload.shipment.recipientName,
          recipientPhone: payload.shipment.recipientPhone,
          deliveryAddress: payload.shipment.deliveryAddress,
          city: payload.shipment.city,
          state: payload.shipment.state,
          postalCode: payload.shipment.postalCode,
          notes: payload.shipment.notes,
        } satisfies SerializedShipmentDetails)

        const { error: shipmentError } = await supabase
          .from('shipments')
          .insert({
            sales_invoice_id: invoice.id,
            status: 'prepared',
            notes: serializedShipment,
          })

        if (shipmentError)
          throw new Error(`Shipment creation failed: ${shipmentError.message}`)
      }
    }

    // 5. Create Transaction record
    const { error: txError } = await supabase.from('transactions').insert({
      id: transactionId,
      transaction_number: `TRN-${invoiceNo}`,
      transaction_type: 'sale',
      tenant_id: payload.tenantId,
      status: 'completed',
      sales_invoice_id: invoice.id,
      subtotal: payload.subtotal,
      total_amount: payload.totalAmount,
      tax_amount: payload.taxTotal || 0,
      discount_amount: payload.discountTotal || 0,
      notes: `Payment for invoice ${invoiceNo} via ${payload.paymentMethod}`,
    })

    if (txError)
      throw new Error(`Transaction creation failed: ${txError.message}`)

    // 6. Record Inventory Movements
    const movements = normalizedItems.map((item) => ({
      branch_id: selectedBranchId,
      store_id: payload.storeId,
      product_variant_id: item.productVariantId,
      movement_type: 'sale',
      reference_type: 'sales_invoice',
      reference_id: invoice.id,
      qty_out: item.quantity,
      movement_date: new Date().toISOString(),
    }))

    const { error: movError } = await supabase
      .from('inventory_movements')
      .insert(movements)

    if (movError)
      console.warn('Inventory movement recording failed:', movError.message) // eslint-disable-line no-console

    return {
      success: true,
      invoiceNo,
      invoiceId: invoice.id,
      transactionId,
      timestamp: new Date().toISOString(),
    }
  } catch (error: unknown) {
    console.error('POS Checkout error:', error) // eslint-disable-line no-console
    return {
      success: false,
      error: {
        code: 'CHECKOUT_FAILED',
        message: error instanceof Error ? error.message : 'Checkout failed',
      },
    }
  }
}

export async function getPosShipments() {
  const isRestaurant = isRestaurantModuleContext()

  if (isRestaurant) {
    const { data, error } = await supabase
      .from('res_shipments')
      .select('*, res_orders!inner(res_order_items(status))')
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Filter to only include shipments where all order items are ready
    const readyShipments = data.filter((shipment) => {
      const orderItems = shipment.res_orders?.res_order_items || []
      // If there are no items, it's considered ready
      if (orderItems.length === 0) return true
      return orderItems.every((item: any) => ['ready', 'served'].includes(item.status))
    })

    // Remove the joined data before returning to match expected signature
    return readyShipments.map(({ res_orders, ...rest }) => rest)
  }

  const shipments = await getNonRestaurantShipments()

  return shipments.map((shipment) => {
    return {
      id: String(shipment.shipment_id),
      order_id: String(shipment.order_id),
      recipient_name: shipment.recipient_name || 'N/A',
      recipient_phone: shipment.recipient_phone || 'N/A',
      delivery_address: shipment.delivery_address || 'N/A',
      city: shipment.city || '',
      state: shipment.state || '',
      postal_code: shipment.postal_code || '',
      status: shipment.status,
      notes: shipment.notes || '',
      tracking_number: shipment.tracking_number,
      carrier: shipment.carrier,
      shipped_at: shipment.shipped_date,
      delivered_at: shipment.delivered_date,
      created_at:
        shipment.shipped_date ||
        shipment.delivered_date ||
        new Date().toISOString(),
    }
  })
}

export type PosShipmentOrderItemDetail = {
  id: string
  item_id?: string | null
  variant_id?: string | null
  quantity?: number | null
  unit_price: number | string
  status?: string | null
  notes?: string | null
  properties?: unknown
  menu_item?: {
    id?: string
    name?: string
  } | null
  variant?: {
    id?: string
    name?: string
    price_adjustment?: number | string | null
  } | null
}

export type PosShipmentOrderDetail = {
  id: string
  order_number?: string | null
  status?: string | null
  payment_method?: string | null
  subtotal?: number | string | null
  discount_amount?: number | string | null
  tax_amount?: number | string | null
  total_amount?: number | string | null
  notes?: string | null
  created_at?: string | null
  table?: {
    id?: string
    table_number?: string
    seats?: number | null
  } | null
  order_items: PosShipmentOrderItemDetail[]
}

export type PosShipmentDetail = {
  shipment: {
    id: string
    order_id: string
    recipient_name: string
    recipient_phone: string
    delivery_address: string
    city?: string | null
    state?: string | null
    postal_code?: string | null
    status: string
    tracking_number?: string | null
    carrier?: string | null
    shipped_at?: string | null
    delivered_at?: string | null
    notes?: string | null
    created_at?: string | null
    updated_at?: string | null
  }
  order: PosShipmentOrderDetail | null
}

export async function getPosShipmentDetails(
  shipmentId: string
): Promise<PosShipmentDetail> {
  const isRestaurant = isRestaurantModuleContext()

  if (isRestaurant) {
    const { data: shipment, error: shipmentError } = await supabase
      .from('res_shipments')
      .select('*')
      .eq('id', shipmentId)
      .single()

    if (shipmentError) throw shipmentError

    const { data: order, error: orderError } = await supabase
      .from('res_orders')
      .select('*, table:res_tables(*)')
      .eq('id', shipment.order_id)
      .maybeSingle()

    if (orderError) throw orderError

    let orderItems: PosShipmentOrderItemDetail[] = []
    let resolvedPaymentMethod = order?.payment_method || null

    if (order) {
      const { data: items, error: itemsError } = await supabase
        .from('res_order_items')
        .select('*, menu_item:res_menu_items(*), variant:res_item_variants(*)')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true })

      if (itemsError) throw itemsError
      orderItems = (items || []) as PosShipmentOrderItemDetail[]

      if (order.payment_method) {
        const { data: pm } = await supabase
          .from('res_payment_methods')
          .select('name')
          .eq('id', order.payment_method)
          .maybeSingle()

        if (pm?.name) {
          resolvedPaymentMethod = pm.name
        }
      }
    }

    return {
      shipment: {
        id: shipment.id,
        order_id: shipment.order_id,
        recipient_name: shipment.recipient_name,
        recipient_phone: shipment.recipient_phone,
        delivery_address: shipment.delivery_address,
        city: shipment.city,
        state: shipment.state,
        postal_code: shipment.postal_code,
        status: shipment.status,
        tracking_number: shipment.tracking_number,
        carrier: shipment.carrier,
        shipped_at: shipment.shipped_at,
        delivered_at: shipment.delivered_at,
        notes: shipment.notes,
        created_at: shipment.created_at,
        updated_at: shipment.updated_at,
      },
      order: order
        ? ({
            ...order,
            payment_method: resolvedPaymentMethod,
            order_items: orderItems,
          } as PosShipmentOrderDetail)
        : null,
    }
  }

  const numericShipmentId = Number(shipmentId)
  if (!Number.isFinite(numericShipmentId)) {
    throw new Error(`Invalid shipment id: ${shipmentId}`)
  }

  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select('*')
    .eq('shipment_id', numericShipmentId)
    .single()

  if (shipmentError) throw shipmentError

  const mappedShipment = mapNonRestaurantShipmentRow(shipment as ShipmentsRow)

  return {
    shipment: {
      id: String(mappedShipment.shipment_id),
      order_id: String(mappedShipment.order_id),
      recipient_name: mappedShipment.recipient_name || 'N/A',
      recipient_phone: mappedShipment.recipient_phone || 'N/A',
      delivery_address: mappedShipment.delivery_address || 'N/A',
      city: mappedShipment.city || '',
      state: mappedShipment.state || '',
      postal_code: mappedShipment.postal_code || '',
      status: mappedShipment.status,
      notes: mappedShipment.notes || '',
      created_at:
        mappedShipment.shipped_date ||
        mappedShipment.delivered_date ||
        new Date().toISOString(),
      updated_at: null,
      shipped_at: mappedShipment.shipped_date || null,
      delivered_at: mappedShipment.delivered_date || null,
      tracking_number: mappedShipment.tracking_number,
      carrier: mappedShipment.carrier,
    },
    order: null,
  }
}

export async function updatePosShipmentStatus(
  shipmentId: string,
  status: string
) {
  const isRestaurant = isRestaurantModuleContext()

  if (isRestaurant) {
    const now = new Date().toISOString()
    const updates: {
      status: string
      shipped_at?: string
      delivered_at?: string
    } = { status }

    if (status === 'in_transit' || status === 'shipped') {
      updates.shipped_at = now
    }

    if (status === 'delivered') {
      const { data: existing, error: existingError } = await supabase
        .from('res_shipments')
        .select('shipped_at')
        .eq('id', shipmentId)
        .single()

      if (existingError) throw existingError

      updates.delivered_at = now
      if (!existing.shipped_at) {
        updates.shipped_at = now
      }
    }

    const { error } = await supabase
      .from('res_shipments')
      .update(updates)
      .eq('id', shipmentId)

    if (error) throw error

    return { id: shipmentId, status }
  }

  return updateNonRestaurantShipment({ shipmentId, status })
}

export type PosTakeawayOrderItem = {
  id: string
  quantity: number
  unit_price: number
  notes?: string | null
  properties?: unknown
  menu_item?: {
    id: string
    name: string
  } | null
}

export type PosTakeawayOrder = {
  id: string
  order_number: string
  customer_name?: string | null
  mobile_number?: string | null
  status: string
  order_type: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  tip_amount?: number
  total_amount: number
  payment_method?: string | null
  paid_at?: string | null
  notes?: string | null
  created_at: string
  order_items: PosTakeawayOrderItem[]
}

export async function getPosTakeawayOrders(): Promise<PosTakeawayOrder[]> {
  const { data: pmList } = await supabase
    .from('res_payment_methods')
    .select('id, name')

  const pmMap = new Map<string, string>()
  if (pmList) {
    for (const pm of pmList) {
      if (pm.id && pm.name) {
        pmMap.set(pm.id, pm.name)
      }
    }
  }

  const { data, error } = await supabase
    .from('res_orders')
    .select(
      '*, order_items:res_order_items(*, menu_item:res_menu_items(*))'
    )
    .eq('order_type', 'takeaway')
    .in('status', ['paid', 'completed'])
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((order) => {
    const rawPaymentMethod = order.payment_method || null
    const resolvedMethod = rawPaymentMethod
      ? pmMap.get(rawPaymentMethod) || rawPaymentMethod
      : null

    return {
      id: order.id,
      order_number: order.order_number || 'N/A',
      customer_name: order.customer_name || null,
      mobile_number: order.mobile_number || null,
      status: order.status || 'paid',
      order_type: order.order_type || 'takeaway',
      subtotal: Number(order.subtotal || 0),
      discount_amount: Number(order.discount_amount || 0),
      tax_amount: Number(order.tax_amount || 0),
      tip_amount: Number(order.tip_amount || 0),
      total_amount: Number(order.total_amount || 0),
      payment_method: resolvedMethod,
      paid_at: order.paid_at || order.created_at,
      notes: order.notes || null,
      created_at: order.created_at,
      order_items: (order.order_items || []).map((item: {
        id: string
        quantity?: number | null
        unit_price?: number | null
        notes?: string | null
        properties?: unknown
        menu_item?: { id?: string; name?: string } | null
      }) => ({
        id: item.id,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        notes: item.notes || null,
        properties: item.properties,
        menu_item: item.menu_item?.name
          ? { id: item.menu_item.id || '', name: item.menu_item.name }
          : null,
      })),
    }
  })
}

