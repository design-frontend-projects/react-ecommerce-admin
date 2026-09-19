import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrendingDown,
  TrendingUp,
  CheckCircle,
  ShieldAlert,
  Search,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CountItemRow } from '../data/schema'

interface VarianceReviewProps {
  items: CountItemRow[]
}

type VarianceFilter = 'all' | 'discrepancy' | 'shrinkage' | 'surplus' | 'match'

export function VarianceReview({ items }: VarianceReviewProps) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [varianceFilter, setVarianceFilter] = useState<VarianceFilter>('all')

  const {
    matchedCount,
    shrinkageCount,
    surplusCount,
    totalShrinkageUnits,
    totalSurplusUnits,
    netFinancialDiscrepancy,
    processedItems,
  } = useMemo(() => {
    let matched = 0
    let shrinkage = 0
    let surplus = 0
    let shrinkageUnits = 0
    let surplusUnits = 0
    let financialNet = 0

    const processed = items.map((it) => {
      const counted = it.qty_counted !== null ? Number(it.qty_counted) : null
      const snapshot = Number(it.qty_snapshot || 0)
      const variance = counted !== null ? counted - snapshot : null
      const unitCost = Number(it.unit_cost || 0)
      const varianceValue = variance !== null ? variance * unitCost : 0

      if (variance === 0) {
        matched++
      } else if (variance !== null && variance < 0) {
        shrinkage++
        shrinkageUnits += Math.abs(variance)
        financialNet += varianceValue
      } else if (variance !== null && variance > 0) {
        surplus++
        surplusUnits += variance
        financialNet += varianceValue
      }

      return {
        ...it,
        variance,
        unitCost,
        varianceValue,
      }
    })

    return {
      matchedCount: matched,
      shrinkageCount: shrinkage,
      surplusCount: surplus,
      totalShrinkageUnits: shrinkageUnits,
      totalSurplusUnits: surplusUnits,
      netFinancialDiscrepancy: financialNet,
      processedItems: processed,
    }
  }, [items])

  const filteredItems = useMemo(() => {
    return processedItems.filter((item) => {
      const sku = (item.product_variants?.sku || item.product_variant_id).toLowerCase()
      const name = (item.product_variants?.products?.name || '').toLowerCase()
      const term = searchTerm.toLowerCase()

      if (term && !sku.includes(term) && !name.includes(term)) {
        return false
      }

      if (varianceFilter === 'discrepancy') return item.variance !== 0 && item.variance !== null
      if (varianceFilter === 'shrinkage') return item.variance !== null && item.variance < 0
      if (varianceFilter === 'surplus') return item.variance !== null && item.variance > 0
      if (varianceFilter === 'match') return item.variance === 0

      return true
    })
  }, [processedItems, searchTerm, varianceFilter])

  return (
    <div className='space-y-4'>
      {/* KPI Cards Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
        {/* Exact Matches */}
        <Card className='border-emerald-200/60 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20'>
          <CardContent className='p-3.5 flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-emerald-500/10 text-emerald-600'>
              <CheckCircle className='h-5 w-5' />
            </div>
            <div className='truncate'>
              <p className='text-xs text-muted-foreground font-medium'>
                {t('stockCounts.variance.exactMatches', 'Exact Matches')}
              </p>
              <p className='text-lg font-bold text-emerald-700 dark:text-emerald-300'>
                {matchedCount} / {items.length} {t('stockCounts.variance.lines', 'Lines')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shrinkage / Missing */}
        <Card className='border-rose-200/60 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20'>
          <CardContent className='p-3.5 flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-rose-500/10 text-rose-600'>
              <TrendingDown className='h-5 w-5' />
            </div>
            <div className='truncate'>
              <p className='text-xs text-muted-foreground font-medium'>
                {t('stockCounts.variance.shrinkageMissing', 'Shrinkage / Missing')}
              </p>
              <p className='text-lg font-bold text-rose-700 dark:text-rose-300'>
                -{totalShrinkageUnits} {t('stockCounts.variance.units', 'Units')} ({shrinkageCount})
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Surplus / Overage */}
        <Card className='border-blue-200/60 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20'>
          <CardContent className='p-3.5 flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-blue-500/10 text-blue-600'>
              <TrendingUp className='h-5 w-5' />
            </div>
            <div className='truncate'>
              <p className='text-xs text-muted-foreground font-medium'>
                {t('stockCounts.variance.surplusOverage', 'Surplus / Overage')}
              </p>
              <p className='text-lg font-bold text-blue-700 dark:text-blue-300'>
                +{totalSurplusUnits} {t('stockCounts.variance.units', 'Units')} ({surplusCount})
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Impact */}
        <Card
          className={`border ${
            netFinancialDiscrepancy < 0
              ? 'border-amber-200/60 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20'
              : 'border-indigo-200/60 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20'
          }`}
        >
          <CardContent className='p-3.5 flex items-center gap-3'>
            <div
              className={`p-2 rounded-lg ${
                netFinancialDiscrepancy < 0
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-indigo-500/10 text-indigo-600'
              }`}
            >
              <DollarSign className='h-5 w-5' />
            </div>
            <div className='truncate'>
              <p className='text-xs text-muted-foreground font-medium'>
                {t('stockCounts.variance.financialImpact', 'Net Value Impact')}
              </p>
              <p
                className={`text-lg font-bold ${
                  netFinancialDiscrepancy < 0
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {netFinancialDiscrepancy >= 0 ? '+' : ''}
                {netFinancialDiscrepancy.toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ABAC Segregation of Duties Notice */}
      <div className='flex items-start gap-2.5 p-3 rounded-lg border bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-xs'>
        <ShieldAlert className='h-4 w-4 text-amber-600 shrink-0 mt-0.5' />
        <div>
          <p className='font-semibold text-amber-900 dark:text-amber-200'>
            {t('stockCounts.variance.abacTitle', 'Segregation of Duties Compliance (ABAC)')}
          </p>
          <p className='text-amber-800/80 dark:text-amber-300/80'>
            {t(
              'stockCounts.variance.abacDesc',
              'To ensure audit integrity, variances must be reviewed and approved by an authorized manager before reconciliation into the live stock ledger.'
            )}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-lg border bg-muted/20'>
        <div className='relative flex-1 max-w-xs'>
          <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
          <Input
            placeholder={t('stockCounts.variance.searchPlaceholder', 'Filter discrepancies...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-8 h-8 text-xs bg-background'
          />
        </div>

        <div className='flex items-center rounded-lg border bg-background p-0.5 text-[11px] overflow-x-auto'>
          <button
            type='button'
            onClick={() => setVarianceFilter('all')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              varianceFilter === 'all'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('common.all', 'All')} ({items.length})
          </button>
          <button
            type='button'
            onClick={() => setVarianceFilter('discrepancy')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              varianceFilter === 'discrepancy'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('stockCounts.variance.filterDiscrepancy', 'Discrepancies')} ({shrinkageCount + surplusCount})
          </button>
          <button
            type='button'
            onClick={() => setVarianceFilter('shrinkage')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              varianceFilter === 'shrinkage'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('stockCounts.variance.filterShrinkage', 'Shrinkage')} ({shrinkageCount})
          </button>
          <button
            type='button'
            onClick={() => setVarianceFilter('surplus')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              varianceFilter === 'surplus'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('stockCounts.variance.filterSurplus', 'Surplus')} ({surplusCount})
          </button>
          <button
            type='button'
            onClick={() => setVarianceFilter('match')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              varianceFilter === 'match'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('stockCounts.variance.filterMatches', 'Matches')} ({matchedCount})
          </button>
        </div>
      </div>

      {/* Variance Matrix Table */}
      <ScrollArea className='max-h-[48vh] rounded-xl border bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/40 hover:bg-muted/40'>
              <TableHead className='text-xs w-[130px]'>{t('stockCounts.variance.columns.sku', 'SKU')}</TableHead>
              <TableHead className='text-xs'>{t('stockCounts.variance.columns.productName', 'Product Name')}</TableHead>
              <TableHead className='text-xs text-end w-[90px]'>{t('stockCounts.variance.columns.expected', 'Expected')}</TableHead>
              <TableHead className='text-xs text-end w-[90px]'>{t('stockCounts.variance.columns.counted', 'Counted')}</TableHead>
              <TableHead className='text-xs text-end w-[100px]'>{t('stockCounts.variance.columns.variance', 'Variance (Δ)')}</TableHead>
              <TableHead className='text-xs text-end w-[100px]'>{t('stockCounts.variance.columns.value', 'Value Impact')}</TableHead>
              <TableHead className='text-xs text-center w-[110px]'>{t('stockCounts.variance.columns.varianceType', 'Status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className='h-24 text-center text-xs text-muted-foreground'>
                  <AlertTriangle className='h-5 w-5 mx-auto mb-1 text-muted-foreground/50' />
                  {t('stockCounts.variance.noItemsFound', 'No variance items match your filter.')}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const variance = item.variance
                const valImpact = item.varianceValue

                let badge = (
                  <Badge variant='outline' className='text-[10px] text-muted-foreground font-medium'>
                    {t('stockCounts.variance.types.exactMatch', 'Match')}
                  </Badge>
                )
                if (variance !== null && variance < 0) {
                  badge = (
                    <Badge variant='destructive' className='text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'>
                      {t('stockCounts.variance.types.shrinkage', 'Shrinkage')}
                    </Badge>
                  )
                } else if (variance !== null && variance > 0) {
                  badge = (
                    <Badge variant='secondary' className='text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'>
                      {t('stockCounts.variance.types.surplus', 'Surplus')}
                    </Badge>
                  )
                }

                return (
                  <TableRow key={item.id} className='text-xs'>
                    <TableCell className='font-mono font-semibold py-2'>
                      {item.product_variants?.sku ?? item.product_variant_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className='font-medium py-2'>
                      <div>{item.product_variants?.products?.name ?? item.product_variants?.name ?? '—'}</div>
                      {item.product_variants?.barcode && (
                        <div className='font-mono text-[10px] text-muted-foreground'>
                          {item.product_variants.barcode}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className='text-end tabular-nums text-muted-foreground py-2'>
                      {item.qty_snapshot}
                    </TableCell>
                    <TableCell className='text-end font-semibold tabular-nums py-2'>
                      {item.qty_counted ?? '—'}
                    </TableCell>
                    <TableCell
                      className={
                        variance !== null && variance < 0
                          ? 'text-end font-bold tabular-nums text-rose-600 py-2'
                          : variance !== null && variance > 0
                          ? 'text-end font-bold tabular-nums text-blue-600 py-2'
                          : 'text-end tabular-nums text-muted-foreground py-2'
                      }
                    >
                      {variance !== null ? `${variance > 0 ? '+' : ''}${variance}` : '—'}
                    </TableCell>
                    <TableCell
                      className={
                        valImpact < 0
                          ? 'text-end font-semibold tabular-nums text-rose-600 py-2'
                          : valImpact > 0
                          ? 'text-end font-semibold tabular-nums text-blue-600 py-2'
                          : 'text-end tabular-nums text-muted-foreground py-2'
                      }
                    >
                      {valImpact !== 0
                        ? `${valImpact > 0 ? '+' : ''}${valImpact.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'USD',
                          })}`
                        : '$0.00'}
                    </TableCell>
                    <TableCell className='text-center py-2'>{badge}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
