import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useStoreOptions } from '@/hooks/use-inventory-lookups'
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
        .select('category_id, name')
        .order('name')
      if (error) throw error
      return (data ?? []) as CategoryOption[]
    },
  })
}

const ALL_CATEGORIES = 'all'

export function CountCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [storeId, setStoreId] = useState('')
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES)
  const [isBlind, setIsBlind] = useState(false)
  const [notes, setNotes] = useState('')

  const { data: stores = [] } = useStoreOptions()
  const { data: categories = [] } = useCategoryOptions()
  const createCount = useCreateCount()

  const reset = () => {
    setStoreId('')
    setCategoryId(ALL_CATEGORIES)
    setIsBlind(false)
    setNotes('')
  }

  const handleSubmit = async () => {
    const parsed = createCountInputSchema.safeParse({
      storeId,
      categoryId:
        categoryId === ALL_CATEGORIES ? undefined : Number(categoryId),
      isBlind,
      notes: notes || undefined,
    })

    if (!parsed.success) {
      toast.error('Please fix the stock count', {
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
          <DialogTitle>New Stock Count</DialogTitle>
          <DialogDescription>
            Create a draft count. Starting the count freezes expected quantities
            for the selected scope.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <Label>Store</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger>
                <SelectValue placeholder='Select store' />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.store_id} value={store.store_id}>
                    {store.name ?? store.store_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-2'>
            <Label>Category (optional)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
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
              <Label>Blind count</Label>
              <p className='text-xs text-muted-foreground'>
                Hide expected quantities from counters.
              </p>
            </div>
            <Switch checked={isBlind} onCheckedChange={setIsBlind} />
          </div>

          <div className='grid gap-2'>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createCount.isPending}>
            {createCount.isPending ? 'Saving...' : 'Create draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
