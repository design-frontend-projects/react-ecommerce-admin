import { useState } from 'react'
import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react'
import { useStoreOptions } from '@/hooks/use-inventory-lookups'
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
  const [storeId, setStoreId] = useState(ALL)
  const { data: stores = [] } = useStoreOptions()
  const {
    data: rows,
    isLoading,
    error,
  } = useStockByLocation({
    storeId: storeId === ALL ? undefined : storeId,
  })
  const { data: report } = useReconcileReport()

  const violationCount = report
    ? report.balance_vs_location.length +
      report.variant_cache.length +
      report.qty_available.length +
      report.serial_counts.length
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
            <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>
              Stock by Location
            </h2>
            <p className='text-muted-foreground'>
              Bin-level stock detail. Location totals always reconcile to the
              store balances maintained by the movement engine.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            {report ? (
              report.clean ? (
                <Badge variant='default' className='gap-1'>
                  <CheckCircle2 className='h-3.5 w-3.5' />
                  Reconciled
                </Badge>
              ) : (
                <Badge variant='destructive' className='gap-1'>
                  <TriangleAlert className='h-3.5 w-3.5' />
                  Drift detected ({violationCount})
                </Badge>
              )
            ) : null}
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger className='w-48'>
                <SelectValue placeholder='All stores' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All stores</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.store_id} value={store.store_id}>
                    {store.name ?? store.store_id}
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
            <p className='font-medium'>Error loading location stock.</p>
          </div>
        ) : (
          <StockByLocationTable data={rows ?? []} />
        )}
      </Main>
    </>
  )
}
