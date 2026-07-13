import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useStoreOptions } from '@/hooks/use-inventory-lookups'
import { useCreateWarehouse, useUpdateWarehouse } from '../hooks/use-warehouses'
import { warehouseInputSchema, type WarehouseListItem } from '../data/schema'

const NONE = '__none__'

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouse: WarehouseListItem | null
}) {
  const isEdit = Boolean(warehouse)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [storeId, setStoreId] = useState(NONE)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const { data: stores = [] } = useStoreOptions()
  const createWarehouse = useCreateWarehouse()
  const updateWarehouse = useUpdateWarehouse()

  useEffect(() => {
    if (open) {
      setCode(warehouse?.code ?? '')
      setName(warehouse?.name ?? '')
      setStoreId(warehouse?.stores?.store_id ?? NONE)
      setAddress(warehouse?.address ?? '')
      setNotes(warehouse?.notes ?? '')
      setIsDefault(warehouse?.is_default ?? false)
      setIsActive(warehouse?.is_active ?? true)
    }
  }, [open, warehouse])

  const handleSubmit = async () => {
    const parsed = warehouseInputSchema.safeParse({
      code,
      name,
      storeId: storeId === NONE ? null : storeId,
      address: address || null,
      notes: notes || null,
      isDefault,
      isActive,
    })
    if (!parsed.success) {
      toast.error('Please fix the warehouse', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }
    try {
      if (isEdit && warehouse) {
        await updateWarehouse.mutateAsync({ id: warehouse.id, input: parsed.data })
      } else {
        await createWarehouse.mutateAsync(parsed.data)
      }
      onOpenChange(false)
    } catch {
      /* handled by mutation onError toast */
    }
  }

  const pending = createWarehouse.isPending || updateWarehouse.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
          <DialogDescription>
            A warehouse holds zones, racks, shelves, and bins. Linking a store
            makes it that store&apos;s stock facility.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className='grid gap-2'>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className='grid gap-2'>
            <Label>Linked store (optional)</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger>
                <SelectValue placeholder='No store' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No store</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.store_id} value={store.store_id}>
                    {store.name ?? store.store_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-2'>
            <Label>Address (optional)</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className='grid gap-2'>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-2'>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <Label>Default for its store</Label>
            </div>
            {isEdit ? (
              <div className='flex items-center gap-2'>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? 'Saving...' : isEdit ? 'Save changes' : 'Create warehouse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
