import { useState } from 'react'
import { Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validatePosPromotion } from '../data/api'
import { useBasket } from '../store/use-basket'

export function PromoCodeDialog() {
  const { applyPromotion, removePromotion, appliedPromotion } = useBasket()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')

  const handleApply = async () => {
    if (!code.trim()) return

    setLoading(true)
    try {
      const promo = await validatePosPromotion(code.trim().toUpperCase())
      applyPromotion(promo)
      toast.success('Promotion applied successfully!')
      setOpen(false)
      setCode('')
    } catch (err: any) {
      toast.error(err.message || 'Invalid promotion code')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = () => {
    removePromotion()
    setOpen(false)
    setCode('')
    toast.success('Promotion removed')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' className='w-full'>
          <Tag className='mr-2 h-4 w-4' />
          {appliedPromotion ? 'Edit Promo' : 'Promo Code'}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Apply Promotion Code</DialogTitle>
        </DialogHeader>
        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder='e.g. SUMMER2026'
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleApply()
                }
              }}
            />
          </div>
          {appliedPromotion && (
            <div className='text-sm text-muted-foreground'>
              Currently applied:{' '}
              <span className='font-semibold'>{appliedPromotion.code}</span>
            </div>
          )}
        </div>
        <div className='flex justify-end gap-2'>
          {appliedPromotion && (
            <Button
              variant='destructive'
              onClick={handleRemove}
              disabled={loading}
            >
              Remove
            </Button>
          )}
          <Button
            variant='outline'
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={loading || !code.trim()}>
            {loading ? 'Validating...' : 'Apply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
