import { db } from '@/lib/db/indexed-db'
import { offlineOrderService } from '@/lib/offline-order-service'
import { supabase } from '@/lib/supabase'

export type PosProduct = {
  product_id: number
  name: string
  sku: string
  barcode: string | null
  base_price: number
  category_id: string | null
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
      name,
      description,
      sku,
      barcode,
      base_price,
      is_active,
      inventory ( quantity )
    `
    )
    .eq('is_active', true)
    .order('name')

  if (error) throw error

  const mapped = (data || []).map((p) => ({
    product_id: p.product_id,
    store_id: p.store_id || '',
    name: p.name,
    sku: p.sku || '',
    barcode: p.barcode,
    base_price: Number(p.base_price),
    // Add these for Dexie caching
    category_id: p.category_id,
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

export async function createPosTransaction(payload: {
  tenant_id: string
  clerk_user_id: string
  transaction_number: string
  notes: string
  items: Array<{
    product_id: number
    quantity: number
    unit_price: number
    discount_amount: number
    tax_amount: number
  }>
}): Promise<string> {
  // If offline, save locally
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    const offlineOrder = await offlineOrderService.saveOfflineOrder({
      store_id: payload.tenant_id,
      total_amount: payload.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      ),
      items: payload.items,
      customer_id: payload.clerk_user_id,
    })
    return offlineOrder.id
  }

  const { data, error } = await supabase.rpc('create_transaction', {
    p_tenant_id: payload.tenant_id,
    p_clerk_user_id: payload.clerk_user_id,
    p_transaction_number: payload.transaction_number,
    p_transaction_type: 'sale',
    p_currency: 'USD',
    p_notes: payload.notes,
    p_items: payload.items,
  })

  if (error) throw error

  return data as string
}
