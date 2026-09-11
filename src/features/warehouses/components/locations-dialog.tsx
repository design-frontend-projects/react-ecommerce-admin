import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Trash2,
  Search,
  CornerDownRight,
  Layers,
  Loader2,
  X,
  Boxes,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  locationInputSchema,
  type LocationType,
  type WarehouseListItem,
  type WarehouseLocation,
} from '../data/schema'
import {
  useCreateLocation,
  useDeleteLocation,
  useWarehouseLocations,
} from '../hooks/use-warehouses'

const TYPE_ORDER: LocationType[] = ['zone', 'rack', 'shelf', 'bin']

const TYPE_STYLES: Record<
  LocationType,
  { label: string; badgeClass: string; dotClass: string }
> = {
  zone: {
    label: 'Zone',
    badgeClass: 'border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10',
    dotClass: 'bg-blue-500',
  },
  rack: {
    label: 'Rack',
    badgeClass: 'border-violet-500/30 text-violet-700 dark:text-violet-300 bg-violet-500/10',
    dotClass: 'bg-violet-500',
  },
  shelf: {
    label: 'Shelf',
    badgeClass: 'border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10',
    dotClass: 'bg-amber-500',
  },
  bin: {
    label: 'Bin',
    badgeClass: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10',
    dotClass: 'bg-emerald-500',
  },
}

function depthOf(location: WarehouseLocation): number {
  return (location.path ?? '').split('/').filter(Boolean).length - 1
}

