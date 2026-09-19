import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Barcode,
  Search,
  CheckCircle2,
  RefreshCw,
  Clock,
  AlertCircle,
  Copy,
  Sparkles,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CountItemRow } from '../data/schema'

interface CountSheetProps {
  items: CountItemRow[]
  isBlind?: boolean
  isCounting: boolean
  entries: Record<string, string>
  onEntryChange: (itemId: string, value: string) => void
  onSave: () => void
  isSaving: boolean
}

type SheetFilter = 'all' | 'pending' | 'counted' | 'discrepancy'

export function CountSheet({
  items,
  isBlind = false,
  isCounting,
  entries,
  onEntryChange,
  onSave,
  isSaving,
}: CountSheetProps) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [filterMode, setFilterMode] = useState<SheetFilter>('all')
  const [lastScannedSku, setLastScannedSku] = useState<string | null>(null)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // Quick scan handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = barcodeInput.trim().toLowerCase()
    if (!trimmed) return

    const matched = items.find((it) => {
      const sku = (it.product_variants?.sku || '').toLowerCase()
      const barcode = (it.product_variants?.barcode || '').toLowerCase()
      return sku === trimmed || barcode === trimmed
    })

    if (matched) {
      const currentVal = Number(
        entries[matched.id] ?? (matched.qty_counted !== null ? matched.qty_counted : 0)
      )
      onEntryChange(matched.id, String(currentVal + 1))
      setLastScannedSku(matched.product_variants?.sku || matched.id)
      setBarcodeInput('')

      // Focus the matched input
      const inputEl = inputRefs.current.get(matched.id)
      if (inputEl) {
        inputEl.focus()
        inputEl.select()
      }
    } else {
      setLastScannedSku(null)
    }
  }

  // Handle Enter key navigation across table rows
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentIndex: number,
    filteredList: CountItemRow[]
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const nextItem = filteredList[currentIndex + 1]
      if (nextItem) {
        const nextInput = inputRefs.current.get(nextItem.id)
        if (nextInput) {
          nextInput.focus()
          nextInput.select()
        }
      }
    }
  }

  // Quick fill remaining pending items to 0
  const handleFillPendingToZero = () => {
    for (const it of items) {
      const currentVal = entries[it.id] ?? (it.qty_counted !== null ? String(it.qty_counted) : '')
      if (currentVal === '') {
        onEntryChange(it.id, '0')
      }
    }
  }

  // Quick copy snapshot to counted (only when not blind)
  const handleCopyExpected = () => {
    for (const it of items) {
      const currentVal = entries[it.id] ?? (it.qty_counted !== null ? String(it.qty_counted) : '')
      if (currentVal === '') {
        onEntryChange(it.id, String(it.qty_snapshot))
      }
    }
  }

  const totalCountedLines = items.filter(
    (it) => entries[it.id] !== undefined || it.qty_counted !== null
  ).length
  const progressPercent = items.length > 0 ? Math.round((totalCountedLines / items.length) * 100) : 0

  const filteredItems = items.filter((it) => {
    const sku = it.product_variants?.sku || it.product_variant_id
    const name = it.product_variants?.products?.name || ''
    const barcode = it.product_variants?.barcode || ''
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      sku.toLowerCase().includes(term) ||
      name.toLowerCase().includes(term) ||
      barcode.toLowerCase().includes(term)

    if (!matchesSearch) return false

    const val = entries[it.id] ?? (it.qty_counted !== null ? String(it.qty_counted) : '')
    const isCounted = val !== ''

    if (filterMode === 'pending') return !isCounted
    if (filterMode === 'counted') return isCounted
    if (filterMode === 'discrepancy' && !isBlind) {
      if (!isCounted) return false
      return Number(val) !== Number(it.qty_snapshot)
    }

    return true
  })

  return (
    <div className='space-y-3.5'>
      {/* Top Controls & Scanner Bar */}
      <div className='rounded-xl border bg-muted/20 p-3 space-y-3'>
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5'>
          {/* Barcode Quick Scan */}
          {isCounting && (
            <form onSubmit={handleBarcodeSubmit} className='relative flex-1 max-w-sm'>
              <Barcode className='absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder={t('stockCounts.sheet.scanBarcode', 'Scan barcode / SKU & press Enter...')}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className='pl-8 h-9 text-xs font-mono bg-background'
              />
            </form>
          )}

          {/* Search Filter */}
          <div className='relative flex-1 max-w-xs'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
            <Input
              placeholder={t('stockCounts.sheet.filterItems', 'Search SKU, name, barcode...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-8 h-9 text-xs bg-background'
            />
          </div>

          {/* Save & Progress actions */}
          <div className='flex items-center gap-2 ml-auto'>
            {isCounting && (
              <Button
                size='sm'
                onClick={onSave}
                disabled={isSaving}
                className='h-9 text-xs bg-primary px-3 shadow-xs'
              >
                {isSaving ? (
                  <RefreshCw className='h-3.5 w-3.5 animate-spin mr-1.5' />
                ) : (
                  <CheckCircle2 className='h-3.5 w-3.5 mr-1.5' />
                )}
                {t('stockCounts.sheet.saveProgress', 'Save Progress')}
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar and fast filter pills */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-muted'>
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-1 text-xs'>
              <span className='text-muted-foreground font-medium'>
                {t('stockCounts.sheet.progress', 'Progress:')}
              </span>
              <strong className='font-bold text-foreground'>
                {totalCountedLines} / {items.length}
              </strong>
              <span className='text-[11px] text-muted-foreground'>
                ({progressPercent}%)
              </span>
            </div>

            {/* Micro progress bar */}
            <div className='h-1.5 w-24 bg-muted rounded-full overflow-hidden'>
              <div
                className='h-full bg-primary transition-all duration-300'
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {lastScannedSku && (
              <Badge variant='outline' className='text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/5 animate-pulse'>
                +1 {lastScannedSku}
              </Badge>
            )}
          </div>

          {/* Quick filter chips & quick fills */}
          <div className='flex flex-wrap items-center gap-1.5'>
            <div className='flex items-center rounded-lg border bg-background p-0.5 text-[11px]'>
              <button
                type='button'
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('common.all', 'All')} ({items.length})
              </button>
              <button
                type='button'
                onClick={() => setFilterMode('pending')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  filterMode === 'pending'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('stockCounts.sheet.pending', 'Pending')} ({items.length - totalCountedLines})
              </button>
              <button
                type='button'
                onClick={() => setFilterMode('counted')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  filterMode === 'counted'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('stockCounts.sheet.counted', 'Counted')} ({totalCountedLines})
              </button>
              {!isBlind && (
                <button
                  type='button'
                  onClick={() => setFilterMode('discrepancy')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    filterMode === 'discrepancy'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('stockCounts.sheet.discrepancy', 'Discrepancy')}
                </button>
              )}
            </div>

            {isCounting && (
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={handleFillPendingToZero}
                  className='h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground'
                  title={t('stockCounts.sheet.fillZeroHelp', 'Set uncounted items to 0')}
                >
                  <Sparkles className='h-3 w-3 mr-1' />
                  {t('stockCounts.sheet.fillZero', 'Set rest to 0')}
                </Button>
                {!isBlind && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={handleCopyExpected}
                    className='h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground'
                    title={t('stockCounts.sheet.copyExpectedHelp', 'Copy expected quantities')}
                  >
                    <Copy className='h-3 w-3 mr-1' />
                    {t('stockCounts.sheet.copyExpected', 'Copy expected')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Sheet */}
      <ScrollArea className='max-h-[52vh] rounded-xl border bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/40 hover:bg-muted/40'>
              <TableHead className='text-xs w-[140px]'>{t('stockCounts.sheet.columns.sku', 'SKU / Barcode')}</TableHead>
              <TableHead className='text-xs'>{t('stockCounts.sheet.columns.productName', 'Product Details')}</TableHead>
              {items.some((i) => i.warehouse_locations) && (
                <TableHead className='text-xs'>{t('stockCounts.sheet.columns.location', 'Location')}</TableHead>
              )}
              {!isBlind && (
                <TableHead className='text-xs text-end w-[100px]'>
                  {t('stockCounts.sheet.columns.expected', 'Expected')}
                </TableHead>
              )}
              <TableHead className='text-xs text-end w-[130px]'>
                {t('stockCounts.sheet.columns.countedQty', 'Counted Qty')}
              </TableHead>
              <TableHead className='text-xs text-center w-[100px]'>
                {t('stockCounts.sheet.columns.status', 'Status')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={items.some((i) => i.warehouse_locations) ? 6 : 5}
                  className='h-28 text-center text-xs text-muted-foreground'
                >
                  <AlertCircle className='h-5 w-5 mx-auto mb-1 text-muted-foreground/50' />
                  {t('stockCounts.sheet.noItemsFound', 'No items match your filter.')}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item, index) => {
                const currentVal =
                  entries[item.id] ??
                  (item.qty_counted !== null ? String(item.qty_counted) : '')
                const isEntered = currentVal !== ''
                const variance =
                  isEntered && !isBlind ? Number(currentVal) - Number(item.qty_snapshot) : null

                return (
                  <TableRow
                    key={item.id}
                    className={`text-xs transition-colors ${
                      variance !== null && variance !== 0
                        ? 'bg-amber-50/20 dark:bg-amber-950/10'
                        : ''
                    }`}
                  >
                    {/* SKU & Barcode */}
                    <TableCell className='py-2'>
                      <div className='font-mono font-semibold text-foreground text-xs'>
                        {item.product_variants?.sku ?? item.product_variant_id.slice(0, 8)}
                      </div>
                      {item.product_variants?.barcode && (
                        <div className='font-mono text-[10px] text-muted-foreground'>
                          {item.product_variants.barcode}
                        </div>
                      )}
                    </TableCell>

                    {/* Product Name */}
                    <TableCell className='py-2'>
                      <div className='font-medium text-foreground text-xs'>
                        {item.product_variants?.products?.name ?? item.product_variants?.name ?? '—'}
                      </div>
                      {item.product_variants?.name && item.product_variants.products?.name && (
                        <div className='text-[10px] text-muted-foreground'>
                          {item.product_variants.name}
                        </div>
                      )}
                    </TableCell>

                    {/* Location */}
                    {items.some((i) => i.warehouse_locations) && (
                      <TableCell className='py-2 text-[11px] text-muted-foreground font-mono'>
                        {item.warehouse_locations?.code ?? '—'}
                      </TableCell>
                    )}

                    {/* Expected Snapshot */}
                    {!isBlind && (
                      <TableCell className='py-2 text-end font-semibold tabular-nums text-muted-foreground text-xs'>
                        {item.qty_snapshot}
                      </TableCell>
                    )}

                    {/* Counted Quantity Input */}
                    <TableCell className='py-1.5 text-end'>
                      {isCounting ? (
                        <div className='flex items-center justify-end gap-1'>
                          <Input
                            ref={(el) => {
                              if (el) inputRefs.current.set(item.id, el)
                              else inputRefs.current.delete(item.id)
                            }}
                            type='number'
                            step='any'
                            min='0'
                            value={currentVal}
                            onChange={(e) => onEntryChange(item.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, filteredItems)}
                            className='h-8 w-24 text-end font-bold text-xs bg-background focus:ring-1 focus:ring-primary'
                            placeholder='0'
                          />
                        </div>
                      ) : (
                        <span className='font-bold tabular-nums text-xs'>
                          {item.qty_counted ?? '—'}
                        </span>
                      )}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className='py-2 text-center'>
                      {isEntered ? (
                        <span className='inline-flex items-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400'>
                          <CheckCircle2 className='h-3.5 w-3.5 mr-1' />
                          {t('stockCounts.sheet.status.counted', 'Counted')}
                        </span>
                      ) : (
                        <span className='inline-flex items-center text-[11px] text-amber-600 dark:text-amber-400 font-medium'>
                          <Clock className='h-3 w-3 mr-1' />
                          {t('stockCounts.sheet.status.pending', 'Pending')}
                        </span>
                      )}
                    </TableCell>
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
