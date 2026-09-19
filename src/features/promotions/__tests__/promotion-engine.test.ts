import { describe, it, expect } from 'vitest'
import {
  evaluateCondition,
  isItemEligible,
} from '@/server/fns/promotion-engine'
import type { CartItemForEvaluation } from '@/features/promotions/types'

describe('Promotion Engine Unit Tests', () => {
  describe('evaluateCondition', () => {
    it('evaluates order_subtotal gte correctly', () => {
      const condition = {
        field: 'order_subtotal',
        operator: 'gte',
        value: '100',
      }
      expect(evaluateCondition(condition, { cartItems: [] }, 150, 2)).toBe(true)
      expect(evaluateCondition(condition, { cartItems: [] }, 99, 2)).toBe(false)
      expect(evaluateCondition(condition, { cartItems: [] }, 100, 2)).toBe(true)
    })

    it('evaluates item_quantity gte correctly', () => {
      const condition = {
        field: 'item_quantity',
        operator: 'gte',
        value: '5',
      }
      expect(evaluateCondition(condition, { cartItems: [] }, 150, 5)).toBe(true)
      expect(evaluateCondition(condition, { cartItems: [] }, 150, 4)).toBe(false)
    })

    it('evaluates customer_group eq and in correctly', () => {
      const eqCondition = {
        field: 'customer_group',
        operator: 'eq',
        value: 'vip_group_id',
      }
      expect(
        evaluateCondition(
          eqCondition,
          { cartItems: [], customerGroupId: 'vip_group_id' },
          100,
          1
        )
      ).toBe(true)
      expect(
        evaluateCondition(
          eqCondition,
          { cartItems: [], customerGroupId: 'regular_id' },
          100,
          1
        )
      ).toBe(false)

      const inCondition = {
        field: 'customer_group',
        operator: 'in',
        value: 'vip, wholesale',
      }
      expect(
        evaluateCondition(
          inCondition,
          { cartItems: [], customerGroupId: 'wholesale' },
          100,
          1
        )
      ).toBe(true)
      expect(
        evaluateCondition(
          inCondition,
          { cartItems: [], customerGroupId: 'retail' },
          100,
          1
        )
      ).toBe(false)
    })

    it('evaluates between operator correctly', () => {
      const betweenCond = {
        field: 'order_subtotal',
        operator: 'between',
        value: '100, 500',
      }
      expect(evaluateCondition(betweenCond, { cartItems: [] }, 250, 1)).toBe(true)
      expect(evaluateCondition(betweenCond, { cartItems: [] }, 50, 1)).toBe(false)
      expect(evaluateCondition(betweenCond, { cartItems: [] }, 600, 1)).toBe(false)
    })
  })

  describe('isItemEligible', () => {
    const item: CartItemForEvaluation = {
      variantId: 'var-1',
      productId: 'prod-1',
      categoryId: 'cat-1',
      brandId: 'brand-1',
      unitPrice: 50,
      quantity: 2,
      subtotal: 100,
    }

    it('returns true when scope is all and item is not excluded', () => {
      const promo = {
        scope_product_type: 'all',
      }
      expect(isItemEligible(item, promo)).toBe(true)
    })

    it('returns false when specific product is excluded', () => {
      const promo = {
        scope_product_type: 'all',
        products: [{ product_id: 'prod-1', is_excluded: true }],
      }
      expect(isItemEligible(item, promo)).toBe(false)
    })

    it('returns false when specific brand is excluded', () => {
      const promo = {
        scope_product_type: 'all',
        brands: [{ brand_id: 'brand-1', is_excluded: true }],
      }
      expect(isItemEligible(item, promo)).toBe(false)
    })

    it('returns true when scope is selected and brand matches', () => {
      const promo = {
        scope_product_type: 'selected',
        brands: [{ brand_id: 'brand-1', is_excluded: false }],
      }
      expect(isItemEligible(item, promo)).toBe(true)
    })

    it('returns true when scope is selected and category matches', () => {
      const promo = {
        scope_product_type: 'selected',
        categories: [{ category_id: 'cat-1', is_excluded: false }],
      }
      expect(isItemEligible(item, promo)).toBe(true)
    })

    it('returns false when specific category is excluded', () => {
      const promo = {
        scope_product_type: 'all',
        categories: [{ category_id: 'cat-1', is_excluded: true }],
      }
      expect(isItemEligible(item, promo)).toBe(false)
    })

    it('evaluates customer_first_order condition correctly', () => {
      const cond = {
        field: 'customer_first_order',
        operator: 'eq',
        value: 'true',
      }
      expect(evaluateCondition(cond, { cartItems: [], isFirstOrder: true }, 100, 1)).toBe(true)
      expect(evaluateCondition(cond, { cartItems: [], isFirstOrder: false }, 100, 1)).toBe(false)
      expect(evaluateCondition(cond, { cartItems: [], customerOrderCount: 0 }, 100, 1)).toBe(true)
      expect(evaluateCondition(cond, { cartItems: [], customerOrderCount: 5 }, 100, 1)).toBe(false)
    })
  })
})