export function WarehouseLocationsDialog({
  open,
  onOpenChange,
  warehouse,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouse: WarehouseListItem
}) {
  const { t } = useTranslation()
  const { data: locations = [], isLoading } = useWarehouseLocations(
    open ? warehouse.id : undefined
  )
  const createLocation = useCreateLocation(warehouse.id)
  const deleteLocation = useDeleteLocation(warehouse.id)

  const [parentId, setParentId] = useState<string | null>(null)
  const [locationType, setLocationType] = useState<LocationType>('zone')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isPickable, setIsPickable] = useState(true)
  const [isReceivable, setIsReceivable] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')
  const [locationToDelete, setLocationToDelete] =
    useState<WarehouseLocation | null>(null)

  const handleAdd = async () => {
    const parsed = locationInputSchema.safeParse({
      parentId,
      locationType,
      code: code.trim().toUpperCase(),
      name: name.trim() || null,
      isPickable,
      isReceivable,
    })
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ??
          t('warehouses.locations.invalidInput', 'Invalid input.')
      )
      return
    }
    try {
      await createLocation.mutateAsync(parsed.data)
      setCode('')
      setName('')
    } catch {
      // Handled by toast
    }
  }

  const handleDeleteConfirm = async () => {
    if (!locationToDelete) return
    try {
      await deleteLocation.mutateAsync(locationToDelete.id)
      setLocationToDelete(null)
    } catch {
      // Handled by toast
    }
  }

  // Count by types
  const typeCounts = useMemo(() => {
    const counts = { zone: 0, rack: 0, shelf: 0, bin: 0 }
    for (const loc of locations) {
      if (loc.location_type in counts) {
        counts[loc.location_type]++
      }
    }
    return counts
  }, [locations])

  const filteredLocations = useMemo(() => {
    if (!searchFilter.trim()) return locations
    const term = searchFilter.toLowerCase()
    return locations.filter(
      (loc) =>
        loc.code.toLowerCase().includes(term) ||
        (loc.name && loc.name.toLowerCase().includes(term)) ||
        (loc.path && loc.path.toLowerCase().includes(term))
    )
  }, [locations, searchFilter])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden'>
          {/* Header */}
          <DialogHeader className='p-6 pb-4 border-b bg-muted/20'>
            <div className='flex items-start justify-between gap-2'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400'>
                  <Layers className='h-5 w-5' />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <DialogTitle className='text-lg font-bold'>
                      {t('warehouses.locations.title', {
                        code: warehouse.code,
                        name: warehouse.name,
                        defaultValue: `Locations — ${warehouse.code}`,
                      })}
                    </DialogTitle>
                    <Badge variant='outline' className='font-mono text-xs'>
                      {warehouse.name}
                    </Badge>
                  </div>
                  <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                    {t(
                      'warehouses.locations.description',
                      'Zone → rack → shelf → bin hierarchy. Stock is stored at the most specific location.'
                    )}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Quick Type Counter Chips */}
            <div className='flex flex-wrap items-center gap-2 pt-3'>
              <Badge variant='outline' className='text-[11px] gap-1'>
                <Boxes className='h-3 w-3 text-muted-foreground' />
                <span>
                  {t('warehouses.locations.totalCount', 'Total')}: {locations.length}
                </span>
              </Badge>
              {TYPE_ORDER.map((type) => {
                const count = typeCounts[type]
                if (count === 0) return null
                const style = TYPE_STYLES[type]
                return (
                  <Badge
                    key={type}
                    variant='outline'
                    className={`text-[11px] capitalize gap-1 ${style.badgeClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dotClass}`} />
                    <span>
                      {type}: {count}
                    </span>
                  </Badge>
                )
              })}
            </div>
          </DialogHeader>

          {/* Form & List */}
          <div className='p-6 flex-1 flex flex-col gap-4 overflow-hidden'>
            {/* Add Location Form Box */}
            <div className='rounded-xl border bg-muted/20 p-4 space-y-3 shadow-xs'>
              <span className='text-xs font-semibold text-foreground uppercase tracking-wider block'>
                {t('warehouses.locations.addHeading', 'Add New Location')}
              </span>

              <div className='grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end'>
                {/* Parent */}
                <div className='sm:col-span-4 grid gap-1'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    {t('warehouses.locations.parent', 'Parent Location')}
                  </span>
                  <Select
                    value={parentId ?? '__root__'}
                    onValueChange={(value) =>
                      setParentId(value === '__root__' ? null : value)
                    }
                  >
                    <SelectTrigger className='h-9 w-full text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className='max-h-56 text-xs'>
                      <SelectItem value='__root__'>
                        {t('warehouses.locations.root', '— Root (no parent) —')}
                      </SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          <span className='font-mono'>{location.path ?? location.code}</span>{' '}
                          {location.name ? `(${location.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <div className='sm:col-span-2 grid gap-1'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    {t('warehouses.locations.type', 'Type')}
                  </span>
                  <Select
                    value={locationType}
                    onValueChange={(value) => setLocationType(value as LocationType)}
                  >
                    <SelectTrigger className='h-9 w-full text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className='text-xs'>
                      {TYPE_ORDER.map((type) => (
                        <SelectItem key={type} value={type} className='capitalize'>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Code */}
                <div className='sm:col-span-2 grid gap-1'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    {t('warehouses.locations.code', 'Code')} *
                  </span>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder={t('warehouses.locations.codePlaceholder', 'e.g. A1')}
                    className='h-9 font-mono uppercase text-xs'
                    maxLength={50}
                  />
                </div>

                {/* Name */}
                <div className='sm:col-span-4 grid gap-1'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    {t('warehouses.locations.name', 'Label / Name')}
                  </span>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t(
                      'warehouses.locations.namePlaceholder',
                      'Optional label'
                    )}
                    className='h-9 text-xs'
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Toggles and Add button */}
              <div className='flex flex-wrap items-center justify-between gap-2 pt-1 border-t'>
                <div className='flex items-center gap-4 text-xs'>
                  <label className='flex items-center gap-1.5 cursor-pointer'>
                    <Switch
                      checked={isPickable}
                      onCheckedChange={setIsPickable}
                      className='scale-75'
                    />
                    <span className='text-muted-foreground'>
                      {t('warehouses.locations.isPickable', 'Pickable')}
                    </span>
                  </label>
                  <label className='flex items-center gap-1.5 cursor-pointer'>
                    <Switch
                      checked={isReceivable}
                      onCheckedChange={setIsReceivable}
                      className='scale-75'
                    />
                    <span className='text-muted-foreground'>
                      {t('warehouses.locations.isReceivable', 'Receivable')}
                    </span>
                  </label>
                </div>

                <Button
                  size='sm'
                  onClick={handleAdd}
                  disabled={createLocation.isPending || !code.trim()}
                  className='h-8 text-xs'
                >
                  {createLocation.isPending ? (
                    <Loader2 className='me-1.5 h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <Plus className='me-1.5 h-3.5 w-3.5' />
                  )}
                  {t('warehouses.locations.add', 'Add Location')}
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className='relative'>
              <Search className='absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={t(
                  'warehouses.locations.searchPlaceholder',
                  'Search locations by code, label, or hierarchy path...'
                )}
                className='ps-9 pe-8 h-9 text-xs'
              />
              {searchFilter && (
                <button
                  type='button'
                  onClick={() => setSearchFilter('')}
                  className='absolute end-2.5 top-2.5 text-muted-foreground hover:text-foreground'
                >
                  <X className='h-4 w-4' />
                </button>
              )}
            </div>

            {/* Locations List */}
            <ScrollArea className='flex-1 border rounded-lg p-2 max-h-[40vh]'>
              {isLoading ? (
                <div className='flex items-center justify-center p-8 text-sm text-muted-foreground'>
                  <Loader2 className='me-2 h-5 w-5 animate-spin text-primary' />
                  <span>
                    {t('warehouses.locations.loading', 'Loading locations...')}
                  </span>
                </div>
              ) : filteredLocations.length === 0 ? (
                <div className='rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground'>
                  {searchFilter
                    ? t('warehouses.locations.noMatches', 'No matching locations found.')
                    : t(
                        'warehouses.locations.empty',
                        'No locations yet. Add a zone to get started.'
                      )}
                </div>
              ) : (
                <div className='space-y-1.5'>
                  {filteredLocations.map((location) => {
                    const depth = depthOf(location)
                    const style = TYPE_STYLES[location.location_type]
                    return (
                      <div
                        key={location.id}
                        className='group flex items-center justify-between rounded-lg border bg-card p-2 text-xs transition-colors hover:bg-accent/40 shadow-2xs'
                        style={{ marginInlineStart: depth * 20 }}
                      >
                        <div className='flex items-center gap-2 overflow-hidden flex-1'>
                          {depth > 0 && (
                            <CornerDownRight className='h-3.5 w-3.5 text-muted-foreground/60 shrink-0' />
                          )}
                          <Badge
                            variant='outline'
                            className={`capitalize text-[10px] font-semibold shrink-0 ${style.badgeClass}`}
                          >
                            {location.location_type}
                          </Badge>
                          <span className='font-mono font-bold text-xs text-foreground'>
                            {location.code}
                          </span>
                          {location.name && (
                            <span className='text-muted-foreground truncate'>
                              — {location.name}
                            </span>
                          )}
                          {location.path && (
                            <span className='text-[10px] text-muted-foreground/70 font-mono bg-muted px-1.5 py-0.5 rounded'>
                              {location.path}
                            </span>
                          )}

                          <div className='ms-auto flex items-center gap-1.5 pe-2'>
                            {location.is_pickable && (
                              <span
                                className='text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded'
                                title='Pickable for orders'
                              >
                                Pick
                              </span>
                            )}
                            {location.is_receivable && (
                              <span
                                className='text-[9px] text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 rounded'
                                title='Receivable for stock intake'
                              >
                                Recv
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7 text-muted-foreground opacity-60 hover:opacity-100 hover:text-destructive cursor-pointer shrink-0'
                          onClick={() => setLocationToDelete(location)}
                          disabled={deleteLocation.isPending}
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Location Confirmation AlertDialog */}
      <AlertDialog
        open={!!locationToDelete}
        onOpenChange={(val) => !val && setLocationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className='flex items-center gap-2 text-destructive'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10'>
                <AlertTriangle className='h-5 w-5' />
              </div>
              <AlertDialogTitle>
                {t('warehouses.locations.deleteTitle', 'Delete Location')}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className='space-y-2 pt-2'>
              <p>
                {t('warehouses.locations.deleteConfirmPrompt', {
                  code: locationToDelete?.code,
                  path: locationToDelete?.path,
                  defaultValue: `Are you sure you want to delete location "${locationToDelete?.code}" (${locationToDelete?.path})?`,
                })}
              </p>
              <p className='text-xs text-muted-foreground'>
                {t(
                  'warehouses.locations.deleteWarning',
                  'Child sub-locations and any active stock balances at this location must be cleared first.'
                )}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLocation.isPending}>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLocation.isPending}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {deleteLocation.isPending ? (
                <>
                  <Loader2 className='me-2 h-4 w-4 animate-spin' />
                  {t('common.deleting', 'Deleting...')}
                </>
              ) : (
                t('common.delete', 'Delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
