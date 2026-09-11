import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react'
import { useWarehouseOptions, useStoreOptions } from '@/hooks/use-inventory-lookups'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { StockByLocationTable } from './components/table'
import {
  useReconcileReport,
  useStockByLocation,
} from './hooks/use-stock-by-location'

const ALL = '__all__'

export function StockByLocation() {
  const { t } = useTranslation()
  const [warehouseId, setWarehouseId] = useState(ALL)
  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()

  const locationOptions =
    warehouses.length > 0
      ? warehouses.map((w) => ({ id: w.id, name: `${w.name} (${w.code})` }))
      : stores.map((s) => ({ id: s.store_id, name: s.name ?? s.store_id }))

  const {
    data: rows,
    isLoading,
    error,
  } = useStockByLocation({
    warehouseId: warehouseId === ALL ? undefined : warehouseId,
    storeId: warehouseId === ALL ? undefined : warehouseId,
  })
  const { data: report } = useReconcileReport()

  const violationCount = report
    ? (report.balance_vs_location?.length ?? 0) +
      (report.variant_cache?.length ?? 0) +
      (report.qty_available?.length ?? 0) +
      (report.serial_counts?.length ?? 0)
    : 0

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>{t('stockByLocation.title')}</h2>
            <p className='text-muted-foreground'>
              {t(
                'stockByLocation.description',
                'Bin-level stock detail. Location totals always reconcile to the warehouse balances maintained by the movement engine.'
              )}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            {report ? (
              report.clean ? (
                <Badge variant='default' className='gap-1'>
                  <CheckCircle2 className='h-3.5 w-3.5' />
                  {t('stockByLocation.status.reconciled', 'Reconciled')}
                </Badge>
              ) : (
                <Badge variant='destructive' className='gap-1'>
                  <TriangleAlert className='h-3.5 w-3.5' />
                  {t('stockByLocation.status.driftDetected', 'Drift detected ({{count}})', {
                    count: violationCount,
                  })}
                </Badge>
              )
            ) : null}
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className='w-56'>
                <SelectValue placeholder={t('stockByLocation.allLocations', 'All locations')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('stockByLocation.allWarehousesStores', 'All warehouses / stores')}</SelectItem>
                {locationOptions.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-500'>
            <p className='font-medium'>{t('stockByLocation.errorLoading', 'Error loading location stock.')}</p>
          </div>
        ) : (
          <StockByLocationTable data={rows ?? []} />
        )}
      </Main>
    </>
  )
}

