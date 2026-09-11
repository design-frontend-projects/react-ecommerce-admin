import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useWarehouseLocationOptions, useWarehouseOptions, useStoreOptions } from '@/hooks/use-inventory-lookups'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createCountInputSchema } from '../data/schema'
import { useCreateCount } from '../hooks/use-stock-counts'

interface CategoryOption {
  category_id: number
  name: string
}

/** Categories for the optional category scope. */
function useCategoryOptions() {
  return useQuery<CategoryOption[]>({
    queryKey: ['categories', 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('name, id')
        .order('name')
      if (error) throw error
      return (data ?? []).map((c: any, idx: number) => ({
        category_id: idx + 1,
        name: c.name,
      })) as CategoryOption[]
    },
  })
}

const ALL_CATEGORIES = 'all'
const ALL_LOCATIONS = 'all'

export function CountCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [warehouseId, setWarehouseId] = useState('')
  const [warehouseLocationId, setWarehouseLocationId] = useState(ALL_LOCATIONS)
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES)
  const [isBlind, setIsBlind] = useState(false)
  const [notes, setNotes] = useState('')

  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: stores = [] } = useStoreOptions()
  const { data: locations = [] } = useWarehouseLocationOptions(warehouseId || undefined)
  const { data: categories = [] } = useCategoryOptions()
  const createCount = useCreateCount()

  const locationOptions =
    warehouses.length > 0
      ? warehouses.map((w) => ({ id: w.id, name: `${w.name} (${w.code})` }))
      : stores.map((s) => ({ id: s.store_id, name: s.name ?? s.store_id }))

  const reset = () => {
    setWarehouseId('')
    setWarehouseLocationId(ALL_LOCATIONS)
    setCategoryId(ALL_CATEGORIES)
    setIsBlind(false)
    setNotes('')
  }

  const handleSubmit = async () => {
    const parsed = createCountInputSchema.safeParse({
      warehouseId: warehouseId || undefined,
      storeId: warehouseId || undefined,
      warehouseLocationId:
        warehouseLocationId === ALL_LOCATIONS ? undefined : warehouseLocationId,
      categoryId:
        categoryId === ALL_CATEGORIES ? undefined : Number(categoryId),
      isBlind,
      notes: notes || undefined,
    })

    if (!parsed.success) {
      toast.error(t('stockCounts.createDialog.validationError', 'Please fix the stock count'), {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }

    try {
      await createCount.mutateAsync(parsed.data)
      reset()
      onOpenChange(false)
    } catch {
      /* handled by mutation onError toast */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset()
        onOpenChange(value)
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('stockCounts.createDialog.title', 'New Stock Count')}</DialogTitle>
          <DialogDescription>
            {t(
              'stockCounts.createDialog.description',
              'Create a draft count. Starting the count freezes expected quantities for the selected warehouse / location scope.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <Label>{t('stockCounts.createDialog.warehouseLocation', 'Warehouse / Location')}</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder={t('stockCounts.createDialog.selectWarehouse', 'Select warehouse')} />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {locations.length > 0 && (
            <div className='grid gap-2'>
              <Label>{t('stockCounts.createDialog.specificLocation', 'Specific Location (optional)')}</Label>
              <Select value={warehouseLocationId} onValueChange={setWarehouseLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('stockCounts.createDialog.allLocations', 'All warehouse locations')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LOCATIONS}>{t('stockCounts.createDialog.allLocations', 'All warehouse locations')}</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.code} {loc.name ? `— ${loc.name}` : ''} ({loc.location_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className='grid gap-2'>
            <Label>{t('stockCounts.createDialog.category', 'Category (optional)')}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>{t('stockCounts.createDialog.allCategories', 'All categories')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem
                    key={category.category_id}
                    value={String(category.category_id)}
                  >
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center justify-between rounded-md border p-3'>
            <div className='space-y-0.5'>
              <Label>{t('stockCounts.createDialog.blindCount', 'Blind count')}</Label>
              <p className='text-xs text-muted-foreground'>
                {t('stockCounts.createDialog.blindCountHelp', 'Hide expected quantities from counters.')}
              </p>
            </div>
            <Switch checked={isBlind} onCheckedChange={setIsBlind} />
          </div>

          <div className='grid gap-2'>
            <Label>{t('stockCounts.createDialog.notes', 'Notes (optional)')}</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={createCount.isPending}>
            {createCount.isPending
              ? t('stockCounts.createDialog.saving', 'Saving...')
              : t('stockCounts.createDialog.createDraft', 'Create draft')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
