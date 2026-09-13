import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  scorePriceListForContext,
  buildVariantPriceMap,
  type ChannelPriceListRecord,
} from '@/features/sales-orders/hooks/use-channel-price-lists'

describe('Sales Order Channel Pricing Engine', () => {
  const channelOnlineId = 'channel-online-1'
  const channelB2BId = 'channel-b2b-2'
  const storeRetailId = 'store-downtown-1'
  const customerGroupVipId = 'group-vip-1'

  const mockChannelPriceList: ChannelPriceListRecord = {
    id: 'pl-online',
    name: 'Online Web Store Pricing',
    code: 'PL-ONLINE',
    type: 'selling',
    is_default: false,
    is_active: true,
    channel_id: channelOnlineId,
    store_id: null,
    group_id: null,
    priority: 10,
    price_list_items: [
      {
        id: 'pli-online-1',
        price_list_id: 'pl-online',
        product_id: 'prod-1',
        product_variant_id: 'var-1',
        price: 80,
        cost_price: 30,
        min_price: 60,
        max_discount_percent: 15,
      },
      {
        id: 'pli-online-2',
        price_list_id: 'pl-online',
        product_id: 'prod-1',
        product_variant_id: 'var-2',
        price: 95,
        cost_price: 35,
        min_price: 70,
        max_discount_percent: 10,
      },
    ],
    price_list_assignments: [
      {
        id: 'pla-online-1',
        price_list_id: 'pl-online',
        channel_id: channelOnlineId,
        store_id: null,
        customer_group_id: null,
        priority: 10,
        is_default: true,
        is_active: true,
      },
    ],
  }

  const mockStorePriceList: ChannelPriceListRecord = {
    id: 'pl-store',
    name: 'Downtown In-Store Retail',
    code: 'PL-STORE',
    type: 'selling',
    is_default: false,
    is_active: true,
    channel_id: null,
    store_id: storeRetailId,
    group_id: null,
    priority: 50,
    price_list_items: [
      {
        id: 'pli-store-1',
        price_list_id: 'pl-store',
        product_id: 'prod-1',
        product_variant_id: 'var-1',
        price: 50,
        cost_price: 30,
        min_price: 45,
        max_discount_percent: 5,
      },
      {
        id: 'pli-store-3',
        price_list_id: 'pl-store',
        product_id: 'prod-2',
        product_variant_id: 'var-3',
        price: 25,
        cost_price: 10,
        min_price: 20,
        max_discount_percent: 5,
      },
    ],
    price_list_assignments: [
      {
        id: 'pla-store-1',
        price_list_id: 'pl-store',
        channel_id: null,
        store_id: storeRetailId,
        customer_group_id: null,
        priority: 50,
        is_default: false,
        is_active: true,
      },
    ],
  }

  const mockDefaultPriceList: ChannelPriceListRecord = {
    id: 'pl-default',
    name: 'Global Base Price List',
    code: 'PL-DEFAULT',
    type: 'selling',
    is_default: true,
    is_active: true,
    channel_id: null,
    store_id: null,
    group_id: null,
    priority: 100,
    price_list_items: [
      {
        id: 'pli-def-1',
        price_list_id: 'pl-default',
        product_id: 'prod-1',
        product_variant_id: 'var-1',
        price: 40,
        cost_price: 30,
        min_price: 35,
        max_discount_percent: 0,
      },
      {
        id: 'pli-def-4',
        price_list_id: 'pl-default',
        product_id: 'prod-3',
        product_variant_id: 'var-4',
        price: 15,
        cost_price: 8,
        min_price: 12,
        max_discount_percent: 0,
      },
    ],
    price_list_assignments: [],
  }

  describe('scorePriceListForContext Specificity Scoring', () => {
    test('assigns high score (>= 1200) when channel matches directly or via assignments', () => {
      const resultDirect = scorePriceListForContext(mockChannelPriceList, {
        channelId: channelOnlineId,
        storeId: storeRetailId,
      })

      expect(resultDirect.isChannelSpecific).toBe(true)
      expect(resultDirect.source).toBe('channel')
      expect(resultDirect.score).toBeGreaterThanOrEqual(1200)
    })

    test('assigns top score (4000) when channel, store, and customer group all match', () => {
      const allMatchingList: ChannelPriceListRecord = {
        ...mockChannelPriceList,
        price_list_assignments: [
          {
            id: 'pla-all',
            price_list_id: 'pl-online',
            channel_id: channelOnlineId,
            store_id: storeRetailId,
            customer_group_id: customerGroupVipId,
            priority: 1,
            is_default: false,
            is_active: true,
          },
        ],
      }

      const result = scorePriceListForContext(allMatchingList, {
        channelId: channelOnlineId,
        storeId: storeRetailId,
        customerGroupId: customerGroupVipId,
      })

      expect(result.isChannelSpecific).toBe(true)
      expect(result.isStoreSpecific).toBe(true)
      expect(result.isCustomerGroupSpecific).toBe(true)
      expect(result.score).toBe(4000)
    })

    test('ranks channel-specific pricing above store retail pricing for orders on that channel', () => {
      const channelScore = scorePriceListForContext(mockChannelPriceList, {
        channelId: channelOnlineId,
        storeId: storeRetailId,
      })

      const storeScore = scorePriceListForContext(mockStorePriceList, {
        channelId: channelOnlineId,
        storeId: storeRetailId,
      })

      expect(channelScore.score).toBeGreaterThan(storeScore.score)
      expect(channelScore.isChannelSpecific).toBe(true)
      expect(storeScore.isChannelSpecific).toBe(false)
    })

    test('falls back to store pricing (1000) when channel has no exclusive price list', () => {
      const result = scorePriceListForContext(mockStorePriceList, {
        channelId: channelB2BId, // different channel without exclusive list
        storeId: storeRetailId,
      })

      expect(result.isChannelSpecific).toBe(false)
      expect(result.isStoreSpecific).toBe(true)
      expect(result.source).toBe('store')
      expect(result.score).toBeGreaterThanOrEqual(1000)
    })

    test('falls back to default price list (100) when neither channel nor store matches', () => {
      const result = scorePriceListForContext(mockDefaultPriceList, {
        channelId: channelB2BId,
        storeId: 'store-unknown',
      })

      expect(result.isChannelSpecific).toBe(false)
      expect(result.isStoreSpecific).toBe(false)
      expect(result.source).toBe('default')
      expect(result.score).toBe(100)
    })

    test('ignores deleted or inactive price list assignments', () => {
      const inactiveAssignmentList: ChannelPriceListRecord = {
        ...mockChannelPriceList,
        channel_id: null,
        price_list_assignments: [
          {
            id: 'pla-inactive',
            price_list_id: 'pl-online',
            channel_id: channelOnlineId,
            store_id: null,
            customer_group_id: null,
            priority: 10,
            is_default: true,
            is_active: false, // inactive
          },
          {
            id: 'pla-deleted',
            price_list_id: 'pl-online',
            channel_id: channelOnlineId,
            store_id: null,
            customer_group_id: null,
            priority: 10,
            is_default: true,
            is_active: true,
            deleted_at: '2026-01-01T00:00:00Z', // deleted
          },
        ],
      }

      const result = scorePriceListForContext(inactiveAssignmentList, {
        channelId: channelOnlineId,
      })

      expect(result.isChannelSpecific).toBe(false)
      expect(result.score).toBe(0)
    })
  })

  describe('buildVariantPriceMap Precomputation & Fallback Chain', () => {
    test('resolves exact channel price list prices for configured variants', () => {
      const priceMap = buildVariantPriceMap(mockChannelPriceList, [
        mockStorePriceList,
        mockDefaultPriceList,
      ])

      const var1Pricing = priceMap.get('var-1')
      expect(var1Pricing).toBeDefined()
      expect(var1Pricing?.price).toBe(80) // Online price list $80, overrides store $50 & default $40
      expect(var1Pricing?.priceListName).toBe('Online Web Store Pricing')
      expect(var1Pricing?.source).toBe('channel')

      const var2Pricing = priceMap.get('var-2')
      expect(var2Pricing?.price).toBe(95)
      expect(var2Pricing?.priceListName).toBe('Online Web Store Pricing')
    })

    test('falls back to store or default price list for variants not defined in active channel list', () => {
      const priceMap = buildVariantPriceMap(mockChannelPriceList, [
        mockStorePriceList,
        mockDefaultPriceList,
      ])

      // var-3 is not in mockChannelPriceList, but is in mockStorePriceList ($25)
      const var3Pricing = priceMap.get('var-3')
      expect(var3Pricing).toBeDefined()
      expect(var3Pricing?.price).toBe(25)
      expect(var3Pricing?.priceListName).toBe('Downtown In-Store Retail')
      expect(var3Pricing?.source).toBe('store')

      // var-4 is only in mockDefaultPriceList ($15)
      const var4Pricing = priceMap.get('var-4')
      expect(var4Pricing).toBeDefined()
      expect(var4Pricing?.price).toBe(15)
      expect(var4Pricing?.priceListName).toBe('Global Base Price List')
      expect(var4Pricing?.source).toBe('default')
    })

    test('recalculates prices seamlessly when switching channel context from Online to In-Store', () => {
      // In-store order (no channel or direct) uses Store Retail Price List
      const inStoreMap = buildVariantPriceMap(mockStorePriceList, [
        mockDefaultPriceList,
      ])

      expect(inStoreMap.get('var-1')?.price).toBe(50)
      expect(inStoreMap.get('var-1')?.priceListName).toBe(
        'Downtown In-Store Retail'
      )

      // When switched to Online Channel, active list becomes mockChannelPriceList
      const onlineMap = buildVariantPriceMap(mockChannelPriceList, [
        mockStorePriceList,
        mockDefaultPriceList,
      ])

      expect(onlineMap.get('var-1')?.price).toBe(80)
      expect(onlineMap.get('var-1')?.priceListName).toBe(
        'Online Web Store Pricing'
      )
    })

    test('preserves discount limits and cost prices from channel price list items', () => {
      const priceMap = buildVariantPriceMap(mockChannelPriceList, [])
      const var1 = priceMap.get('var-1')

      expect(var1?.costPrice).toBe(30)
      expect(var1?.minPrice).toBe(60)
      expect(var1?.maxDiscountPercent).toBe(15)
    })

    test('respects priority ordering when two price lists match the same score', () => {
      const lowPriorityList: ChannelPriceListRecord = {
        ...mockChannelPriceList,
        id: 'pl-online-low',
        name: 'Online Secondary List',
        priority: 50,
        price_list_assignments: [
          {
            ...mockChannelPriceList.price_list_assignments![0],
            priority: 50,
          },
        ],
      }
      const highPriorityList: ChannelPriceListRecord = {
        ...mockChannelPriceList,
        id: 'pl-online-high',
        name: 'Online Priority List',
        priority: 5,
        price_list_assignments: [
          {
            ...mockChannelPriceList.price_list_assignments![0],
            priority: 5,
          },
        ],
      }

      const scoreLow = scorePriceListForContext(lowPriorityList, {
        channelId: channelOnlineId,
      })
      const scoreHigh = scorePriceListForContext(highPriorityList, {
        channelId: channelOnlineId,
      })

      expect(scoreLow.score).toBe(scoreHigh.score)
      // Lower numerical value represents higher business priority
      expect(scoreHigh.priority).toBeLessThan(scoreLow.priority)
    })
  })
})
