import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Search, CornerDownRight, Layers, Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const TYPE_VARIANT: Record<
  LocationType,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  zone: 'default',
  rack: 'secondary',
  shelf: 'outline',
  bin: 'outline',
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
  const [searchFilter, setSearchFilter] = useState('')

  const handleAdd = async () => {
    const parsed = locationInputSchema.safeParse({
      parentId,
      locationType,
      code: code.trim(),
      name: name.trim() || null,
    })
    if (!parsed.success) {
      toast.error('Invalid location input', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Layers className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle>
                {t('warehouses.locations.title', {
                  code: warehouse.code,
                  name: warehouse.name,
                  defaultValue: `Locations — ${warehouse.code} ${warehouse.name}`,
                })}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'warehouses.locations.description',
                  'Zone → rack → shelf → bin hierarchy. Stock is stored at the most specific location.'
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Add Location Form Box */}
        <div className='rounded-lg border bg-muted/30 p-3 space-y-3'>
          <div className='flex flex-wrap items-end gap-2'>
            <div className='grid gap-1 min-w-[180px] flex-1'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('warehouses.locations.parent', 'Parent Location')}
              </span>
              <Select
                value={parentId ?? '__root__'}
                onValueChange={(value) =>
                  setParentId(value === '__root__' ? null : value)
                }
              >
                <SelectTrigger className='h-9 w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='max-h-56'>
                  <SelectItem value='__root__'>
                    {t('warehouses.locations.root', '— Root (no parent) —')}
                  </SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.path ?? location.code} {location.name ? `(${location.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-1 w-28'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('warehouses.locations.type', 'Location Type')}
              </span>
              <Select
                value={locationType}
                onValueChange={(value) => setLocationType(value as LocationType)}
              >
                <SelectTrigger className='h-9 w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_ORDER.map((type) => (
                    <SelectItem key={type} value={type} className='capitalize'>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-1 w-28'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('warehouses.locations.code', 'Code')} *
              </span>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('warehouses.locations.codePlaceholder', 'e.g. A1')}
                className='h-9 font-mono uppercase'
              />
            </div>

            <div className='grid gap-1 min-w-[140px] flex-1'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('warehouses.locations.name', 'Name')}
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('warehouses.locations.namePlaceholder', 'Optional label')}
                className='h-9'
              />
            </div>

            <Button
              size='sm'
              onClick={handleAdd}
              disabled={createLocation.isPending || !code.trim()}
              className='h-9'
            >
              {createLocation.isPending ? (
                <Loader2 className='me-1.5 h-4 w-4 animate-spin' />
              ) : (
                <Plus className='me-1.5 h-4 w-4' />
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
            placeholder='Search locations by code or path...'
            className='ps-9 h-9'
          />
        </div>

        {/* Locations List */}
        <ScrollArea className='flex-1 max-h-[45vh] pe-3'>
          {isLoading ? (
            <div className='flex items-center justify-center p-8 text-sm text-muted-foreground'>
              <Loader2 className='me-2 h-5 w-5 animate-spin text-primary' />
              <span>{t('warehouses.locations.loading', 'Loading locations...')}</span>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className='rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground'>
              {searchFilter
                ? 'No matching locations found.'
                : t(
                    'warehouses.locations.empty',
                    'No locations yet. Add a zone to get started.'
                  )}
            </div>
          ) : (
            <div className='space-y-1.5 py-1'>
              {filteredLocations.map((location) => {
                const depth = depthOf(location)
                return (
                  <div
                    key={location.id}
                    className='group flex items-center justify-between rounded-lg border bg-card p-2.5 transition-colors hover:bg-accent/40'
                    style={{ marginInlineStart: depth * 22 }}
                  >
                    <div className='flex items-center gap-2 overflow-hidden'>
                      {depth > 0 && (
                        <CornerDownRight className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                      )}
                      <Badge
                        variant={TYPE_VARIANT[location.location_type]}
                        className='capitalize text-[11px] font-semibold tracking-wide shrink-0'
                      >
                        {location.location_type}
                      </Badge>
                      <span className='font-mono font-bold text-sm'>
                        {location.code}
                      </span>
                      {location.name && (
                        <span className='text-xs text-muted-foreground truncate'>
                          — {location.name}
                        </span>
                      )}
                      {location.path && (
                        <span className='text-[10px] text-muted-foreground/70 font-mono bg-muted px-1.5 py-0.5 rounded'>
                          {location.path}
                        </span>
                      )}
                      {location.is_default && (
                        <Badge variant='secondary' className='text-[10px] shrink-0'>
                          Default
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7 text-muted-foreground opacity-70 hover:opacity-100 hover:text-destructive'
                      onClick={() => {
                        if (
                          window.confirm(
                            t(
                              'warehouses.locations.deletePrompt',
                              'Delete location? Child locations and locations with stock must be cleared first.'
                            )
                          )
                        ) {
                          deleteLocation.mutate(location.id)
                        }
                      }}
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
      </DialogContent>
    </Dialog>
  )
}
