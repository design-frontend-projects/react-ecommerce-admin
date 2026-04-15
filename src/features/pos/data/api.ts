import { db } from '@/lib/db/indexed-db'
import { offlineOrderService } from '@/lib/offline-order-service'
import { supabase } from '@/lib/supabase'

export type PosProductVariant = {
  id: string
  sku: string
  barcode: string | null
  price: number
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
      product_variants ( id, sku, barcode, price, dimensions ),
      inventory ( quantity )
    `
    )
    .eq('is_active', true)
    .neq('is_deleted', true)
    .order('name')

  if (error) throw error

  const mapped = (data || []).map((p) => ({
    product_id: p.product_id,
    store_id: p.store_id || '',
    name: p.name,
    sku: p.sku || '',
    barcode: p.barcode,
    base_price: Number(p.base_price || 0),
    category_id: p.category_id,
    category_name: Array.isArray(p.categories) ? p.categories[0]?.name : (p.categories as any)?.name || null,
    has_variants: !!p.has_variants,
    product_variants: p.product_variants || [],
    description: p.description,
    is_active: p.is_active ? 1 : 0,
  }))

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
      console.warn('Failed to fetch categories from IndexedDB', e)
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

import type { CheckoutResponse } from '../types'
import type { CheckoutRequestType } from '../schemas/checkout'
import { generateInvoiceNumber } from '@/lib/utils/invoice-generator'
import { v4 as uuidv4 } from 'uuid'

export async function createPosTransaction(payload: CheckoutRequestType): Promise<CheckoutResponse> {
  // If offline, save locally
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    const offlineOrder = await offlineOrderService.saveOfflineOrder({
      store_id: payload.storeId || payload.branchId,
      total_amount: payload.totalAmount,
      items: payload.items.map(item => ({
        product_id: item.productId,
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
    const invoiceNo = generateInvoiceNumber()
    const orderId = uuidv4()
    const transactionId = uuidv4()

    // 1. Create Sales Invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('sales_invoices')
      .insert({
        branch_id: payload.branchId,
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

    if (invoiceError) throw new Error(`Invoice creation failed: ${invoiceError.message}`)

    // 2. Create Sales Invoice Items
    const invoiceItems = payload.items.map((item, index) => ({
      invoice_id: invoice.id,
      product_variant_id: item.productVariantId,
      line_no: index + 1,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_subtotal: item.quantity * item.unitPrice,
      line_total: (item.quantity * item.unitPrice) - (item.discountAmount || 0) + (item.taxAmount || 0),
      discount_amount: item.discountAmount || 0,
      tax_amount: item.taxAmount || 0,
    }))

    const { error: itemsError } = await supabase
      .from('sales_invoice_items')
      .insert(invoiceItems)

    if (itemsError) throw new Error(`Invoice items creation failed: ${itemsError.message}`)

    // 3. Create Restaurant Order
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

    if (orderError) throw new Error(`Order creation failed: ${orderError.message}`)

    // 4. Create Shipment if requested
    if (payload.isShipment && payload.shipment) {
      const { error: shipmentError } = await supabase
        .from('res_shipments')
        .insert({
          order_id: resOrder.id,
          recipient_name: payload.shipment.recipientName,
          recipient_phone: payload.shipment.recipientPhone,
          delivery_address: payload.shipment.deliveryAddress,
          city: payload.shipment.city,
          state: payload.shipment.state,
          postal_code: payload.shipment.postalCode,
          notes: payload.shipment.notes,
          status: 'pending',
        })

      if (shipmentError) throw new Error(`Shipment creation failed: ${shipmentError.message}`)
    }

    // 5. Create Transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        transaction_number: `TRN-${invoiceNo}`,
        transaction_type: 'sale',
        status: 'completed',
        subtotal: payload.subtotal,
        total_amount: payload.totalAmount,
        tax_amount: payload.taxTotal || 0,
        discount_amount: payload.discountTotal || 0,
        notes: `Payment for invoice ${invoiceNo} via ${payload.paymentMethod}`,
      })

    if (txError) throw new Error(`Transaction creation failed: ${txError.message}`)

    // 6. Record Inventory Movements
    const movements = payload.items.map(item => ({
      branch_id: payload.branchId,
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

    if (movError) console.warn('Inventory movement recording failed:', movError.message)

    return {
      success: true,
      invoiceNo,
      invoiceId: invoice.id,
      transactionId,
      timestamp: new Date().toISOString(),
    }
  } catch (error: unknown) {
    console.error('POS Checkout error:', error)
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
  const { data, error } = await supabase
    .from('res_shipments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
