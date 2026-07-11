// Searchable list of eligible promotions for the current order channel, with
// a live discount preview against the cart. Sits beside the code input —
// selecting a promo runs the same validation path as entering its code.
import { useState } from 'react'
import { BadgePercent, ChevronDown, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useResposStore } from '@/stores/respos-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useEligiblePromotions } from '../../api/queries'
import { usePromotion } from '../../hooks/use-promotion'
import { formatCurrency } from '../../lib/formatters'
import {
  computePromoDiscount,
  type PromoCartLine,
} from '../../lib/promo-engine'
import type { ResPromotion } from '../../types'

function promoTypeKey(promotion: ResPromotion): string {
  switch (promotion.promo_type) {
    case 'item_discount':
      return 'respos.promo.type.itemDiscount'
    case 'buy_x_get_y':
      return 'respos.promo.type.buyXGetY'
    default:
      return 'respos.promo.type.orderDiscount'
  }
}

export function PromoSelect() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const cart = useResposStore((state) => state.cart)
  const orderType = useResposStore((state) => state.orderType)
  const { applyPromotion, isLoading } = usePromotion()

  const { data: promotions, isLoading: isLoadingList } = useEligiblePromotions(
    orderType,
    { enabled: open }
  )

  const lines: PromoCartLine[] = cart.items.map((ci) => ({
    itemId: ci.item.id,
    categoryId: ci.item.category_id ?? null,
    quantity: ci.quantity,
    unitPrice: ci.quantity > 0 ? ci.lineTotal / ci.quantity : 0,
    lineTotal: ci.lineTotal,
  }))

  const previewFor = (promotion: ResPromotion): number => {
    const { discountAmount, error } = computePromoDiscount(
      promotion,
      lines,
      cart.subtotal
    )
    return error ? 0 : discountAmount
  }

  const handleSelect = async (promotion: ResPromotion) => {
    const result = await applyPromotion(promotion)
    if (result.success) setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          disabled={isLoading || cart.items.length === 0}
          className='h-10 w-full justify-between rounded-xl font-bold'
        >
          <span className='flex items-center gap-2'>
            <BadgePercent className='h-4 w-4 text-orange-600' />
            {t('respos.promo.select.title')}
          </span>
          <ChevronDown className='h-4 w-4 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[360px] p-0' align='start'>
        <Command>
          <CommandInput
            placeholder={t('respos.promo.select.searchPlaceholder')}
          />
          <CommandList>
            {isLoadingList ? (
              <div className='flex items-center justify-center py-6'>
                <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
              </div>
            ) : (
              <>
                <CommandEmpty>{t('respos.promo.select.empty')}</CommandEmpty>
                <CommandGroup>
                  {promotions?.map((promotion) => {
                    const preview = previewFor(promotion)
                    return (
                      <CommandItem
                        key={promotion.promotion_id}
                        value={`${promotion.name} ${promotion.code ?? ''}`}
                        onSelect={() => handleSelect(promotion)}
                        className='flex items-start justify-between gap-2 py-3'
                      >
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-bold'>
                            {promotion.name}
                          </p>
                          <div className='mt-1 flex flex-wrap items-center gap-1.5'>
                            {promotion.code && (
                              <Badge
                                variant='outline'
                                className='font-mono text-[10px]'
                              >
                                {promotion.code}
                              </Badge>
                            )}
                            <Badge variant='secondary' className='text-[10px]'>
                              {promotion.promo_type === 'buy_x_get_y'
                                ? t('respos.promo.type.buyXGetY', {
                                    buy: promotion.buy_quantity ?? 0,
                                    get: promotion.get_quantity ?? 0,
                                  })
                                : t(promoTypeKey(promotion))}
                            </Badge>
                          </div>
                        </div>
                        {preview > 0 && (
                          <span className='shrink-0 text-xs font-black text-emerald-600'>
                            {t('respos.promo.select.preview', {
                              amount: formatCurrency(preview),
                            })}
                          </span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
