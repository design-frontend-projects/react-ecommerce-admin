import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useStoreOptions } from '@/hooks/use-inventory-lookups'
import { useInventoryMovements } from './hooks/use-inventory-movements'
import type { MovementFilters } from './data/schema'

const MOVEMENT_TYPES = [
  'opening_stock',
  'sale',
  'sale_return',
  'purchase',
  'purchase_return',
  'transfer_in',
  'transfer_out',
  'adjustment_in',
  'adjustment_out',
  'damage',
  'expired',
  'reserved',
  'released',
]

const ALL = '__all__'

export function InventoryMovements() {
  const [movementType, setMovementType] = useState<string>(ALL)
  const [storeId, setStoreId] = useState<string>(ALL)

  const filters: MovementFilters = {
    movementType: movementType === ALL ? undefined : movementType,
    storeId: storeId === ALL ? undefined : storeId,
  }
  const { data: movements, isLoading, error } = useInventoryMovements(filters)
  const { data: stores = [] } = useStoreOptions()

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
        <div>
          <h2 className='bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>
            Inventory Movements
          </h2>
          <p className='text-muted-foreground'>
            The complete audit trail of every stock change — sales, purchases,
            transfers, and adjustments.
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Select value={movementType} onValueChange={setMovementType}>
            <SelectTrigger className='w-52'>
              <SelectValue placeholder='All movement types' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All movement types</SelectItem>
              {MOVEMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type} className='capitalize'>
                  {type.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className='w-52'>
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

        {isLoading ? (
          <div className='flex min-h-[400px] flex-1 items-center justify-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-500'>
            <p className='font-medium'>Error loading movements.</p>
          </div>
        ) : (
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead className='text-end'>In</TableHead>
                  <TableHead className='text-end'>Out</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements?.length ? (
                  movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className='whitespace-nowrap'>
                        {new Date(movement.movement_date).toLocaleString(
                          undefined,
                          { dateStyle: 'medium', timeStyle: 'short' }
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className='capitalize'>
                          {movement.movement_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {movement.product_variants?.sku ??
                          movement.product_variant_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{movement.stores?.name ?? '—'}</TableCell>
                      <TableCell className='text-end text-emerald-600'>
                        {movement.qty_in > 0 ? movement.qty_in : ''}
                      </TableCell>
                      <TableCell className='text-end text-rose-600'>
                        {movement.qty_out > 0 ? movement.qty_out : ''}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {movement.reference_type
                          ? movement.reference_type.replace('_', ' ')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className='h-24 text-center'>
                      No movements found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Main>
    </>
  )
}
