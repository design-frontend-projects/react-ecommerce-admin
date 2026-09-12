import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolvePriceFromListItems,
  resolveVariantPrice,
  type PriceListItemWithList,
} from '@/services/pricing/price-resolver'
import { useSettingsStore } from '@/features/settings/data/store'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => {
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
  }))

  mockSelect.mockReturnValue({
    eq: mockEq,
  })

  return {
    supabase: {
      from: mockFrom,
      _mockSelect: mockSelect,
      _mockEq: mockEq,
      _mockFrom: mockFrom,
    },
  }
})

describe('Sales Order Currency & Price Resolution Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Tenant Favourite Currency from Settings Store', () => {
    test('reads localization currency correctly from settings store', () => {
      const initialCurrency = useSettingsStore.getState().localization.currency
      expect(initialCurrency).toBeDefined()

      useSettingsStore.getState().setLocalization({ currency: 'EUR' })
      expect(useSettingsStore.getState().localization.currency).toBe('EUR')

      useSettingsStore.getState().setLocalization({ currency: 'SAR' })
      expect(useSettingsStore.getState().localization.currency).toBe('SAR')

      // Reset back to USD
      useSettingsStore.getState().setLocalization({ currency: 'USD' })
      expect(useSettingsStore.getState().localization.currency).toBe('USD')
    })
  })

  describe('resolvePriceFromListItems Cascading Priority', () => {
    const defaultList: PriceListItemWithList = {
      id: 'pli-default',
      price_list_id: 'pl-default',
      product_variant_id: 'var-100',
      price: 100,
      min_price: 80,
      cost_price: 50,
      max_discount_percent: 15,
      price_list: {
        id: 'pl-default',
        name: 'Standard Retail USD',
        type: 'standard',
        is_default: true,
        is_active: true,
        store_id: null,
        channel_id: null,
        group_id: null,
        currency_id: 'curr-usd',
      },
    }

    const storeList: PriceListItemWithList = {
      id: 'pli-store',
      price_list_id: 'pl-store',
      product_variant_id: 'var-100',
      price: 90,
      min_price: 75,
      cost_price: 50,
      max_discount_percent: 20,
      price_list: {
        id: 'pl-store',
        name: 'Store Downtown Promo USD',
        type: 'promotional',
        is_default: false,
        is_active: true,
        store_id: 'store-1',
        channel_id: null,
        group_id: null,
        currency_id: 'curr-usd',
      },
    }

    const channelList: PriceListItemWithList = {
      id: 'pli-channel',
      price_list_id: 'pl-channel',
      product_variant_id: 'var-100',
      price: 85,
      min_price: 70,
      cost_price: 50,
      max_discount_percent: 25,
      price_list: {
        id: 'pl-channel',
        name: 'Online Web Channel USD',
        type: 'channel',
        is_default: false,
        is_active: true,
        store_id: null,
        channel_id: 'chan-web',
        group_id: null,
        currency_id: 'curr-usd',
      },
    }

    const vipCustomerGroupList: PriceListItemWithList = {
      id: 'pli-vip',
      price_list_id: 'pl-vip',
      product_variant_id: 'var-100',
      price: 75,
      min_price: 65,
      cost_price: 50,
      max_discount_percent: 30,
      price_list: {
        id: 'pl-vip',
        name: 'VIP Customer Group USD',
        type: 'wholesale',
        is_default: false,
        is_active: true,
        store_id: null,
        channel_id: null,
        group_id: 'group-vip',
        currency_id: 'curr-usd',
      },
    }

    test('selects customer group price list first when customer group matches (Priority 1)', () => {
      const items = [defaultList, storeList, channelList, vipCustomerGroupList]
      const result = resolvePriceFromListItems(items, {
        variantId: 'var-100',
        customerGroupId: 'group-vip',
        channelId: 'chan-web',
        storeId: 'store-1',
        currencyId: 'curr-usd',
      })

      expect(result.price).toBe(75)
      expect(result.source).toBe('customer_group')
      expect(result.priceListName).toBe('VIP Customer Group USD')
    })

    test('selects sales channel price list when no customer group matches (Priority 2)', () => {
      const items = [defaultList, storeList, channelList, vipCustomerGroupList]
      const result = resolvePriceFromListItems(items, {
        variantId: 'var-100',
        customerGroupId: 'non-matching-group',
        channelId: 'chan-web',
        storeId: 'store-1',
        currencyId: 'curr-usd',
      })

      expect(result.price).toBe(85)
      expect(result.source).toBe('channel')
      expect(result.priceListName).toBe('Online Web Channel USD')
    })

    test('selects store-specific price list when neither group nor channel match (Priority 3)', () => {
      const items = [defaultList, storeList]
      const result = resolvePriceFromListItems(items, {
        variantId: 'var-100',
        storeId: 'store-1',
        currencyId: 'curr-usd',
      })

      expect(result.price).toBe(90)
      expect(result.source).toBe('store')
      expect(result.priceListName).toBe('Store Downtown Promo USD')
    })

    test('falls back to default price list when no specific match found (Priority 4)', () => {
      const items = [defaultList, storeList]
      const result = resolvePriceFromListItems(items, {
        variantId: 'var-100',
        storeId: 'store-different',
        currencyId: 'curr-usd',
      })

      expect(result.price).toBe(100)
      expect(result.source).toBe('default')
      expect(result.priceListName).toBe('Standard Retail USD')
    })

    test('respects currency_id filtering strictly', () => {
      const items = [defaultList]
      const result = resolvePriceFromListItems(items, {
        variantId: 'var-100',
        currencyId: 'curr-eur', // Different from curr-usd
        fallbackPrice: 55,
      })

      // When currency mismatch excludes the USD price list, falls back
      expect(result.price).toBe(55)
      expect(result.source).toBe('fallback')
    })

    test('filters out expired price lists', () => {
      const expiredList: PriceListItemWithList = {
        id: 'pli-expired',
        price: 40,
        price_list: {
          id: 'pl-exp',
          name: 'Old Promo',
          is_default: false,
          is_active: true,
          end_date: '2020-01-01', // Expired
          store_id: 'store-1',
        },
      }

      const items = [defaultList, expiredList]
      const result = resolvePriceFromListItems(items, {
        variantId: 'var-100',
        storeId: 'store-1',
        currencyId: 'curr-usd',
      })

      // Expired list is ignored, falls through to default
      expect(result.price).toBe(100)
      expect(result.source).toBe('default')
    })
  })

  describe('resolveVariantPrice Supabase Integration & Fallback', () => {
    test('returns fallbackPrice with source=fallback when productVariantId is missing', async () => {
      const result = await resolveVariantPrice(supabase as unknown as SupabaseClient, {
        fallbackPrice: 49.99,
      })

      expect(result.price).toBe(49.99)
      expect(result.source).toBe('fallback')
      expect(result.priceListName).toBeNull()
    })

    test('queries price_list_items by product_variant_id and resolves correctly', async () => {
      const mockEq = (supabase as unknown as { _mockEq: ReturnType<typeof vi.fn> })._mockEq
      mockEq.mockResolvedValueOnce({
        data: [
          {
            id: 'item-1',
            price: 120,
            cost_price: 60,
            min_price: 100,
            max_discount_percent: 10,
            price_list: {
              id: 'pl-retail',
              name: 'Retail Price List',
              is_default: true,
              is_active: true,
            },
          },
        ],
        error: null,
      })

      const result = await resolveVariantPrice(supabase as unknown as SupabaseClient, {
        productVariantId: 'var-real-1',
        fallbackPrice: 150,
      })

      expect(supabase.from).toHaveBeenCalledWith('price_list_items')
      expect(mockEq).toHaveBeenCalledWith('product_variant_id', 'var-real-1')
      expect(result.price).toBe(120)
      expect(result.source).toBe('default')
      expect(result.priceListName).toBe('Retail Price List')
    })

    test('returns fallback price when Supabase query returns empty or errors', async () => {
      const mockEq = (supabase as unknown as { _mockEq: ReturnType<typeof vi.fn> })._mockEq
      mockEq.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await resolveVariantPrice(supabase as unknown as SupabaseClient, {
        productVariantId: 'var-not-found',
        fallbackPrice: 65.5,
      })

      expect(result.price).toBe(65.5)
      expect(result.source).toBe('fallback')
    })
  })
})
