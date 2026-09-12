import { describe, it, expect } from 'vitest'
import {
  resolvePriceFromListItems,
  type PriceListItemWithList,
} from '@/services/pricing/price-resolver'

describe('Price List Assignments Engine (`price_list_assignments`)', () => {
  // Scenario 1: One Store assigned to multiple price lists with priorities
  it('resolves the highest priority (lower number) price list when store is assigned to multiple price lists', () => {
    const mockItems: PriceListItemWithList[] = [
      {
        id: 'item-retail',
        price_list_id: 'pl-retail',
        product_variant_id: 'variant-iphone',
        price: 1000,
        min_price: 900,
        cost_price: 700,
        max_discount_percent: 10,
        price_list: {
          id: 'pl-retail',
          name: 'Qatar Retail Standard',
          is_active: true,
          price_list_assignments: [
            {
              id: 'assign-doha-standard',
              price_list_id: 'pl-retail',
              store_id: 'store-doha',
              assignment_type: 'STORE',
              priority: 100, // standard priority
              is_default: false,
              is_active: true,
            },
          ],
        },
      },
      {
        id: 'item-doha-promo',
        price_list_id: 'pl-doha-promo',
        product_variant_id: 'variant-iphone',
        price: 850,
        min_price: 800,
        cost_price: 700,
        max_discount_percent: 5,
        price_list: {
          id: 'pl-doha-promo',
          name: 'Doha Festival Special Promo',
          is_active: true,
          price_list_assignments: [
            {
              id: 'assign-doha-promo',
              price_list_id: 'pl-doha-promo',
              store_id: 'store-doha',
              assignment_type: 'STORE',
              priority: 10, // high priority promotion
              is_default: false,
              is_active: true,
            },
          ],
        },
      },
    ]

    const resolved = resolvePriceFromListItems(mockItems, {
      variantId: 'variant-iphone',
      storeId: 'store-doha',
    })

    expect(resolved.price).toBe(850)
    expect(resolved.priceListId).toBe('pl-doha-promo')
    expect(resolved.priceListName).toBe('Doha Festival Special Promo')
    expect(resolved.priority).toBe(10)
    expect(resolved.assignmentId).toBe('assign-doha-promo')
    expect(resolved.source).toBe('store')
  })

  // Scenario 2: Multiple stores assigned to the SAME price list
  it('allows multiple stores to share a single price list without duplicating price list items', () => {
    const singlePriceListItems: PriceListItemWithList[] = [
      {
        id: 'item-shared',
        price_list_id: 'pl-shared-national',
        product_variant_id: 'variant-macbook',
        price: 2500,
        min_price: 2300,
        cost_price: 2000,
        max_discount_percent: 10,
        price_list: {
          id: 'pl-shared-national',
          name: 'National Retail Price List',
          is_active: true,
          price_list_assignments: [
            {
              id: 'assign-doha',
              price_list_id: 'pl-shared-national',
              store_id: 'store-doha',
              assignment_type: 'STORE',
              priority: 100,
              is_default: true,
              is_active: true,
            },
            {
              id: 'assign-rayyan',
              price_list_id: 'pl-shared-national',
              store_id: 'store-rayyan',
              assignment_type: 'STORE',
              priority: 100,
              is_default: true,
              is_active: true,
            },
            {
              id: 'assign-wakrah',
              price_list_id: 'pl-shared-national',
              store_id: 'store-wakrah',
              assignment_type: 'STORE',
              priority: 100,
              is_default: true,
              is_active: true,
            },
          ],
        },
      },
    ]

    const dohaPrice = resolvePriceFromListItems(singlePriceListItems, {
      variantId: 'variant-macbook',
      storeId: 'store-doha',
    })
    const rayyanPrice = resolvePriceFromListItems(singlePriceListItems, {
      variantId: 'variant-macbook',
      storeId: 'store-rayyan',
    })
    const wakrahPrice = resolvePriceFromListItems(singlePriceListItems, {
      variantId: 'variant-macbook',
      storeId: 'store-wakrah',
    })

    expect(dohaPrice.price).toBe(2500)
    expect(dohaPrice.assignmentId).toBe('assign-doha')
    expect(rayyanPrice.price).toBe(2500)
    expect(rayyanPrice.assignmentId).toBe('assign-rayyan')
    expect(wakrahPrice.price).toBe(2500)
    expect(wakrahPrice.assignmentId).toBe('assign-wakrah')
  })

  // Scenario 3: Scope Matrix Specificity (Store + Channel + Group beats Store only)
  it('prefers a more specific 3-way match (Store + Channel + Customer Group) over a single store match', () => {
    const mockItems: PriceListItemWithList[] = [
      {
        id: 'item-store-only',
        price_list_id: 'pl-store-only',
        product_variant_id: 'variant-ipad',
        price: 800,
        price_list: {
          id: 'pl-store-only',
          name: 'Store Standard',
          price_list_assignments: [
            {
              id: 'assign-store-only',
              price_list_id: 'pl-store-only',
              store_id: 'store-doha',
              assignment_type: 'STORE',
              priority: 50,
              is_active: true,
            },
          ],
        },
      },
      {
        id: 'item-matrix',
        price_list_id: 'pl-matrix',
        product_variant_id: 'variant-ipad',
        price: 650,
        price_list: {
          id: 'pl-matrix',
          name: 'Doha POS VIP Special',
          price_list_assignments: [
            {
              id: 'assign-matrix-3way',
              price_list_id: 'pl-matrix',
              store_id: 'store-doha',
              channel_id: 'channel-pos',
              customer_group_id: 'group-vip',
              assignment_type: 'STORE_CHANNEL_CUSTOMER_GROUP',
              priority: 50,
              is_active: true,
            },
          ],
        },
      },
    ]

    const resolved = resolvePriceFromListItems(mockItems, {
      variantId: 'variant-ipad',
      storeId: 'store-doha',
      channelId: 'channel-pos',
      customerGroupId: 'group-vip',
    })

    expect(resolved.price).toBe(650)
    expect(resolved.priceListId).toBe('pl-matrix')
    expect(resolved.assignmentId).toBe('assign-matrix-3way')
    expect(resolved.source).toBe('assignment_matrix')
  })

  // Scenario 4: Date validity (valid_from / valid_to)
  it('respects valid_from and valid_to date windows on assignments', () => {
    const mockItems: PriceListItemWithList[] = [
      {
        id: 'item-standard',
        price_list_id: 'pl-standard',
        product_variant_id: 'variant-coffee',
        price: 20,
        price_list: {
          id: 'pl-standard',
          name: 'Regular Coffee Price',
          price_list_assignments: [
            {
              id: 'assign-standard',
              price_list_id: 'pl-standard',
              store_id: 'store-doha',
              priority: 100,
              is_active: true,
            },
          ],
        },
      },
      {
        id: 'item-expired-promo',
        price_list_id: 'pl-expired-promo',
        product_variant_id: 'variant-coffee',
        price: 12,
        price_list: {
          id: 'pl-expired-promo',
          name: 'Yesterday Flash Promo',
          price_list_assignments: [
            {
              id: 'assign-expired',
              price_list_id: 'pl-expired-promo',
              store_id: 'store-doha',
              priority: 10,
              valid_from: '2026-01-01',
              valid_to: '2026-01-02', // past date
              is_active: true,
            },
          ],
        },
      },
      {
        id: 'item-active-promo',
        price_list_id: 'pl-active-promo',
        product_variant_id: 'variant-coffee',
        price: 15,
        price_list: {
          id: 'pl-active-promo',
          name: 'Current Weekend Promo',
          price_list_assignments: [
            {
              id: 'assign-active-promo',
              price_list_id: 'pl-active-promo',
              store_id: 'store-doha',
              priority: 20,
              valid_from: '2026-09-10',
              valid_to: '2026-09-15',
              is_active: true,
            },
          ],
        },
      },
    ]

    // Evaluation date is 2026-09-12
    const resolved = resolvePriceFromListItems(mockItems, {
      variantId: 'variant-coffee',
      storeId: 'store-doha',
      date: '2026-09-12',
    })

    // Expired promo (12) is ignored; active promo (15, priority 20) is chosen over standard (20, priority 100)
    expect(resolved.price).toBe(15)
    expect(resolved.priceListId).toBe('pl-active-promo')
    expect(resolved.assignmentId).toBe('assign-active-promo')
  })

  // Scenario 5: Inactive and Soft-Deleted assignments
  it('ignores assignments where is_active is false or deleted_at is set', () => {
    const mockItems: PriceListItemWithList[] = [
      {
        id: 'item-standard',
        price_list_id: 'pl-standard',
        product_variant_id: 'variant-cake',
        price: 50,
        price_list: {
          id: 'pl-standard',
          name: 'Standard Price',
          price_list_assignments: [
            {
              id: 'assign-standard',
              price_list_id: 'pl-standard',
              store_id: 'store-doha',
              priority: 100,
              is_active: true,
            },
          ],
        },
      },
      {
        id: 'item-disabled',
        price_list_id: 'pl-disabled',
        product_variant_id: 'variant-cake',
        price: 30,
        price_list: {
          id: 'pl-disabled',
          name: 'Disabled Promo',
          price_list_assignments: [
            {
              id: 'assign-disabled',
              price_list_id: 'pl-disabled',
              store_id: 'store-doha',
              priority: 10,
              is_active: false, // disabled
            },
          ],
        },
      },
      {
        id: 'item-deleted',
        price_list_id: 'pl-deleted',
        product_variant_id: 'variant-cake',
        price: 25,
        price_list: {
          id: 'pl-deleted',
          name: 'Deleted Promo',
          price_list_assignments: [
            {
              id: 'assign-deleted',
              price_list_id: 'pl-deleted',
              store_id: 'store-doha',
              priority: 5,
              is_active: true,
              deleted_at: '2026-09-11T12:00:00Z', // soft deleted
            },
          ],
        },
      },
    ]

    const resolved = resolvePriceFromListItems(mockItems, {
      variantId: 'variant-cake',
      storeId: 'store-doha',
    })

    expect(resolved.price).toBe(50)
    expect(resolved.priceListId).toBe('pl-standard')
  })

  // Scenario 6: Default Price List Assignment fallback
  it('falls back to global default assignment when no store-specific assignment matches', () => {
    const mockItems: PriceListItemWithList[] = [
      {
        id: 'item-global-default',
        price_list_id: 'pl-global',
        product_variant_id: 'variant-water',
        price: 5,
        price_list: {
          id: 'pl-global',
          name: 'Global Default Price List',
          price_list_assignments: [
            {
              id: 'assign-global-default',
              price_list_id: 'pl-global',
              store_id: null,
              channel_id: null,
              customer_group_id: null,
              assignment_type: 'GLOBAL',
              priority: 200,
              is_default: true,
              is_active: true,
            },
          ],
        },
      },
    ]

    const resolved = resolvePriceFromListItems(mockItems, {
      variantId: 'variant-water',
      storeId: 'store-unknown',
    })

    expect(resolved.price).toBe(5)
    expect(resolved.priceListId).toBe('pl-global')
    expect(resolved.assignmentId).toBe('assign-global-default')
    expect(resolved.source).toBe('default')
  })
})
