import { describe, it, expect } from 'vitest'
import {
  resolvePriceFromListItems,
  type PriceListItemWithList,
} from '@/services/pricing/price-resolver'
import {
  aggregateStockBalances,
  type StockBalanceRecord,
} from '@/services/inventory/stock-resolver'

describe('Pricing & Stock Resolvers', () => {
  describe('Price Resolver Engine', () => {
    const mockItems: PriceListItemWithList[] = [
      {
        id: 'item-default',
        price_list_id: 'pl-default',
        product_variant_id: 'var-1',
        price: 100,
        min_price: 80,
        max_discount_percent: 20,
        price_list: {
          id: 'pl-default',
          name: 'Default Price List',
          is_default: true,
          is_active: true,
        },
      },
      {
        id: 'item-vip',
        price_list_id: 'pl-vip',
        product_variant_id: 'var-1',
        price: 85,
        min_price: 70,
        max_discount_percent: 10,
        price_list: {
          id: 'pl-vip',
          name: 'VIP Customer Group',
          group_id: 'group-vip-123',
          is_default: false,
          is_active: true,
        },
      },
      {
        id: 'item-pos',
        price_list_id: 'pl-pos',
        product_variant_id: 'var-1',
        price: 95,
        min_price: 90,
        max_discount_percent: 5,
        price_list: {
          id: 'pl-pos',
          name: 'POS Channel Price',
          channel_id: 'channel-pos-1',
          is_default: false,
          is_active: true,
        },
      },
    ]

    it('resolves customer group price when customerGroupId matches', () => {
      const resolved = resolvePriceFromListItems(mockItems, {
        variantId: 'var-1',
        customerGroupId: 'group-vip-123',
      })
      expect(resolved.price).toBe(85)
      expect(resolved.source).toBe('customer_group')
      expect(resolved.priceListName).toBe('VIP Customer Group')
    })

    it('resolves channel price when channelId matches and no customer group is given', () => {
      const resolved = resolvePriceFromListItems(mockItems, {
        variantId: 'var-1',
        channelId: 'channel-pos-1',
      })
      expect(resolved.price).toBe(95)
      expect(resolved.source).toBe('channel')
    })

    it('falls back to default price list when neither group nor channel match', () => {
      const resolved = resolvePriceFromListItems(mockItems, {
        variantId: 'var-1',
        channelId: 'channel-unknown',
      })
      expect(resolved.price).toBe(100)
      expect(resolved.source).toBe('default')
      expect(resolved.priceListName).toBe('Default Price List')
    })

    it('returns zero price gracefully when items array is empty', () => {
      const resolved = resolvePriceFromListItems([], { variantId: 'var-999' })
      expect(resolved.price).toBe(0)
      expect(resolved.source).toBe('fallback')
    })
  })

  describe('Stock Resolver Engine', () => {
    const mockBalances: StockBalanceRecord[] = [
      {
        id: 'bal-1',
        product_variant_id: 'var-1',
        store_id: 'store-downtown',
        warehouse_id: 'wh-1',
        qty_on_hand: 50,
        qty_reserved: 10,
        avg_cost: 20,
      },
      {
        id: 'bal-2',
        product_variant_id: 'var-1',
        store_id: 'store-airport',
        warehouse_id: 'wh-2',
        qty_on_hand: 30,
        qty_reserved: 5,
        avg_cost: 25,
      },
    ]

    it('aggregates stock across all locations when no store/warehouse is filtered', () => {
      const stock = aggregateStockBalances(mockBalances, { variantId: 'var-1' })
      expect(stock.qtyOnHand).toBe(80)
      expect(stock.qtyReserved).toBe(15)
      expect(stock.qtyAvailable).toBe(65)
      expect(stock.isAvailable).toBe(true)
    })

    it('filters stock for a specific store accurately', () => {
      const stock = aggregateStockBalances(mockBalances, {
        variantId: 'var-1',
        storeId: 'store-downtown',
      })
      expect(stock.qtyOnHand).toBe(50)
      expect(stock.qtyReserved).toBe(10)
      expect(stock.qtyAvailable).toBe(40)
      expect(stock.avgCost).toBe(20)
    })

    it('returns 0 available when reserved equals or exceeds on-hand', () => {
      const balances: StockBalanceRecord[] = [
        {
          id: 'bal-3',
          product_variant_id: 'var-2',
          qty_on_hand: 10,
          qty_reserved: 12,
        },
      ]
      const stock = aggregateStockBalances(balances, { variantId: 'var-2' })
      expect(stock.qtyAvailable).toBe(0)
      expect(stock.isAvailable).toBe(false)
    })
  })
})
