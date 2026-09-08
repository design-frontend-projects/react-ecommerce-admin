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
  type PriceListType,
} from '../data/schema'

export function PriceListViewDialog() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { open, setOpen, currentRow } = usePriceListContext()

  const isOpen = open === 'view' && Boolean(currentRow)
  if (!currentRow) return null

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

  const items = currentRow.price_list_items || []

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <div className='flex items-center justify-between gap-2 pr-6'>
            <DialogTitle className='flex items-center gap-2 text-xl'>
              <Layers className='h-5 w-5 text-primary' />
              {currentRow.products?.name || t('priceList.title', { defaultValue: 'Price List' })}
            </DialogTitle>
            {typeConfig && (
              <Badge variant='outline' className={typeConfig.color}>
                {isAr ? typeConfig.labelAr : typeConfig.label}
              </Badge>
            )}
          </div>
          <DialogDescription>
            {t('priceList.viewDescription', {
              defaultValue: 'Detailed pricing tier schedule, scope restrictions, and variant overrides.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-2'>
          {/* Header Summary Cards */}
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            {/* Product SKU */}
            <div className='rounded-lg border bg-muted/30 p-3'>
              <div className='text-xs text-muted-foreground'>
                {t('priceList.columns.sku', { defaultValue: 'Product SKU' })}
              </div>
              <div className='text-sm font-semibold font-mono mt-1'>
                {currentRow.products?.sku || '—'}
              </div>
            </div>

            {/* Default Base Price */}
            <div className='rounded-lg border bg-muted/30 p-3'>
              <div className='text-xs text-muted-foreground'>
                {t('priceList.columns.defaultPrice', { defaultValue: 'Default List Price' })}
              </div>
              <div className='text-base font-bold text-primary mt-1'>
                ${Number(currentRow.price).toFixed(2)}
              </div>
            </div>

            {/* Status */}
            <div className='rounded-lg border bg-muted/30 p-3'>
              <div className='text-xs text-muted-foreground'>
                {t('priceList.columns.status', { defaultValue: 'Status' })}
              </div>
              <div className='mt-1'>
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

              <div className='flex items-center gap-2'>
                <StoreIcon className='h-4 w-4 text-muted-foreground' />
                <span className='text-muted-foreground'>
                  {t('priceList.form.store', { defaultValue: 'Target Store' })}:
                </span>
                <span className='font-medium'>
                  {currentRow.stores?.name ||
                    t('priceList.form.allStores', { defaultValue: 'All Stores / Global' })}
                </span>
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
                  {currentRow.end_date ? `→ ${currentRow.end_date}` : '(No Expiration)'}
                </span>
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

          {/* Variant Price Items Table */}
          <div className='rounded-lg border bg-card p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <h4 className='text-sm font-semibold flex items-center gap-1.5'>
                <Percent className='h-4 w-4 text-primary' />
                {t('priceList.view.variantBreakdown', { defaultValue: 'Variant Price Rules (price_list_items)' })}
              </h4>
              <Badge variant='secondary' className='text-xs'>
                {items.length} {t('priceList.form.variantsLabel', { defaultValue: 'Variants' })}
              </Badge>
            </div>

            {items.length > 0 ? (
              <div className='overflow-x-auto rounded-md border'>
                <Table>
                  <TableHeader className='bg-muted/50'>
                    <TableRow>
                      <TableHead>{t('priceList.table.variant', { defaultValue: 'Variant / SKU' })}</TableHead>
                      <TableHead className='text-right'>{t('priceList.table.costRef', { defaultValue: 'Cost Price' })}</TableHead>
                      <TableHead className='text-right'>{t('priceList.table.tierPrice', { defaultValue: 'Price List Price' })}</TableHead>
                      <TableHead className='text-right'>{t('priceList.table.floorPrice', { defaultValue: 'Min Price (Floor)' })}</TableHead>
                      <TableHead className='text-right'>{t('priceList.table.maxDiscount', { defaultValue: 'Max Discount %' })}</TableHead>
                      <TableHead className='text-right'>{t('priceList.table.margin', { defaultValue: 'Margin' })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const cost = item.cost_price != null ? Number(item.cost_price) : null
                      const price = Number(item.price)
                      const marginPct =
                        cost != null && price > 0
                          ? (((price - Number(cost)) / price) * 100).toFixed(1)
                          : null

                      return (
                        <TableRow key={item.id}>
                          <TableCell className='font-medium'>
                            <div className='flex flex-col'>
                              <span>{item.product_variants?.name || 'Standard'}</span>
                              <span className='text-xs text-muted-foreground font-mono'>
                                {item.product_variants?.sku || '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='text-right font-medium'>
                            ${cost != null ? cost.toFixed(2) : '0.00'}
                          </TableCell>
                          <TableCell className='text-right font-bold text-primary'>
                            ${price.toFixed(2)}
                          </TableCell>
                          <TableCell className='text-right'>
                            ${Number(item.min_price).toFixed(2)}
                          </TableCell>
                          <TableCell className='text-right'>
                            {Number(item.max_discount_percent).toFixed(1)}%
                          </TableCell>
                          <TableCell className='text-right'>
                            {marginPct !== null ? (
                              <Badge
                                variant={Number(marginPct) < 0 ? 'destructive' : 'secondary'}
                                className='text-xs font-mono'
                              >
                                {marginPct}%
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
                {t('priceList.view.noItems', {
                  defaultValue: 'No variant overrides configured. All variants adhere to the header price.',
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(null)}>
            {t('common.close', { defaultValue: 'Close' })}
          </Button>
          <Button
            onClick={() => {
              setOpen('edit')
            }}
          >
            {t('common.edit', { defaultValue: 'Edit Price List' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
