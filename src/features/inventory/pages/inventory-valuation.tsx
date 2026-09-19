import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  DollarSign,
  Boxes,
  PieChart as PieIcon,
  Building2,
  Download,
  RotateCcw,
  Calculator,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  FileJson,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { LanguageSwitch } from '@/components/language-switch'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import {
  useInventoryValuation,
  useValuationLookups,
  useDebounce,
} from '../hooks/use-inventory-valuation'
import { ValuationFilterBar } from '../components/valuation-filter-bar'
import { ValuationDetailSheet } from '../components/valuation-detail-sheet'
import type {
  ValuationFilters,
  ValuationItemRow,
  ValuationMethod,
} from '../data/valuation-schema'

export function InventoryValuationPage() {
  const { t } = useTranslation()

  // Local state for lazy search
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 350)

  // Primary filters
  const [filters, setFilters] = useState<ValuationFilters>({
    search: '',
    warehouseId: 'all',
    storeId: 'all',
    categoryId: 'all',
    supplierId: 'all',
    condition: 'all',
    stockStatus: 'all',
    valuationMethod: 'avco',
    page: 1,
    limit: 25,
    sortBy: 'totalValue',
    sortOrder: 'desc',
  })

  // Selected item for detail sheet
  const [selectedItem, setSelectedItem] = useState<ValuationItemRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Query lookups from real database tables
  const {
    warehouses,
    stores,
    categories,
    suppliers,
    isLoading: lookupsLoading,
  } = useValuationLookups()

  // Merged filters including debounced search
  const activeFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch]
  )

  // Fetch valuation data
  const {
    items,
    total,
    page,
    limit,
    totalPages,
    metrics,
    isLoading,
    isFetching,
    refetch,
  } = useInventoryValuation(activeFilters)

  // Handle filter changes
  const handleFilterChange = useCallback((updates: Partial<ValuationFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }))
  }, [])

  // Handle reset
  const handleResetFilters = useCallback(() => {
    setSearchInput('')
    setFilters({
      search: '',
      warehouseId: 'all',
      storeId: 'all',
      categoryId: 'all',
      supplierId: 'all',
      condition: 'all',
      stockStatus: 'all',
      valuationMethod: 'avco',
      page: 1,
      limit: 25,
      sortBy: 'totalValue',
      sortOrder: 'desc',
    })
  }, [])

  // Handle column sorting
  const handleSort = (column: ValuationFilters['sortBy']) => {
    if (!column) return
    if (filters.sortBy === column) {
      handleFilterChange({
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
        page: 1,
      })
    } else {
      handleFilterChange({
        sortBy: column,
        sortOrder: 'desc',
        page: 1,
      })
    }
  }

  // Export CSV
  const exportCSV = () => {
    if (!items.length) return
    const headers = [
      'Facility',
      'SKU',
      'Product Name',
      'Category',
      'Supplier',
      'Condition',
      'On-Hand Qty',
      'Unit Cost',
      'Selling Price',
      'Total Valuation',
      'Potential Revenue',
      'Margin %',
      'Share %',
    ]

    const rows = items.map((r) => [
      `"${r.warehouseName || r.storeName || 'Default'}"`,
      `"${r.sku}"`,
      `"${r.productName.replace(/"/g, '""')}"`,
      `"${r.categoryName}"`,
      `"${r.supplierName || '—'}"`,
      `"${r.condition}"`,
      r.onHand,
      r.unitCost.toFixed(2),
      r.sellingPrice.toFixed(2),
      r.totalValue.toFixed(2),
      r.potentialRevenue.toFixed(2),
      r.potentialMargin.toFixed(1),
      r.sharePercent.toFixed(2),
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `inventory_valuation_${filters.valuationMethod}_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export JSON
  const exportJSON = () => {
    if (!items.length) return
    const exportData = {
      method: filters.valuationMethod,
      generatedAt: new Date().toISOString(),
      summary: metrics,
      items,
    }
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute(
      'download',
      `inventory_valuation_${filters.valuationMethod}_${new Date().toISOString().slice(0, 10)}.json`
    )
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const currentMethod = filters.valuationMethod || 'avco'

  return (
    <>
      {/* Top Fixed Header */}
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* Main Container */}
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6 max-w-7xl mx-auto w-full'>
        {/* Page Hero & Header Actions */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl font-extrabold tracking-tight sm:text-3xl flex items-center gap-2.5'>
                <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
                  <DollarSign className='h-5 w-5' />
                </div>
                {t('inventory.valuationPage.title', 'Inventory Asset Valuation Report')}
              </h1>
              <Badge
                variant='outline'
                className='hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 border-emerald-300 dark:border-emerald-800'
              >
                <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
                {t('inventory.valuationPage.liveSynchronized', 'Live Ledger Synchronized')}
              </Badge>
            </div>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
              {t(
                'inventory.valuationPage.description',
                'Financial valuation of on-hand inventory across all facilities, categories, and costing methods.'
              )}
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className='flex items-center gap-2 flex-wrap'>
            {/* Valuation Method Selector */}
            <div className='flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border shadow-2xs'>
              <Calculator className='h-4 w-4 text-muted-foreground ml-1.5 shrink-0' />
              <Select
                value={currentMethod}
                onValueChange={(val: ValuationMethod) =>
                  handleFilterChange({ valuationMethod: val, page: 1 })
                }
              >
                <SelectTrigger className='h-8 text-xs font-semibold border-0 bg-transparent shadow-none w-[175px]'>
                  <SelectValue placeholder={t('inventory.valuationPage.method', 'Valuation Method')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='avco'>{t('inventory.valuationPage.avco', 'Weighted Average (AVCO)')}</SelectItem>
                  <SelectItem value='standard'>{t('inventory.valuationPage.standard', 'Standard Cost')}</SelectItem>
                  <SelectItem value='fifo'>{t('inventory.valuationPage.fifo', 'FIFO Estimated')}</SelectItem>
                  <SelectItem value='retail'>{t('inventory.valuationPage.retail', 'Retail Realization')}</SelectItem>
                </SelectContent>
              </Select>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      className='p-1 text-muted-foreground hover:text-foreground rounded-sm'
                    >
                      <Info className='h-3.5 w-3.5' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side='bottom' className='max-w-xs text-xs'>
                    {t(
                      'inventory.valuationPage.methodTooltip',
                      'Switch financial costing method: AVCO evaluates weighted average purchase costs, Standard uses catalog baseline costs, FIFO assumes first-in stock valuation, and Retail reflects potential sales value.'
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Refresh Button */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isFetching}
              className='h-9 text-xs gap-1.5'
              title={t('inventory.valuationPage.refresh', 'Refresh Live Valuation')}
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span className='hidden sm:inline'>{t('inventory.valuationPage.refresh', 'Refresh')}</span>
            </Button>

            {/* Export CSV */}
            <Button
              variant='outline'
              size='sm'
              onClick={exportCSV}
              disabled={!items.length}
              className='h-9 text-xs gap-1.5'
            >
              <Download className='h-3.5 w-3.5' />
              <span>{t('inventory.valuationPage.exportCsv', 'Export CSV')}</span>
            </Button>

            {/* Export JSON */}
            <Button
              variant='outline'
              size='sm'
              onClick={exportJSON}
              disabled={!items.length}
              className='h-9 text-xs gap-1.5'
            >
              <FileJson className='h-3.5 w-3.5' />
              <span className='hidden md:inline'>{t('inventory.valuationPage.exportJson', 'JSON')}</span>
            </Button>
          </div>
        </div>

        {/* Executive KPI Metric Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* Total Asset Valuation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className='shadow-xs bg-emerald-50/25 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/60 overflow-hidden relative'>
              <CardContent className='p-4 flex items-center justify-between'>
                <div className='space-y-1'>
                  <p className='text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider'>
                    {t('inventory.valuationPage.totalValuation', 'Total Asset Value')}
                  </p>
                  <p className='text-2xl font-extrabold text-emerald-700 dark:text-emerald-400'>
                    ${metrics.totalValuation.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                    <Badge variant='secondary' className='text-[10px] px-1 py-0 font-bold'>
                      {currentMethod.toUpperCase()}
                    </Badge>
                    <span>
                      {t('inventory.valuationPage.basedOnMethod', {
                        method: currentMethod.toUpperCase(),
                        defaultValue: `Based on ${currentMethod.toUpperCase()} method`,
                      })}
                    </span>
                  </div>
                </div>
                <div className='p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
                  <DollarSign className='h-6 w-6' />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Stock Units */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Card className='shadow-xs overflow-hidden'>
              <CardContent className='p-4 flex items-center justify-between'>
                <div className='space-y-1'>
                  <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    {t('inventory.valuationPage.totalUnits', 'Total Stock Units')}
                  </p>
                  <p className='text-2xl font-extrabold text-foreground'>
                    {metrics.totalUnits.toLocaleString()}
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    {t('inventory.valuationPage.stockLines', {
                      count: metrics.totalLines,
                      defaultValue: `${metrics.totalLines} Stock lines`,
                    })}
                  </p>
                </div>
                <div className='p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400'>
                  <Boxes className='h-6 w-6' />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Potential Sales Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className='shadow-xs overflow-hidden'>
              <CardContent className='p-4 flex items-center justify-between'>
                <div className='space-y-1'>
                  <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    {t('inventory.valuationPage.potentialRevenue', 'Potential Sales Revenue')}
                  </p>
                  <p className='text-2xl font-extrabold text-foreground'>
                    ${metrics.totalPotentialRevenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    {t('inventory.valuationPage.grossRetail', 'Gross retail realization')}
                  </p>
                </div>
                <div className='p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400'>
                  <PieIcon className='h-6 w-6' />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Projected Gross Margin */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card className='shadow-xs overflow-hidden'>
              <CardContent className='p-4 flex items-center justify-between'>
                <div className='space-y-1'>
                  <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    {t('inventory.valuationPage.potentialMargin', 'Estimated Margin')}
                  </p>
                  <p className='text-2xl font-extrabold text-foreground'>
                    {metrics.averageMargin.toFixed(1)}%
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    {metrics.lowStockCount > 0
                      ? `${metrics.lowStockCount} items near reorder level`
                      : t('inventory.valuationPage.retailMarkup', 'Retail markup margin')}
                  </p>
                </div>
                <div className='p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400'>
                  <Building2 className='h-6 w-6' />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Multi-Table Filter Bar */}
        <ValuationFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          lookups={{
            warehouses,
            stores,
            categories,
            suppliers,
          }}
          isSearching={isFetching}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
        />

        {/* Valuation Table Card */}
        <Card className='shadow-xs'>
          <CardHeader className='pb-3 flex flex-row items-center justify-between'>
            <div>
              <CardTitle className='text-base font-bold'>
                {t('inventory.valuationPage.breakdown', 'Inventory Valuation Breakdown')}
              </CardTitle>
              <CardDescription className='text-xs'>
                {t(
                  'inventory.valuationPage.breakdownDesc',
                  'Detailed unit costs and total valuation by SKU and location with multi-table filters.'
                )}
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Badge variant='secondary' className='text-xs font-bold'>
                {t('inventory.valuationPage.itemsListed', {
                  count: total,
                  defaultValue: `${total} Items Listed`,
                })}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className='space-y-3 py-6'>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className='h-12 w-full rounded-md' />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className='p-12 text-center text-sm text-muted-foreground border rounded-lg bg-muted/10 space-y-2'>
                <p className='font-semibold text-foreground'>
                  {t('inventory.valuationPage.noRecords', 'No inventory valuation records match the selected filters.')}
                </p>
                <Button variant='outline' size='sm' onClick={handleResetFilters} className='text-xs mt-2'>
                  <RotateCcw className='mr-1.5 h-3.5 w-3.5' />
                  {t('common.reset', 'Reset Filters')}
                </Button>
              </div>
            ) : (
              <div className='overflow-x-auto rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/40'>
                      <TableHead className='text-xs font-semibold'>
                        {t('inventory.valuationPage.facility', 'Store / Warehouse')}
                      </TableHead>

                      <TableHead
                        className='text-xs font-semibold cursor-pointer select-none hover:text-foreground'
                        onClick={() => handleSort('sku')}
                      >
                        <div className='flex items-center gap-1'>
                          {t('inventory.valuationPage.sku', 'SKU')}
                          {filters.sortBy === 'sku' ? (
                            filters.sortOrder === 'asc' ? <ArrowUp className='h-3 w-3' /> : <ArrowDown className='h-3 w-3' />
                          ) : (
                            <ArrowUpDown className='h-3 w-3 opacity-40' />
                          )}
                        </div>
                      </TableHead>

                      <TableHead
                        className='text-xs font-semibold cursor-pointer select-none hover:text-foreground'
                        onClick={() => handleSort('productName')}
                      >
                        <div className='flex items-center gap-1'>
                          {t('inventory.valuationPage.product', 'Product Name')}
                          {filters.sortBy === 'productName' ? (
                            filters.sortOrder === 'asc' ? <ArrowUp className='h-3 w-3' /> : <ArrowDown className='h-3 w-3' />
                          ) : (
                            <ArrowUpDown className='h-3 w-3 opacity-40' />
                          )}
                        </div>
                      </TableHead>

                      <TableHead className='text-xs font-semibold'>
                        {t('inventory.valuationPage.category', 'Category')}
                      </TableHead>

                      <TableHead
                        className='text-xs font-semibold text-end cursor-pointer select-none hover:text-foreground'
                        onClick={() => handleSort('onHand')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          {t('inventory.valuationPage.onHand', 'On-Hand Qty')}
                          {filters.sortBy === 'onHand' ? (
                            filters.sortOrder === 'asc' ? <ArrowUp className='h-3 w-3' /> : <ArrowDown className='h-3 w-3' />
                          ) : (
                            <ArrowUpDown className='h-3 w-3 opacity-40' />
                          )}
                        </div>
                      </TableHead>

                      <TableHead
                        className='text-xs font-semibold text-end cursor-pointer select-none hover:text-foreground'
                        onClick={() => handleSort('unitCost')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          {t('inventory.valuationPage.cost', 'Unit Cost')}
                          {filters.sortBy === 'unitCost' ? (
                            filters.sortOrder === 'asc' ? <ArrowUp className='h-3 w-3' /> : <ArrowDown className='h-3 w-3' />
                          ) : (
                            <ArrowUpDown className='h-3 w-3 opacity-40' />
                          )}
                        </div>
                      </TableHead>

                      <TableHead
                        className='text-xs font-semibold text-end cursor-pointer select-none hover:text-foreground'
                        onClick={() => handleSort('totalValue')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          {t('inventory.valuationPage.totalCost', 'Total Valuation')}
                          {filters.sortBy === 'totalValue' ? (
                            filters.sortOrder === 'asc' ? <ArrowUp className='h-3 w-3' /> : <ArrowDown className='h-3 w-3' />
                          ) : (
                            <ArrowUpDown className='h-3 w-3 opacity-40' />
                          )}
                        </div>
                      </TableHead>

                      <TableHead
                        className='text-xs font-semibold text-end cursor-pointer select-none hover:text-foreground'
                        onClick={() => handleSort('potentialRevenue')}
                      >
                        <div className='flex items-center justify-end gap-1'>
                          {t('inventory.valuationPage.potentialRevenue', 'Revenue / Margin')}
                          {filters.sortBy === 'potentialRevenue' ? (
                            filters.sortOrder === 'asc' ? <ArrowUp className='h-3 w-3' /> : <ArrowDown className='h-3 w-3' />
                          ) : (
                            <ArrowUpDown className='h-3 w-3 opacity-40' />
                          )}
                        </div>
                      </TableHead>

                      <TableHead className='text-xs font-semibold text-end w-28'>
                        {t('inventory.valuationPage.share', '% Share')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {items.map((row) => (
                      <TableRow
                        key={row.id}
                        onClick={() => {
                          setSelectedItem(row)
                          setDetailOpen(true)
                        }}
                        className='text-xs hover:bg-muted/40 cursor-pointer transition-colors'
                      >
                        <TableCell className='font-medium'>
                          <div className='flex flex-col'>
                            <span>{row.warehouseName || row.storeName || 'Default'}</span>
                            {row.warehouseCode && (
                              <span className='text-[10px] text-muted-foreground font-mono'>
                                [{row.warehouseCode}]
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className='font-mono font-semibold text-foreground'>
                          <div className='flex items-center gap-1.5'>
                            <span>{row.sku}</span>
                            {row.condition && row.condition !== 'good' && (
                              <Badge variant='outline' className='text-[9px] px-1 py-0 uppercase'>
                                {row.condition}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className='font-medium text-foreground max-w-[200px] truncate'>
                            {row.productName}
                          </div>
                          {row.supplierName && (
                            <div className='text-[10px] text-muted-foreground truncate'>
                              {row.supplierName}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge variant='secondary' className='text-[10px] font-normal'>
                            {row.categoryName}
                          </Badge>
                        </TableCell>

                        <TableCell className='text-end font-bold tabular-nums'>
                          <div>{row.onHand.toLocaleString()}</div>
                          {row.reserved > 0 && (
                            <div className='text-[10px] text-muted-foreground font-normal'>
                              {row.reserved} res.
                            </div>
                          )}
                        </TableCell>

                        <TableCell className='text-end text-muted-foreground tabular-nums'>
                          ${row.unitCost.toFixed(2)}
                        </TableCell>

                        <TableCell className='text-end font-extrabold text-foreground tabular-nums text-sm'>
                          ${row.totalValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>

                        <TableCell className='text-end tabular-nums'>
                          <div>
                            ${row.potentialRevenue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div
                            className={`text-[10px] font-semibold ${
                              row.potentialMargin >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                            }`}
                          >
                            {row.potentialMargin.toFixed(1)}%
                          </div>
                        </TableCell>

                        <TableCell className='text-end tabular-nums'>
                          <div className='flex items-center justify-end gap-2'>
                            <span className='text-[11px] font-medium text-muted-foreground'>
                              {row.sharePercent.toFixed(1)}%
                            </span>
                            <div className='w-12'>
                              <Progress value={Math.min(100, row.sharePercent * 3)} className='h-1.5' />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && total > 0 && (
              <div className='flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground'>
                <div className='flex items-center gap-2'>
                  <span>{t('inventory.valuationPage.rowsPerPage', 'Rows per page')}:</span>
                  <Select
                    value={String(limit)}
                    onValueChange={(val) => handleFilterChange({ limit: Number(val), page: 1 })}
                  >
                    <SelectTrigger className='h-8 w-16 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='10'>10</SelectItem>
                      <SelectItem value='25'>25</SelectItem>
                      <SelectItem value='50'>50</SelectItem>
                      <SelectItem value='100'>100</SelectItem>
                    </SelectContent>
                  </Select>

                  <span className='ml-2'>
                    {t('inventory.valuationPage.itemsTotal', {
                      from: (page - 1) * limit + 1,
                      to: Math.min(page * limit, total),
                      total,
                      defaultValue: `Showing ${(page - 1) * limit + 1} to ${Math.min(
                        page * limit,
                        total
                      )} of ${total} positions`,
                    })}
                  </span>
                </div>

                <div className='flex items-center gap-1'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => handleFilterChange({ page: 1 })}
                    disabled={page <= 1}
                    title='First page'
                  >
                    <ChevronsLeft className='h-4 w-4' />
                  </Button>

                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => handleFilterChange({ page: page - 1 })}
                    disabled={page <= 1}
                    title='Previous page'
                  >
                    <ChevronLeft className='h-4 w-4' />
                  </Button>

                  <span className='px-2.5 text-xs font-medium text-foreground'>
                    {t('inventory.valuationPage.pageOf', {
                      current: page,
                      total: totalPages,
                      defaultValue: `Page ${page} of ${totalPages}`,
                    })}
                  </span>

                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => handleFilterChange({ page: page + 1 })}
                    disabled={page >= totalPages}
                    title='Next page'
                  >
                    <ChevronRight className='h-4 w-4' />
                  </Button>

                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => handleFilterChange({ page: totalPages })}
                    disabled={page >= totalPages}
                    title='Last page'
                  >
                    <ChevronsRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>

      {/* Slide-over Detail Sheet */}
      <ValuationDetailSheet
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
