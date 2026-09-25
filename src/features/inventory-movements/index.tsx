import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search as HeaderSearch } from '@/components/search'
import { LanguageSwitch } from '@/components/language-switch'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { useWarehouseOptions, useStoreOptions } from '@/hooks/use-inventory-lookups'
import { useAuth } from '@/hooks/use-auth'
import type { MovementQueryParams, MovementRow } from './data/schema'
import { fetchMovements } from './data/actions'
import { useInventoryMovements } from './hooks/use-inventory-movements'
import { InventoryMovementsKpiRibbon } from './components/inventory-movements-kpi-ribbon'
import { InventoryMovementsToolbar } from './components/inventory-movements-toolbar'
import { InventoryMovementsTable } from './components/inventory-movements-table'
import { InventoryMovementsDrawer } from './components/inventory-movements-drawer'
import { downloadMovementsCsv } from './components/inventory-movements-export'

const ALL = '__all__'

export function InventoryMovements() {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const routeSearch = (useSearch({ strict: false }) ?? {}) as Record<string, unknown>
  const navigate = useNavigate()

  // Internal state fallback for testing or initial state
  const [localFilters, setLocalFilters] = useState<MovementQueryParams>({
    page: typeof routeSearch.page === 'number' ? routeSearch.page : 1,
    pageSize: typeof routeSearch.pageSize === 'number' ? routeSearch.pageSize : 20,
    search: typeof routeSearch.search === 'string' ? routeSearch.search : '',
    movementType: typeof routeSearch.movementType === 'string' ? routeSearch.movementType : '',
    locationId: typeof routeSearch.locationId === 'string' ? routeSearch.locationId : '',
    dateFrom: typeof routeSearch.dateFrom === 'string' ? routeSearch.dateFrom : '',
    dateTo: typeof routeSearch.dateTo === 'string' ? routeSearch.dateTo : '',
  })

  // Synchronized filter values prioritizing route search when available
  const page = Number(routeSearch.page ?? localFilters.page ?? 1)
  const pageSize = Number(routeSearch.pageSize ?? localFilters.pageSize ?? 20)
  const search = String(routeSearch.search ?? localFilters.search ?? '')
  const movementType = String(
    routeSearch.movementType ?? localFilters.movementType ?? ''
  )
  const locationId = String(
    routeSearch.locationId ?? localFilters.locationId ?? ''
  )
  const dateFrom = String(routeSearch.dateFrom ?? localFilters.dateFrom ?? '')
  const dateTo = String(routeSearch.dateTo ?? localFilters.dateTo ?? '')

  // State for slide-out audit drawer
  const [selectedMovement, setSelectedMovement] = useState<MovementRow | null>(
    null
  )
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Options for warehouses and stores
  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()

  const locationOptions = useMemo(
    () => [
      ...warehouses.map((w) => ({
        id: w.id,
        name: w.code ? `${w.name} (${w.code})` : w.name,
      })),
      ...stores.map((s) => ({
        id: s.store_id,
        name: s.name ? `${s.name} (Store)` : s.store_id,
      })),
    ],
    [warehouses, stores]
  )

  // Filter mutation handler with auto-reset to page 1 for filter changes
  const updateParams = useCallback(
    (newParams: Partial<MovementQueryParams>, resetPage = false) => {
      const merged = {
        page: resetPage ? 1 : (newParams.page ?? page),
        pageSize: newParams.pageSize ?? pageSize,
        search: newParams.search !== undefined ? newParams.search : search,
        movementType:
          newParams.movementType !== undefined
            ? newParams.movementType
            : movementType,
        locationId:
          newParams.locationId !== undefined
            ? newParams.locationId
            : locationId,
        dateFrom:
          newParams.dateFrom !== undefined ? newParams.dateFrom : dateFrom,
        dateTo: newParams.dateTo !== undefined ? newParams.dateTo : dateTo,
      }

      setLocalFilters(merged)

      navigate({
        search: (prev: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...prev, ...merged }
          // Remove empty keys to keep URL clean
          for (const key of Object.keys(next)) {
            if (
              next[key] === '' ||
              next[key] === undefined ||
              next[key] === null ||
              next[key] === ALL
            ) {
              delete next[key]
            }
          }
          if (next.page === 1) delete next.page
          if (next.pageSize === 20) delete next.pageSize
          return next
        },
        replace: true,
      }).catch(() => {})
    },
    [navigate, page, pageSize, search, movementType, locationId, dateFrom, dateTo]
  )

  // Query parameters passed to server API
  const queryFilters: MovementQueryParams = useMemo(() => {
    const isSelectedWarehouse = warehouses.some((w) => w.id === locationId)
    const isSelectedStore = stores.some((s) => s.store_id === locationId)

    return {
      page,
      pageSize,
      search: search || undefined,
      movementType: movementType && movementType !== ALL ? movementType : undefined,
      warehouseId: isSelectedWarehouse ? locationId : undefined,
      storeId: isSelectedStore ? locationId : undefined,
      locationId:
        !isSelectedWarehouse && !isSelectedStore && locationId && locationId !== ALL
          ? locationId
          : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy: 'movement_date',
      sortOrder: 'desc',
    }
  }, [page, pageSize, search, movementType, locationId, dateFrom, dateTo, warehouses, stores])

  // Data fetching hook
  const { data, isLoading, isFetching, error, refetch } =
    useInventoryMovements(queryFilters)

  // Row inspect action
  const handleInspectRow = useCallback((movement: MovementRow) => {
    setSelectedMovement(movement)
    setIsDrawerOpen(true)
  }, [])

  // CSV Export action
  const handleExportCsv = useCallback(async () => {
    try {
      setIsExporting(true)
      toast.info(t('inventoryMovements.filters.exporting', 'Exporting CSV...'))

      const exportResult = await fetchMovements(getToken, {
        ...queryFilters,
        export: 'csv',
        pageSize: 5000,
      })

      const rowsToExport = exportResult.movements.length
        ? exportResult.movements
        : data?.movements ?? []

      if (!rowsToExport.length) {
        toast.warning(t('inventoryMovements.empty.noMovements', 'No movements to export.'))
        return
      }

      downloadMovementsCsv(rowsToExport)
      toast.success(
        t(
          'inventoryMovements.filters.exportSuccess',
          'Export completed successfully'
        )
      )
    } catch {
      toast.error(
        t('inventoryMovements.filters.exportError', 'Failed to export movements')
      )
    } finally {
      setIsExporting(false)
    }
  }, [getToken, queryFilters, data?.movements, t])

  return (
    <>
      <Header fixed>
        <HeaderSearch />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Module Title & Description */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent'>
              {t('inventoryMovements.title', 'Inventory Movements')}
            </h2>
            <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
              {t(
                'inventoryMovements.description',
                'The immutable audit ledger of every stock transaction — purchases, sales, transfers, and adjustments.'
              )}
            </p>
          </div>
        </div>

        {/* Executive Summary KPI Ribbon */}
        <InventoryMovementsKpiRibbon
          summary={data?.summary}
          isLoading={isLoading}
        />

        {/* Faceted Filtering & Search Toolbar */}
        <InventoryMovementsToolbar
          search={search}
          onSearchChange={(val) => updateParams({ search: val }, true)}
          movementType={movementType}
          onMovementTypeChange={(val) =>
            updateParams({ movementType: val === ALL ? '' : val }, true)
          }
          locationId={locationId}
          onLocationIdChange={(val) =>
            updateParams({ locationId: val === ALL ? '' : val }, true)
          }
          dateFrom={dateFrom}
          onDateFromChange={(val) => updateParams({ dateFrom: val }, true)}
          dateTo={dateTo}
          onDateToChange={(val) => updateParams({ dateTo: val }, true)}
          onResetFilters={() =>
            updateParams(
              {
                search: '',
                movementType: '',
                locationId: '',
                dateFrom: '',
                dateTo: '',
              },
              true
            )
          }
          onExportCsv={handleExportCsv}
          isExporting={isExporting}
          locationOptions={locationOptions}
        />

        {/* Error State */}
        {error ? (
          <div className='flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive'>
            <AlertCircle className='h-8 w-8 mb-2' />
            <p className='font-semibold text-sm'>
              {t('inventoryMovements.error.loadFailed', 'Error loading movements.')}
            </p>
            <p className='text-xs text-muted-foreground mt-1'>
              {(error as Error)?.message || 'Please check your connection and permissions.'}
            </p>
            <button
              type='button'
              onClick={() => refetch()}
              className='mt-3 text-xs underline font-medium'
            >
              Retry
            </button>
          </div>
        ) : (
          /* Paginated Movements Table */
          <InventoryMovementsTable
            movements={data?.movements ?? []}
            totalCount={data?.totalCount ?? 0}
            page={page}
            pageSize={pageSize}
            totalPages={data?.totalPages ?? 1}
            isLoading={isLoading || isFetching}
            onPageChange={(newPage) => updateParams({ page: newPage })}
            onPageSizeChange={(newPageSize) =>
              updateParams({ pageSize: newPageSize }, true)
            }
            onRowClick={handleInspectRow}
          />
        )}

        {/* Slide-out Audit Inspection Sheet */}
        <InventoryMovementsDrawer
          movement={selectedMovement}
          open={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
        />
      </Main>
    </>
  )
}
export default InventoryMovements
