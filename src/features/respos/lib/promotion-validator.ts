// Promotion code validation utility for ResPOS
import { supabase } from '@/lib/supabase'
import type { PromoValidationResult, ResPromotion } from '../types'

/**
 * Validates a promo code and returns the discount amount applicable
 * to the given subtotal.
 */
export async function validatePromoCode(
  code: string,
  subtotal: number
): Promise<PromoValidationResult> {
  if (!code.trim()) {
    return { valid: false, discountAmount: 0, error: 'Enter a promo code' }
  }

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return { valid: false, discountAmount: 0, error: 'Invalid promo code' }
  }

  const promo = data as ResPromotion
  const now = new Date()

  // Check date validity
  if (promo.start_date && new Date(promo.start_date) > now) {
    return { valid: false, discountAmount: 0, error: 'Promo code not yet active' }
  }
  if (promo.end_date && new Date(promo.end_date) < now) {
    return { valid: false, discountAmount: 0, error: 'Promo code has expired' }
  }

  // Check usage limit
  if (promo.usage_limit !== null && promo.usage_limit !== undefined) {
    const { count } = await supabase
      .from('promotion_usage')
      .select('*', { count: 'exact', head: true })
      .eq('promotion_id', promo.promotion_id)

    if ((count || 0) >= promo.usage_limit) {
      return { valid: false, discountAmount: 0, error: 'Promo code usage limit reached' }
    }
  }

  // Check minimum purchase
  if (promo.minimum_purchase !== null && subtotal < promo.minimum_purchase) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Minimum order amount is $${promo.minimum_purchase.toFixed(2)}`,
    }
  }

  // Calculate discount
  let discountAmount = 0
  if (promo.discount_type === 'percent') {
    discountAmount = Math.min((subtotal * promo.discount_value) / 100, subtotal)
  } else {
    discountAmount = Math.min(promo.discount_value, subtotal)
  }

  return {
    valid: true,
    promotion: promo,
    discountAmount: Math.round(discountAmount * 100) / 100,
  }
}
