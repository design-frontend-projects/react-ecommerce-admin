import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useResposStore } from '@/stores/respos-store'
import type { PromoError, ResPromotion } from '../types'

export function usePromotion() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const cart = useResposStore((state) => state.cart)
  const applyPromoToStore = useResposStore((state) => state.applyPromoCode)
  const applyPromotionToStore = useResposStore((state) => state.applyPromotion)
  const removePromoCode = useResposStore((state) => state.removePromoCode)
  const acknowledgePromoRemoval = useResposStore(
    (state) => state.acknowledgePromoRemoval
  )

  const translateError = (error?: PromoError) =>
    error
      ? t(error.key, { ...error.params, defaultValue: error.key })
      : t('respos.promo.error.invalid')

  // Surface auto-removal (cart edited below minimum purchase, channel switch,
  // no more eligible items) exactly once.
  const promoRemovedKey = cart.promoRemovedKey
  useEffect(() => {
    if (!promoRemovedKey) return
    toast.info(t('respos.promo.removedToast'), {
      description: t(promoRemovedKey, { defaultValue: promoRemovedKey }),
    })
    acknowledgePromoRemoval()
  }, [promoRemovedKey, acknowledgePromoRemoval, t])

  const applyPromo = async (code: string) => {
    setIsLoading(true)
    try {
      const result = await applyPromoToStore(code)
      if (result.success) {
        toast.success(t('respos.promo.applied'), {
          description: t('respos.promo.appliedDesc', { code }),
        })
      } else {
        toast.error(translateError(result.error))
      }
      return result
    } finally {
      setIsLoading(false)
    }
  }

  const applyPromotion = async (promotion: ResPromotion) => {
    setIsLoading(true)
    try {
      const result = await applyPromotionToStore(promotion)
      if (result.success) {
        toast.success(t('respos.promo.applied'), {
          description: t('respos.promo.appliedDesc', {
            code: promotion.code ?? promotion.name,
          }),
        })
      } else {
        toast.error(translateError(result.error))
      }
      return result
    } finally {
      setIsLoading(false)
    }
  }

  const removePromo = () => {
    removePromoCode()
    toast.info(t('respos.promo.removedToast'))
  }

  return {
    applyPromo,
    applyPromotion,
    removePromo,
    isLoading,
    currentPromo: cart.promotion,
    promoCode: cart.promoCode,
    discountAmount: cart.promoDiscountAmount,
  }
}
