import { useState } from 'react'
import { toast } from 'sonner'
import { useResposStore } from '@/stores/respos-store'

export function usePromotion() {
  const [isLoading, setIsLoading] = useState(false)
  const cart = useResposStore((state) => state.cart)
  const applyPromoToStore = useResposStore((state) => state.applyPromoCode)
  const removePromoCode = useResposStore((state) => state.removePromoCode)

  const applyPromo = async (code: string) => {
    setIsLoading(true)
    try {
      const result = await applyPromoToStore(code)
      if (result.success) {
        toast.success(`Promo applied`, {
          description: `Code ${code} applied successfully`,
        })
      } else {
        toast.error(result.error || 'Failed to apply promo code')
      }
      return result
    } finally {
      setIsLoading(false)
    }
  }

  const removePromo = () => {
    removePromoCode()
    toast.info('Promo code removed')
  }

  return {
    applyPromo,
    removePromo,
    isLoading,
    currentPromo: cart.promotion,
    promoCode: cart.promoCode,
    discountAmount: cart.promoDiscountAmount,
  }
}
