import { z } from 'zod'

export const priceListTypesEnum = z.enum([
  'retail',
  'wholesale',
  'vip',
  'black_friday',
  'valintine_day',
])
export type PriceListType = z.infer<typeof priceListTypesEnum>

export const PRICE_LIST_TYPE_LABELS: Record<PriceListType, { label: string; labelAr: string; color: string }> = {
  retail: { label: 'Retail', labelAr: 'تجزئة', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  wholesale: { label: 'Wholesale', labelAr: 'جملة', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  vip: { label: 'VIP', labelAr: 'عملاء مميزون', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  black_friday: { label: 'Black Friday', labelAr: 'الجمعة البيضاء', color: 'bg-zinc-800 text-zinc-100 dark:bg-zinc-700 dark:text-zinc-200' },
  valintine_day: { label: "Valentine's Day", labelAr: 'يوم الحب', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
}

export interface ProductVariantBrief {
  id: string
  product_id?: string
  name: string | null
  sku: string
  barcode?: string | null
  is_active?: boolean | null
}

export interface ProductBrief {
  id: string
  name: string
  sku: string
  has_variants?: boolean | null
  product_variants?: ProductVariantBrief[]
}

export interface CustomerGroupBrief {
  id: string
  name: string
  discount_percentage?: number | null
  minimum_order_amount?: number | null
}

export interface StoreBrief {
  store_id: string
  name: string | null
  phone?: string | null
  email?: string | null
}

export interface CurrencyBrief {
  id: string
  name: string
  code: string
  symbol: string
}

export interface ChannelBrief {
  id: string
  code: string
  name: string
  name_ar?: string | null
}

export interface PriceListItemRecord {
  id: string
  tenant_id?: string
  price_list_id: string
  product_variant_id: string
  product_id?: string | null
  price: number
  cost_price?: number | null
  min_price: number
  max_discount_percent: number
  created_at?: string
  updated_at?: string
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
  product_variants?: ProductVariantBrief | null
}

export interface PriceList {
  id: string
  tenant_id: string
  name?: string | null
  code?: string | null
  is_default?: boolean
  product_id?: string | null
  price?: number | null
  type: PriceListType | null
  price_list_type_id?: string | null
  store_id?: string | null
  currency_id?: string | null
  channel_id?: string | null
  group_id?: string | null
  start_date: string
  end_date?: string | null
  is_active: boolean
  description?: string | null
  created_at?: string
  updated_at?: string
  created_by_user_id?: string | null
  updated_by_user_id?: string | null
  products?: ProductBrief | null
  customer_groups?: CustomerGroupBrief | null
  stores?: StoreBrief | null
  currencies?: CurrencyBrief | null
  channels?: ChannelBrief | null
  price_list_items?: PriceListItemRecord[]
}

export const priceListItemFormSchema = z.object({
  id: z.string().optional(),
  product_variant_id: z.string().min(1, 'Product variant is required'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  cost_price: z.coerce.number().min(0, 'Cost must be 0 or greater').default(0).optional(),
  min_price: z.coerce.number().min(0, 'Floor price must be 0 or greater').default(0),
  max_discount_percent: z.coerce
    .number()
    .min(0, 'Discount must be at least 0%')
    .max(100, 'Discount cannot exceed 100%')
    .default(0),
  // UI metadata helpers (not written directly to price_list_items table)
  variant_name: z.string().optional().nullable(),
  variant_sku: z.string().optional(),
  regular_price: z.number().optional(),
})

export type PriceListItemFormData = z.infer<typeof priceListItemFormSchema>

export const priceListFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(150),
    code: z.string().max(50).optional().nullable(),
    is_default: z.boolean().default(false),
    product_id: z.string().optional().nullable().or(z.literal('')),
    price: z.coerce.number().min(0, 'Default price must be 0 or greater').optional().nullable(),
    type: priceListTypesEnum.optional().nullable(),
    group_id: z.string().uuid().optional().nullable().or(z.literal('')),
    store_id: z.string().uuid().optional().nullable().or(z.literal('')),
    currency_id: z.string().uuid().optional().nullable().or(z.literal('')),
    channel_id: z.string().uuid().optional().nullable().or(z.literal('')),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().optional().nullable().or(z.literal('')),
    is_active: z.boolean().default(true),
    description: z.string().optional().nullable(),
    items: z.array(priceListItemFormSchema).default([]),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true
      return new Date(data.end_date) >= new Date(data.start_date)
    },
    {
      message: 'End date cannot be earlier than start date',
      path: ['end_date'],
    }
  )

export type PriceListFormData = z.infer<typeof priceListFormSchema>
