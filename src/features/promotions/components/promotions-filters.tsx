import { useTranslation } from 'react-i18next'
import { Search, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PromotionStatus } from '@/features/promotions/types'

interface PromotionsFiltersProps {
  search: string
  onSearchChange: (val: string) => void
  status: PromotionStatus | 'all'
  onStatusChange: (val: PromotionStatus | 'all') => void
  promoType: string
  onPromoTypeChange: (val: string) => void
  onReset: () => void
}

export function PromotionsFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  promoType,
  onPromoTypeChange,
  onReset,
}: PromotionsFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
      <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('promotions.filters.searchPlaceholder', 'Search by name, code...')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>

        <Select value={status} onValueChange={(v) => onStatusChange(v as PromotionStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-36 h-9 bg-background">
            <SelectValue placeholder={t('promotions.common.status', 'Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('promotions.filters.allStatuses', 'All Statuses')}</SelectItem>
            <SelectItem value="active">{t('promotions.common.active', 'Active')}</SelectItem>
            <SelectItem value="draft">{t('promotions.common.draft', 'Draft')}</SelectItem>
            <SelectItem value="paused">{t('promotions.common.paused', 'Paused')}</SelectItem>
            <SelectItem value="scheduled">{t('promotions.common.scheduled', 'Scheduled')}</SelectItem>
            <SelectItem value="expired">{t('promotions.common.expired', 'Expired')}</SelectItem>
            <SelectItem value="archived">{t('promotions.common.archived', 'Archived')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={promoType} onValueChange={onPromoTypeChange}>
          <SelectTrigger className="w-full sm:w-44 h-9 bg-background">
            <SelectValue placeholder={t('promotions.common.type', 'Type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('promotions.filters.allTypes', 'All Types')}</SelectItem>
            <SelectItem value="percentage">{t('promotions.common.percentage', 'Percentage Off')}</SelectItem>
            <SelectItem value="fixed_amount">{t('promotions.common.fixedAmount', 'Fixed Amount')}</SelectItem>
            <SelectItem value="buy_x_get_y">{t('promotions.common.buyXGetY', 'Buy X Get Y (BXGY)')}</SelectItem>
            <SelectItem value="free_item">{t('promotions.common.freeItem', 'Free Item / Gift')}</SelectItem>
            <SelectItem value="order_discount">{t('promotions.common.orderDiscount', 'Order Discount')}</SelectItem>
            <SelectItem value="tiered">{t('promotions.common.tiered', 'Tiered Discount')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> {t('promotions.filters.reset', 'Reset')}
      </Button>
    </div>
  )
}
