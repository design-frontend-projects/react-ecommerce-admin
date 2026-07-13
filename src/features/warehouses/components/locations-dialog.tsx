import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useCreateLocation,
  useDeleteLocation,
  useWarehouseLocations,
} from '../hooks/use-warehouses'
import {
  locationInputSchema,
  type LocationType,
  type WarehouseListItem,
  type WarehouseLocation,
} from '../data/schema'

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
  const { data: locations = [], isLoading } = useWarehouseLocations(
    open ? warehouse.id : undefined
  )
  const createLocation = useCreateLocation(warehouse.id)
  const deleteLocation = useDeleteLocation(warehouse.id)

  const [parentId, setParentId] = useState<string | null>(null)
  const [locationType, setLocationType] = useState<LocationType>('zone')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  const handleAdd = async () => {
    const parsed = locationInputSchema.safeParse({
      parentId,
      locationType,
      code,
      name: name || null,
    })
    if (!parsed.success) {
      toast.error('Please fix the location', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }
    try {
      await createLocation.mutateAsync(parsed.data)
      setCode('')
      setName('')
    } catch {
      /* handled by mutation onError toast */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            Locations — {warehouse.code} {warehouse.name}
          </DialogTitle>
          <DialogDescription>
            Zone → rack → shelf → bin hierarchy. Stock is stored at the most
            specific location; the default zone receives untargeted movements.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-wrap items-end gap-2 rounded-md border p-3'>
          <div className='grid gap-1'>
            <span className='text-xs text-muted-foreground'>Parent</span>
            <Select
              value={parentId ?? '__root__'}
              onValueChange={(value) =>
                setParentId(value === '__root__' ? null : value)
              }
            >
              <SelectTrigger className='w-56'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__root__'>— Root (no parent) —</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.path ?? location.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-1'>
            <span className='text-xs text-muted-foreground'>Type</span>
            <Select
              value={locationType}
              onValueChange={(value) => setLocationType(value as LocationType)}
            >
              <SelectTrigger className='w-28'>
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
          <div className='grid gap-1'>
            <span className='text-xs text-muted-foreground'>Code</span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder='A1'
              className='w-24'
            />
          </div>
          <div className='grid gap-1'>
            <span className='text-xs text-muted-foreground'>Name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Optional'
              className='w-36'
            />
          </div>
          <Button
            size='sm'
            onClick={handleAdd}
            disabled={createLocation.isPending}
          >
            <Plus className='me-1 h-4 w-4' />
            Add
          </Button>
        </div>

        <ScrollArea className='max-h-[45vh]'>
          {isLoading ? (
            <p className='p-4 text-sm text-muted-foreground'>Loading...</p>
          ) : locations.length === 0 ? (
            <p className='p-4 text-sm text-muted-foreground'>
              No locations yet. Add a zone to get started.
            </p>
          ) : (
            <div className='space-y-1'>
              {locations.map((location) => (
                <div
                  key={location.id}
                  className='flex items-center justify-between rounded-md border px-3 py-1.5'
                  style={{ marginInlineStart: depthOf(location) * 20 }}
                >
                  <div className='flex items-center gap-2'>
                    <Badge
                      variant={TYPE_VARIANT[location.location_type]}
                      className='capitalize'
                    >
                      {location.location_type}
                    </Badge>
                    <span className='font-medium'>{location.code}</span>
                    {location.name ? (
                      <span className='text-sm text-muted-foreground'>
                        {location.name}
                      </span>
                    ) : null}
                    {location.is_default ? (
                      <Badge variant='secondary'>Default</Badge>
                    ) : null}
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => deleteLocation.mutate(location.id)}
                    disabled={deleteLocation.isPending}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
