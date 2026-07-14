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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { brandInputSchema, type BrandListItem } from '../data/schema'
import { useCreateBrand, useUpdateBrand } from '../hooks/use-brands'

export function BrandFormDialog({
  open,
  onOpenChange,
  brand,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  brand: BrandListItem | null
}) {
  const isEdit = Boolean(brand)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const createBrand = useCreateBrand()
  const updateBrand = useUpdateBrand()

  useEffect(() => {
    if (open) {
      setName(brand?.name ?? '')
      setCode(brand?.code ?? '')
      setLogoUrl(brand?.logo_url ?? '')
      setDescription(brand?.description ?? '')
      setIsActive(brand?.is_active ?? true)
    }
  }, [open, brand])

  const handleSubmit = async () => {
    const parsed = brandInputSchema.safeParse({
      name,
      code: code || null,
      logoUrl: logoUrl || null,
      description: description || null,
      isActive,
    })
    if (!parsed.success) {
      toast.error('Please fix the brand', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }
    try {
      if (isEdit && brand) {
        await updateBrand.mutateAsync({ id: brand.id, input: parsed.data })
      } else {
        await createBrand.mutateAsync(parsed.data)
      }
      onOpenChange(false)
    } catch {
      /* handled by mutation onError toast */
    }
  }

  const pending = createBrand.isPending || updateBrand.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Brand' : 'New Brand'}</DialogTitle>
          <DialogDescription>
            Brands group products by manufacturer or label for filtering and
            reporting.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className='grid gap-2'>
              <Label>Code (optional)</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>
          <div className='grid gap-2'>
            <Label>Logo URL (optional)</Label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          {isEdit ? (
            <div className='flex items-center gap-2'>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? 'Saving...' : isEdit ? 'Save changes' : 'Create brand'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
