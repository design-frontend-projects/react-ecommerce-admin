import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Layers,
  Percent,
  Store as StoreIcon,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  Radio,
  Package,
  Search,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePriceListContext } from './price-list-provider'
import {
  PRICE_LIST_TYPE_LABELS,
  type PriceList,
  type PriceListType,
} from '../data/schema'

interface PriceListViewDialogContentProps {
  currentRow: PriceList
  onClose: () => void
  onEdit: () => void
}

function PriceListViewDialogContent({
  currentRow,
  onClose,
  onEdit,
}: PriceListViewDialogContentProps) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const [searchTerm, setSearchTerm] = useState('')

  const typeConfig = currentRow.type
    ? PRICE_LIST_TYPE_LABELS[currentRow.type as PriceListType]
    : null

  const now = new Date()
  const startDate = currentRow.start_date ? new Date(currentRow.start_date) : null
  const endDate = currentRow.end_date ? new Date(currentRow.end_date) : null

  let validityStatus: 'active' | 'upcoming' | 'expired' = 'active'
  if (startDate && startDate > now) {
    validityStatus = 'upcoming'
  } else if (endDate && endDate < now) {
    validityStatus = 'expired'
  }

  const items = useMemo(
    () => currentRow.price_list_items || [],
    [currentRow.price_list_items]
  )

  // Count distinct products
  const distinctProductCount = useMemo(() => {
    const pids = items.map((i) => i.product_id || i.product_variants?.product_id).filter(Boolean)
    return new Set(pids).size
  }, [items])

  // Price range computation
  const priceRange = useMemo(() => {
    const numericPrices = items
      .map((i) => Number(i.price))
      .filter((p) => !isNaN(p))
    if (numericPrices.length === 0) {
      return currentRow.price != null ? `$${Number(currentRow.price).toFixed(2)}` : '—'
    }
    const min = Math.min(...numericPrices)
    const max = Math.max(...numericPrices)
    if (min === max) {
      return `$${min.toFixed(2)}`
    }
    return `$${min.toFixed(2)} – $${max.toFixed(2)}`
  }, [items, currentRow])

  // Filter items if searching
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items
    const q = searchTerm.toLowerCase()
    return items.filter((item) => {
      const pName = (item.products?.name || '').toLowerCase()
      const pSku = (item.products?.sku || '').toLowerCase()
      const vName = (item.product_variants?.name || '').toLowerCase()
      const vSku = (item.product_variants?.sku || '').toLowerCase()
      return pName.includes(q) || pSku.includes(q) || vName.includes(q) || vSku.includes(q)
    })
  }, [items, searchTerm])

  return (
    <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-4xl'>
      <DialogHeader>
        <div className='flex items-center justify-between gap-2 pr-6'>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <Layers className='h-5 w-5 text-primary' />
            {currentRow.name || currentRow.products?.name || t('priceList.title', { defaultValue: 'Price List' })}
          </DialogTitle>
          {typeConfig && (
            <Badge variant='outline' className={typeConfig.color}>
              {isAr ? typeConfig.labelAr : typeConfig.label}
            </Badge>
          )}
        </div>
        <DialogDescription>
          {t('priceList.viewDescription', {
            defaultValue: 'Detailed pricing tier schedule, scope restrictions, and multi-product pricing rules.',
          })}
        </DialogDescription>
      </DialogHeader>

      <div className='space-y-6 py-2'>
        {/* Header Summary KPI Cards */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          {/* Total Products */}
          <div className='rounded-lg border bg-muted/30 p-3'>
            <div className='text-xs text-muted-foreground flex items-center gap-1'>
              <Package className='h-3.5 w-3.5' />
              {t('priceList.view.totalProducts', { defaultValue: 'Total Products' })}
            </div>
            <div className='text-base font-bold font-mono mt-1'>
              {distinctProductCount > 0 ? distinctProductCount : (currentRow.products ? 1 : 0)}
            </div>
          </div>

          {/* Total Items / Overrides */}
          <div className='rounded-lg border bg-muted/30 p-3'>
            <div className='text-xs text-muted-foreground flex items-center gap-1'>
              <Percent className='h-3.5 w-3.5' />
              {t('priceList.view.totalItems', { defaultValue: 'Total Items' })}
            </div>
            <div className='text-base font-bold font-mono mt-1'>
              {items.length}
            </div>
          </div>

          {/* Price Range */}
          <div className='rounded-lg border bg-muted/30 p-3'>
            <div className='text-xs text-muted-foreground'>
              {t('priceList.view.priceRange', { defaultValue: 'Price Range' })}
            </div>
            <div className='text-sm font-bold text-primary font-mono mt-1 truncate'>
              {priceRange}
            </div>
          </div>

          {/* Validity Timeline */}
          <div className='rounded-lg border bg-muted/30 p-3'>
            <div className='text-xs text-muted-foreground'>
              {t('priceList.columns.validity', { defaultValue: 'Schedule' })}
            </div>
            <div className='mt-1'>
              {validityStatus === 'active' ? (
                <Badge variant='outline' className='text-xs border-emerald-500 text-emerald-600 dark:text-emerald-400'>
                  {t('priceList.status.effectiveNow', { defaultValue: 'In Effect' })}
                </Badge>
              ) : validityStatus === 'upcoming' ? (
                <Badge variant='outline' className='text-xs border-amber-500 text-amber-600 dark:text-amber-400 gap-1'>
                  <Clock className='h-3 w-3' />
                  {t('priceList.status.upcoming', { defaultValue: 'Upcoming' })}
                </Badge>
              ) : (
                <Badge variant='outline' className='text-xs border-zinc-400 text-muted-foreground'>
                  {t('priceList.status.expired', { defaultValue: 'Expired' })}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Scope and Dates Details */}
        <div className='rounded-lg border bg-card p-4 space-y-3 text-sm'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='flex items-center gap-2'>
              <Users className='h-4 w-4 text-muted-foreground' />
              <span className='text-muted-foreground'>
                {t('priceList.form.customerGroup', { defaultValue: 'Target Customer Group' })}:
              </span>
              <span className='font-medium'>
                {currentRow.customer_groups?.name ||
                  t('priceList.form.allGroups', { defaultValue: 'All Customers (No Restriction)' })}
              </span>
            </div>

            <div className='flex items-start gap-2 col-span-1 sm:col-span-2'>
              <StoreIcon className='h-4 w-4 text-muted-foreground mt-0.5' />
              <span className='text-muted-foreground whitespace-nowrap'>
                {t('priceList.form.assignedStores', { defaultValue: 'Assigned Stores' })}:
              </span>
              <div className='flex flex-wrap gap-1.5'>
                {currentRow.price_list_assignments &&
                currentRow.price_list_assignments.filter((a) => a.stores?.name).length > 0 ? (
                  currentRow.price_list_assignments
                    .filter((a) => a.stores?.name)
                    .map((a) => (
                      <Badge key={a.id} variant='secondary' className='text-xs font-normal'>
                        {a.stores?.name}
                        {a.priority != null && (
                          <span className='opacity-60 ml-1 text-[10px]'>(P:{a.priority})</span>
                        )}
                      </Badge>
                    ))
                ) : currentRow.stores?.name ? (
                  <Badge variant='secondary' className='text-xs font-normal'>
                    {currentRow.stores.name}
                  </Badge>
                ) : (
                  <Badge variant='outline' className='text-xs font-normal'>
                    {t('priceList.form.allStoresGlobal', { defaultValue: 'All Stores (Global)' })}
                  </Badge>
                )}
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Coins className='h-4 w-4 text-muted-foreground' />
              <span className='text-muted-foreground'>
                {t('priceList.form.currency', { defaultValue: 'Currency' })}:
              </span>
              <span className='font-medium'>
                {currentRow.currencies
                  ? `${currentRow.currencies.symbol} ${currentRow.currencies.name} (${currentRow.currencies.code})`
                  : t('priceList.form.defaultCurrency', { defaultValue: 'Tenant Default Currency' })}
              </span>
            </div>

            <div className='flex items-center gap-2'>
              <Radio className='h-4 w-4 text-muted-foreground' />
              <span className='text-muted-foreground'>
                {t('priceList.form.channel', { defaultValue: 'Sales Channel' })}:
              </span>
              <span className='font-medium'>
                {currentRow.channels
                  ? (isAr ? currentRow.channels.name_ar || currentRow.channels.name : currentRow.channels.name)
                  : t('priceList.form.allChannels', { defaultValue: 'All Channels' })}
              </span>
            </div>

            <div className='flex items-center gap-2'>
              <Calendar className='h-4 w-4 text-muted-foreground' />
              <span className='text-muted-foreground'>
                {t('priceList.columns.dateRange', { defaultValue: 'Valid Period' })}:
              </span>
              <span className='font-mono font-medium'>
                {currentRow.start_date}{' '}
                {currentRow.end_date ? `→ ${currentRow.end_date}` : t('priceList.view.noExpiration', { defaultValue: '(No Expiration)' })}
              </span>
            </div>

            <div className='flex items-center gap-2'>
              {currentRow.is_active ? (
                <Badge variant='default' className='gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs'>
                  <CheckCircle2 className='h-3 w-3' />
                  {t('common.active', { defaultValue: 'Active' })}
                </Badge>
              ) : (
                <Badge variant='secondary' className='gap-1 text-xs'>
                  <XCircle className='h-3 w-3' />
                  {t('common.inactive', { defaultValue: 'Inactive' })}
                </Badge>
              )}
              {currentRow.is_default && (
                <Badge variant='outline' className='text-xs'>
                  {t('common.default', { defaultValue: 'Default Base List' })}
                </Badge>
              )}
            </div>

            {currentRow.description && (
              <div className='sm:col-span-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md'>
                <span className='font-semibold text-foreground mr-1'>
                  {t('priceList.form.description', { defaultValue: 'Notes' })}:
                </span>
                {currentRow.description}
              </div>
            )}
          </div>
        </div>

        {/* Multi-Product Price Items Table */}
        <div className='rounded-lg border bg-card p-4 space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h4 className='text-sm font-semibold flex items-center gap-1.5'>
              <Percent className='h-4 w-4 text-primary' />
              {t('priceList.view.variantBreakdown', { defaultValue: 'Price List Items Breakdown' })}
            </h4>

            <div className='flex items-center gap-2'>
              {items.length > 5 && (
                <div className='relative w-48'>
                  <Search className='absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground' />
                  <Input
                    placeholder={t('priceList.form.searchItems', { defaultValue: 'Search...' })}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='h-7 pl-7 text-xs'
                  />
                </div>
              )}
              <Badge variant='secondary' className='text-xs'>
                {items.length} {t('priceList.form.itemsBadge', { defaultValue: 'Items' })}
              </Badge>
            </div>
          </div>

          {filteredItems.length > 0 ? (
            <div className='overflow-x-auto rounded-md border'>
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow>
                    <TableHead>{t('priceList.form.productColumn', { defaultValue: 'Product' })}</TableHead>
                    <TableHead>{t('priceList.table.variant', { defaultValue: 'Variant / SKU' })}</TableHead>
                    <TableHead className='text-right'>{t('priceList.table.costRef', { defaultValue: 'Cost Price' })}</TableHead>
                    <TableHead className='text-right'>{t('priceList.table.tierPrice', { defaultValue: 'Price List Price' })}</TableHead>
                    <TableHead className='text-right'>{t('priceList.table.floorPrice', { defaultValue: 'Floor (Min)' })}</TableHead>
                    <TableHead className='text-right'>{t('priceList.table.maxDiscount', { defaultValue: 'Max Disc %' })}</TableHead>
                    <TableHead className='text-right'>{t('priceList.table.margin', { defaultValue: 'Margin' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const cost = item.cost_price != null ? Number(item.cost_price) : 0
                    const price = Number(item.price)
                    const marginPct =
                      cost > 0 && price > 0
                        ? (((price - cost) / price) * 100).toFixed(1)
                        : null

                    return (
                      <TableRow key={item.id}>
                        {/* Product Info */}
                        <TableCell className='font-medium'>
                          <div className='flex flex-col'>
                            <span className='text-sm font-semibold'>
                              {item.products?.name || currentRow.products?.name || '—'}
                            </span>
                            {(item.products?.sku || currentRow.products?.sku) && (
                              <span className='text-xs text-muted-foreground font-mono'>
                                {item.products?.sku || currentRow.products?.sku}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Variant Info */}
                        <TableCell>
                          <div className='flex flex-col'>
                            <span>{item.product_variants?.name || t('priceList.types.standard', { defaultValue: 'Standard' })}</span>
                            <span className='text-xs text-muted-foreground font-mono'>
                              {item.product_variants?.sku || '—'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Cost Price */}
                        <TableCell className='text-right font-medium text-xs font-mono'>
                          ${cost.toFixed(2)}
                        </TableCell>

                        {/* Price List Price */}
                        <TableCell className='text-right font-bold text-primary font-mono'>
                          ${price.toFixed(2)}
                        </TableCell>

                        {/* Min Price (Floor) */}
                        <TableCell className='text-right text-xs font-mono'>
                          ${Number(item.min_price || 0).toFixed(2)}
                        </TableCell>

                        {/* Max Discount % */}
                        <TableCell className='text-right text-xs font-mono'>
                          {Number(item.max_discount_percent || 0).toFixed(1)}%
                        </TableCell>

                        {/* Margin */}
                        <TableCell className='text-right'>
                          {marginPct !== null ? (
                            <Badge
                              variant={Number(marginPct) < 0 ? 'destructive' : Number(marginPct) < 20 ? 'outline' : 'secondary'}
                              className='text-xs font-mono'
                            >
                              {marginPct}%
                            </Badge>
                          ) : (
                            <span className='text-xs text-muted-foreground font-mono'>—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
              {t('priceList.view.noItems', {
                defaultValue: 'No item price rules configured for this price list.',
              })}
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant='outline' onClick={onClose}>
          {t('common.close', { defaultValue: 'Close' })}
        </Button>
        <Button onClick={onEdit}>
          {t('priceList.editPriceList', { defaultValue: 'Edit Price List' })}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export function PriceListViewDialog() {
  const { open, setOpen, currentRow } = usePriceListContext()
  const isOpen = open === 'view' && Boolean(currentRow)

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      {isOpen && currentRow && (
        <PriceListViewDialogContent
          key={currentRow.id}
          currentRow={currentRow}
          onClose={() => setOpen(null)}
          onEdit={() => setOpen('edit')}
        />
      )}
    </Dialog>
  )
}
