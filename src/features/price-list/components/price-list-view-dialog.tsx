import { useMemo, useState, useEffect } from 'react'
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
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
import { usePriceListItemsServerQuery } from '../hooks/use-price-list'
import {
  PRICE_LIST_TYPE_LABELS,
  PRICE_SOURCE_LABELS,
  type PriceList,
  type PriceListType,
  type PriceSource,
} from '../data/schema'
import { calculateTaxBreakdown, getTaxRatePercentage } from '../utils/pricing-calculator'

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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const {
    data: serverItemsResult,
    isLoading: isItemsLoading,
    isFetching: isItemsFetching,
  } = usePriceListItemsServerQuery({
    priceListId: currentRow.id,
    search: debouncedSearch,
    page,
    pageSize,
  })

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

  // Display items: use server query result if available, fallback to client-side sliced items
  const items = useMemo(() => {
    if (serverItemsResult?.items) {
      return serverItemsResult.items
    }
    const rawItems = currentRow.price_list_items || []
    if (!debouncedSearch) {
      return rawItems.slice((page - 1) * pageSize, page * pageSize)
    }
    const q = debouncedSearch.toLowerCase()
    const filtered = rawItems.filter((item) => {
      const pName = (item.products?.name || '').toLowerCase()
      const pSku = (item.products?.sku || '').toLowerCase()
      const vName = (item.product_variants?.name || '').toLowerCase()
      const vSku = (item.product_variants?.sku || '').toLowerCase()
      return pName.includes(q) || pSku.includes(q) || vName.includes(q) || vSku.includes(q)
    })
    return filtered.slice((page - 1) * pageSize, page * pageSize)
  }, [serverItemsResult, currentRow.price_list_items, debouncedSearch, page, pageSize])

  const totalCount = useMemo(() => {
    if (serverItemsResult?.totalCount != null) {
      return serverItemsResult.totalCount
    }
    const rawItems = currentRow.price_list_items || []
    if (!debouncedSearch) {
      return rawItems.length
    }
    const q = debouncedSearch.toLowerCase()
    return rawItems.filter((item) => {
      const pName = (item.products?.name || '').toLowerCase()
      const pSku = (item.products?.sku || '').toLowerCase()
      const vName = (item.product_variants?.name || '').toLowerCase()
      const vSku = (item.product_variants?.sku || '').toLowerCase()
      return pName.includes(q) || pSku.includes(q) || vName.includes(q) || vSku.includes(q)
    }).length
  }, [serverItemsResult, currentRow.price_list_items, debouncedSearch])

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  // Count distinct products
  const distinctProductCount = useMemo(() => {
    const raw = currentRow.price_list_items || []
    if (raw.length > 0) {
      const pids = raw.map((i) => i.product_id || i.product_variants?.product_id).filter(Boolean)
      return new Set(pids).size
    }
    return currentRow.products ? 1 : totalCount > 0 ? totalCount : 0
  }, [currentRow, totalCount])

  // Price range computation
  const priceRange = useMemo(() => {
    const raw = currentRow.price_list_items || []
    const sourceItems = raw.length > 0 ? raw : items
    const numericPrices = sourceItems
      .map((i) => Number(i.price))
      .filter((p) => !isNaN(p) && p > 0)
    if (numericPrices.length === 0) {
      return currentRow.price != null ? `$${Number(currentRow.price).toFixed(2)}` : '—'
    }
    const min = Math.min(...numericPrices)
    const max = Math.max(...numericPrices)
    if (min === max) {
      return `$${min.toFixed(2)}`
    }
    return `$${min.toFixed(2)} – $${max.toFixed(2)}`
  }, [currentRow, items])

  return (
    <DialogContent className='w-[96vw] max-w-6xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden'>
      <DialogHeader className='flex-shrink-0'>
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

      <div className='flex-1 overflow-y-auto space-y-6 py-2 pr-1'>
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
              {totalCount}
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

            {/* Default Price Source & Tax */}
            <div className='flex flex-wrap items-center gap-2 sm:col-span-2 pt-1 border-t border-dashed'>
              <div className='flex items-center gap-1.5'>
                <span className='text-xs text-muted-foreground'>
                  {t('priceList.form.defaultPriceSource', { defaultValue: 'Default Source' })}:
                </span>
                {(() => {
                  const src = (currentRow.price_source as PriceSource) || 'MANUAL'
                  const cfg = PRICE_SOURCE_LABELS[src]
                  return (
                    <Badge variant='outline' className={`text-xs ${cfg?.color || ''}`}>
                      {isAr ? cfg?.labelAr : cfg?.label}
                    </Badge>
                  )
                })()}
              </div>

              {currentRow.markup_percent != null && Number(currentRow.markup_percent) > 0 && (
                <div className='flex items-center gap-1.5'>
                  <span className='text-xs text-muted-foreground'>
                    {t('priceList.form.defaultMarkup', { defaultValue: 'Default Markup' })}:
                  </span>
                  <Badge variant='secondary' className='text-xs font-mono text-blue-600 dark:text-blue-400'>
                    +{Number(currentRow.markup_percent).toFixed(1)}%
                  </Badge>
                </div>
              )}

              <div className='flex items-center gap-1.5'>
                <span className='text-xs text-muted-foreground'>
                  {t('priceList.form.defaultTaxRate', { defaultValue: 'Default Tax Rate' })}:
                </span>
                {currentRow.tax_rates ? (
                  <Badge variant='outline' className='text-xs font-mono border-indigo-400 text-indigo-700 dark:text-indigo-300'>
                    {currentRow.tax_rates.name} ({getTaxRatePercentage(currentRow.tax_rates.rate)}% {currentRow.tax_rates.is_inclusive ? 'Inc' : 'Exc'})
                  </Badge>
                ) : (
                  <span className='text-xs text-muted-foreground font-mono'>
                    {t('priceList.form.noTax', { defaultValue: 'None (0%)' })}
                  </span>
                )}
              </div>
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

        {/* Multi-Product Price Items Section */}
        <div className='rounded-lg border bg-card p-4 space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <Percent className='h-4 w-4 text-primary' />
              <h4 className='text-sm font-semibold'>
                {t('priceList.view.variantBreakdown', { defaultValue: 'Price List Items Breakdown' })}
              </h4>
              <Badge variant='secondary' className='text-xs font-mono'>
                {totalCount} {t('priceList.form.itemsBadge', { defaultValue: 'Items' })}
              </Badge>
            </div>

            <div className='flex items-center gap-2'>
              <div className='relative w-48 sm:w-64'>
                <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  placeholder={t('priceList.form.searchItems', { defaultValue: 'Search items, SKU, variant...' })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='h-8 pl-8 pr-7 text-xs'
                />
                {searchTerm && (
                  <button
                    type='button'
                    onClick={() => setSearchTerm('')}
                    className='absolute right-2 top-2 text-muted-foreground hover:text-foreground'
                  >
                    <X className='h-3.5 w-3.5' />
                  </button>
                )}
              </div>
            </div>
          </div>

          {isItemsLoading && items.length === 0 ? (
            <div className='flex items-center justify-center p-8'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />
            </div>
          ) : items.length > 0 ? (
            <>
              {/* Desktop Table View (lg+) */}
              <div className='hidden lg:block overflow-x-auto rounded-md border'>
                <Table>
                  <TableHeader className='bg-muted/50'>
                    <TableRow>
                      <TableHead>{t('priceList.form.productColumn', { defaultValue: 'Product' })}</TableHead>
                      <TableHead>{t('priceList.table.variant', { defaultValue: 'Variant / SKU' })}</TableHead>
                      <TableHead>{t('priceList.table.source', { defaultValue: 'Source' })}</TableHead>
                      <TableHead className='text-right'>{t('priceList.table.costRef', { defaultValue: 'Cost' })}</TableHead>
                      <TableHead className='text-right'>{t('priceList.table.markup', { defaultValue: 'Markup %' })}</TableHead>
                      <TableHead className='text-right'>{t('priceList.table.tierPrice', { defaultValue: 'Selling Price' })}</TableHead>
                      <TableHead className='text-center'>{t('priceList.table.tax', { defaultValue: 'Tax Rate' })}</TableHead>
                      <TableHead className='text-right font-medium text-muted-foreground'>{t('priceList.table.beforeTax', { defaultValue: 'Before Tax' })}</TableHead>
                      <TableHead className='text-right font-medium text-muted-foreground'>{t('priceList.table.taxAmount', { defaultValue: 'Tax Amt' })}</TableHead>
                      <TableHead className='text-right font-bold text-foreground'>{t('priceList.table.afterTax', { defaultValue: 'After Tax' })}</TableHead>
                      <TableHead className='text-right'>{t('priceList.table.floorPrice', { defaultValue: 'Floor' })}</TableHead>
                      <TableHead className='text-right'>{t('priceList.table.margin', { defaultValue: 'Margin' })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const cost = item.cost_price != null ? Number(item.cost_price) : 0
                      const price = Number(item.price)
                      const marginPct =
                        cost > 0 && price > 0
                          ? (((price - cost) / price) * 100).toFixed(1)
                          : null

                      const effectiveSource: PriceSource = (item.price_source as PriceSource) || (currentRow.price_source as PriceSource) || 'MANUAL'
                      const sourceConfig = PRICE_SOURCE_LABELS[effectiveSource]
                      const effectiveTaxRate = item.tax_rates || currentRow.tax_rates
                      const taxBreakdown = calculateTaxBreakdown(
                        price,
                        effectiveTaxRate?.rate != null ? Number(effectiveTaxRate.rate) : null,
                        effectiveTaxRate?.is_inclusive ?? false
                      )
                      const itemMarkup = item.markup_percent != null ? Number(item.markup_percent) : currentRow.markup_percent != null ? Number(currentRow.markup_percent) : null

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

                          {/* Price Source */}
                          <TableCell>
                            {sourceConfig ? (
                              <Badge variant='outline' className={`text-[10px] px-1.5 py-0 whitespace-nowrap ${sourceConfig.color}`}>
                                {isAr ? sourceConfig.labelAr : sourceConfig.label}
                              </Badge>
                            ) : (
                              <span className='text-xs text-muted-foreground'>—</span>
                            )}
                          </TableCell>

                          {/* Cost Price */}
                          <TableCell className='text-right font-medium text-xs font-mono'>
                            ${cost.toFixed(2)}
                          </TableCell>

                          {/* Markup % */}
                          <TableCell className='text-right font-mono text-xs'>
                            {itemMarkup != null && itemMarkup > 0 ? (
                              <span className='text-blue-600 dark:text-blue-400 font-medium'>
                                +{itemMarkup.toFixed(1)}%
                              </span>
                            ) : (
                              <span className='text-muted-foreground'>—</span>
                            )}
                          </TableCell>

                          {/* Selling Price */}
                          <TableCell className='text-right font-bold text-primary font-mono'>
                            ${price.toFixed(2)}
                          </TableCell>

                          {/* Tax Rate */}
                          <TableCell className='text-center text-xs font-mono'>
                            {effectiveTaxRate ? (
                              <Badge variant='outline' className='text-[10px] border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'>
                                {getTaxRatePercentage(effectiveTaxRate.rate)}% {effectiveTaxRate.is_inclusive ? '(Inc)' : '(Exc)'}
                              </Badge>
                            ) : (
                              <span className='text-muted-foreground text-[11px]'>0%</span>
                            )}
                          </TableCell>

                          {/* Price Before Tax (read only) */}
                          <TableCell className='text-right font-mono text-xs text-muted-foreground bg-muted/20'>
                            ${taxBreakdown.priceBeforeTax.toFixed(2)}
                          </TableCell>

                          {/* Tax Amount (read only) */}
                          <TableCell className='text-right font-mono text-xs text-muted-foreground bg-muted/20'>
                            ${taxBreakdown.taxAmount.toFixed(2)}
                          </TableCell>

                          {/* Price After Tax (read only) */}
                          <TableCell className='text-right font-mono text-xs font-semibold text-foreground bg-muted/20'>
                            ${taxBreakdown.priceAfterTax.toFixed(2)}
                          </TableCell>

                          {/* Min Price (Floor) */}
                          <TableCell className='text-right text-xs font-mono'>
                            ${Number(item.min_price || 0).toFixed(2)}
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

              {/* Mobile & Tablet Card View (< lg) */}
              <div className='block lg:hidden space-y-3'>
                {items.map((item) => {
                  const cost = item.cost_price != null ? Number(item.cost_price) : 0
                  const price = Number(item.price)
                  const marginPct =
                    cost > 0 && price > 0
                      ? (((price - cost) / price) * 100).toFixed(1)
                      : null

                  const effectiveSource: PriceSource = (item.price_source as PriceSource) || (currentRow.price_source as PriceSource) || 'MANUAL'
                  const sourceConfig = PRICE_SOURCE_LABELS[effectiveSource]
                  const effectiveTaxRate = item.tax_rates || currentRow.tax_rates
                  const taxBreakdown = calculateTaxBreakdown(
                    price,
                    effectiveTaxRate?.rate != null ? Number(effectiveTaxRate.rate) : null,
                    effectiveTaxRate?.is_inclusive ?? false
                  )
                  const itemMarkup = item.markup_percent != null ? Number(item.markup_percent) : currentRow.markup_percent != null ? Number(currentRow.markup_percent) : null

                  return (
                    <div key={item.id} className='rounded-lg border bg-card p-3 shadow-xs space-y-2.5'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <div className='font-semibold text-sm truncate'>
                            {item.products?.name || currentRow.products?.name || '—'}
                          </div>
                          <div className='flex items-center gap-1.5 flex-wrap mt-0.5 text-xs text-muted-foreground'>
                            <span className='font-medium text-foreground'>
                              {item.product_variants?.name || t('priceList.types.standard', { defaultValue: 'Standard' })}
                            </span>
                            {(item.product_variants?.sku || item.products?.sku) && (
                              <span className='font-mono text-[11px] bg-muted/60 px-1 py-0.5 rounded'>
                                {item.product_variants?.sku || item.products?.sku}
                              </span>
                            )}
                          </div>
                        </div>
                        {sourceConfig && (
                          <Badge variant='outline' className={`text-[10px] shrink-0 ${sourceConfig.color}`}>
                            {isAr ? sourceConfig.labelAr : sourceConfig.label}
                          </Badge>
                        )}
                      </div>

                      <div className='grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t text-xs'>
                        <div>
                          <span className='text-[10px] text-muted-foreground block'>{t('priceList.table.costRef', { defaultValue: 'Cost' })}</span>
                          <span className='font-mono font-medium'>${cost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className='text-[10px] text-muted-foreground block'>{t('priceList.table.markup', { defaultValue: 'Markup' })}</span>
                          <span className='font-mono font-medium text-blue-600 dark:text-blue-400'>
                            {itemMarkup != null && itemMarkup > 0 ? `+${itemMarkup.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className='text-[10px] text-muted-foreground block'>{t('priceList.table.tierPrice', { defaultValue: 'Selling' })}</span>
                          <span className='font-mono font-bold text-primary'>${price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className='text-[10px] text-muted-foreground block'>{t('priceList.table.afterTax', { defaultValue: 'After Tax' })}</span>
                          <span className='font-mono font-medium'>${taxBreakdown.priceAfterTax.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className='text-[10px] text-muted-foreground block'>{t('priceList.table.floorPrice', { defaultValue: 'Floor' })}</span>
                          <span className='font-mono text-muted-foreground'>${Number(item.min_price || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className='text-[10px] text-muted-foreground block'>{t('priceList.table.margin', { defaultValue: 'Margin' })}</span>
                          {marginPct !== null ? (
                            <Badge
                              variant={Number(marginPct) < 0 ? 'destructive' : Number(marginPct) < 20 ? 'outline' : 'secondary'}
                              className='text-[10px] px-1 py-0 font-mono'
                            >
                              {marginPct}%
                            </Badge>
                          ) : (
                            <span className='text-muted-foreground'>—</span>
                          )}
                        </div>
                      </div>

                      {effectiveTaxRate && (
                        <div className='text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-dashed'>
                          <span>Tax: {effectiveTaxRate.name} ({getTaxRatePercentage(effectiveTaxRate.rate)}% {effectiveTaxRate.is_inclusive ? 'Inc' : 'Exc'})</span>
                          <span className='font-mono text-[10px]'>Amt: ${taxBreakdown.taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Server Pagination Bar */}
              <div className='flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs text-muted-foreground'>
                <div className='flex items-center gap-2'>
                  <span>
                    {t('priceList.form.showing', { defaultValue: 'Showing' })}{' '}
                    <strong className='text-foreground font-mono'>
                      {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}
                    </strong>{' '}
                    -{' '}
                    <strong className='text-foreground font-mono'>
                      {Math.min(page * pageSize, totalCount)}
                    </strong>{' '}
                    {t('priceList.form.of', { defaultValue: 'of' })}{' '}
                    <strong className='text-foreground font-mono'>{totalCount}</strong>
                  </span>
                  {isItemsFetching && (
                    <Loader2 className='h-3.5 w-3.5 animate-spin text-primary ml-1' />
                  )}
                </div>

                <div className='flex items-center gap-2'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-xs'>{t('priceList.form.rowsPerPage', { defaultValue: 'Rows:' })}</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setPage(1)
                      }}
                      className='h-7 rounded border bg-background px-2 text-xs text-foreground'
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className='flex items-center gap-1'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-7 px-2 text-xs'
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || isItemsLoading}
                    >
                      <ChevronLeft className='h-3.5 w-3.5 mr-1' />
                      {t('common.prev', { defaultValue: 'Prev' })}
                    </Button>
                    <span className='px-2 font-mono text-xs'>
                      {page} / {totalPages || 1}
                    </span>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-7 px-2 text-xs'
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || isItemsLoading}
                    >
                      {t('common.next', { defaultValue: 'Next' })}
                      <ChevronRight className='h-3.5 w-3.5 ml-1' />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
              {debouncedSearch
                ? t('priceList.view.noMatchingItems', { defaultValue: 'No items match your search.' })
                : t('priceList.view.noItems', { defaultValue: 'No item price rules configured for this price list.' })}
            </div>
          )}
        </div>
      </div>

      <DialogFooter className='flex-shrink-0 pt-3 border-t flex flex-row items-center justify-between sm:justify-end gap-2'>
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
