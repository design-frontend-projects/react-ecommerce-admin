import { v4 as uuidv4 } from 'uuid'
import { useAuthStore } from '@/stores/auth-store'
import { db } from '@/lib/db/indexed-db'
import { offlineOrderService } from '@/lib/offline-order-service'
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
  // If offline, serve from Dexie
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    try {
      const cached = await db.products
        .filter((p) => p.is_active === 1)
        .toArray()
      if (cached.length > 0) {
        return cached.map((p) => ({
          product_id: parseInt(p.id, 10),
          name: p.name,
          sku: p.sku || '',
          barcode: p.barcode || null,
          base_price: p.price,
          category_id: p.category_id || null,
          category_name: p.category_name || null,
          has_variants: !!p.has_variants,
          product_variants: (p.product_variants as PosProductVariant[]) || [],
        }))
      }
    } catch (e) {
      console.warn('Failed to fetch from IndexedDB', e) // eslint-disable-line no-console
    }
  }

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
      product_variants ( id, sku, barcode, price, dimensions, stock_quantity, min_stock, is_active ),
      inventory ( quantity )
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

  // Save to Dexie
  if (typeof window !== 'undefined') {
    try {
      const dexieProducts = mapped.map((p) => ({
        id: String(p.product_id),
        name: p.name,
        slug: p.name.toLowerCase().replace(/\s+/g, '-'),
        description: p.description,
        price: p.base_price,
        sku: p.sku,
        barcode: p.barcode,
        track_inventory: true,
        category_id: String(p.category_id),
        category_name: p.category_name || undefined,
        has_variants: p.has_variants,
        product_variants: p.product_variants,
        store_id: String(p.store_id),
        is_active: p.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      await db.products.bulkPut(dexieProducts)
    } catch (e) {
      console.warn('Failed to cache POS products in IndexedDB', e) // eslint-disable-line no-console
    }
  }

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
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    try {
      const cached = await db.categories.toArray()
      if (cached.length > 0) {
        return cached.map((c) => ({
          category_id: c.id,
          name: c.name,
          slug: c.slug,
        }))
      }
    } catch (e) {
      console.warn('Failed to fetch categories from IndexedDB', e) // eslint-disable-line no-console
    }
  }

  const { data, error } = await supabase
    .from('categories')
    .select('category_id, name, slug')
    .order('name')

  if (error) {
    console.error('Error fetching categories:', error) // eslint-disable-line no-console
    return []
  }

  const categories = data.map((c) => ({
    category_id: c.category_id,
    name: c.name,
    slug: c.slug,
  }))

  if (typeof window !== 'undefined') {
    try {
      await db.categories.bulkPut(
        categories.map((c) => ({
          id: c.category_id,
          name: c.name,
          slug: c.slug,
          store_id: 'default',
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      )
    } catch (e) {
      console.warn('Failed to cache categories', e) // eslint-disable-line no-console
    }
  }

  return categories
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
  sale_item_id: number
  product_id: number
  product_name: string | null
  product_sku: string | null
  quantity: number
  unit_price: number
  line_subtotal: number
}

export type NonRestaurantShipmentOrderDetails = {
  sale_id: number
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
      'shipment_id, order_id, tracking_number, shipped_date, delivered_date, carrier, status, notes'
    )
    .eq('shipment_id', numericShipmentId)
    .single()

  if (shipmentError) throw shipmentError

  const shipment = mapNonRestaurantShipmentRow(shipmentRow as ShipmentsRow)

  const { data: orderRow, error: orderError } = await supabase
    .from('pos_sales')
    .select(
      'sale_id, sale_date, status, payment_method, subtotal, discount_amount, tax_amount, total_amount'
    )
    .eq('sale_id', shipment.order_id)
    .maybeSingle()

  if (orderError) throw orderError

  if (!orderRow) {
    return {
      shipment,
      order: null,
    }
  }

  const { data: saleItems, error: saleItemsError } = await supabase
    .from('sale_items')
    .select(
      'sale_item_id, product_id, quantity, unit_price, subtotal, products(name, sku)'
    )
    .eq('sale_id', orderRow.sale_id)
    .order('sale_item_id', { ascending: true })

  if (saleItemsError) throw saleItemsError

  const mappedItems: NonRestaurantShipmentOrderItem[] =
    (saleItems as PosSaleItemWithProductRow[] | null)?.map((item) => {
      const product = Array.isArray(item.products)
        ? (item.products[0] ?? null)
        : item.products
      const quantity = Number(item.quantity || 0)
      const unitPrice = Number(item.unit_price || 0)

      return {
        sale_item_id: item.sale_item_id,
        product_id: item.product_id,
        product_name: product?.name || null,
        product_sku: product?.sku || null,
        quantity,
        unit_price: unitPrice,
        line_subtotal:
          item.subtotal !== null && item.subtotal !== undefined
            ? Number(item.subtotal)
            : quantity * unitPrice,
      }
    }) ?? []

  return {
    shipment,
    order: {
      ...(orderRow as PosSalesOrderRow),
      items: mappedItems,
    },
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

  // If offline, save locally
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    const offlineOrder = await offlineOrderService.saveOfflineOrder({
      store_id: payload.storeId || selectedBranchId,
      total_amount: payload.totalAmount,
      items: normalizedItems.map((item) => ({
        product_id: item.productId,
        product_variant_id: item.productVariantId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount || 0,
        tax_amount: item.taxAmount || 0,
      })),
      customer_id: String(payload.customerId || ''),
    })
    return { success: true, invoiceId: offlineOrder.id }
  }

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
        // `shipments.order_id` is Int, so link it to a minimal `pos_sales.sale_id` record.
        const { data: posSale, error: posSaleError } = await supabase
          .from('pos_sales')
          .insert({
            customer_id: payload.customerId,
            subtotal: payload.subtotal,
            discount_amount: payload.discountTotal || 0,
            tax_amount: payload.taxTotal || 0,
            total_amount: payload.totalAmount,
            payment_method: payload.paymentMethod,
            status: 'completed',
          })
          .select('sale_id')
          .single()

        if (posSaleError)
          throw new Error(`POS sale creation failed: ${posSaleError.message}`)

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
            order_id: posSale.sale_id,
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
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
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
    if (order) {
      const { data: items, error: itemsError } = await supabase
        .from('res_order_items')
        .select('*, menu_item:res_menu_items(*), variant:res_item_variants(*)')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true })

      if (itemsError) throw itemsError
      orderItems = (items || []) as PosShipmentOrderItemDetail[]
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
