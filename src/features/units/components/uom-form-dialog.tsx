import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  uomCategorySchema,
  uomInputSchema,
  type UomCategory,
  type UomListItem,
} from '../data/schema'
import { useCreateUom, useUpdateUom } from '../hooks/use-uoms'

const CATEGORIES = uomCategorySchema.options

export function UomFormDialog({
  open,
  onOpenChange,
  uom,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  uom: UomListItem | null
}) {
  const isEdit = Boolean(uom)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<UomCategory>('count')
  const [isBase, setIsBase] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const createUom = useCreateUom()
  const updateUom = useUpdateUom()

  useEffect(() => {
    if (open) {
      setCode(uom?.code ?? '')
      setName(uom?.name ?? '')
      setCategory(uom?.uom_category ?? 'count')
      setIsBase(uom?.is_base ?? false)
      setIsActive(uom?.is_active ?? true)
    }
  }, [open, uom])

  const handleSubmit = async () => {
    const parsed = uomInputSchema.safeParse({
      code,
      name,
      uomCategory: category,
      isBase,
      isActive,
    })
    if (!parsed.success) {
      toast.error('Please fix the unit', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }
    try {
      if (isEdit && uom) {
        await updateUom.mutateAsync({ id: uom.id, input: parsed.data })
      } else {
        await createUom.mutateAsync(parsed.data)
      }
      onOpenChange(false)
    } catch {
      /* handled by mutation onError toast */
    }
  }

  const pending = createUom.isPending || updateUom.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Unit' : 'New Unit'}</DialogTitle>
          <DialogDescription>
            Units of measure describe how products are counted, weighed, or
            measured. Base units anchor conversions within a category.
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
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as UomCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a category' />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    className='capitalize'
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-2'>
              <Switch checked={isBase} onCheckedChange={setIsBase} />
              <Label>Base unit for its category</Label>
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
            {pending ? 'Saving...' : isEdit ? 'Save changes' : 'Create unit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
