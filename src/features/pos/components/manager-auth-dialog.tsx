import { useState } from 'react'
import { ShieldCheck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Numpad } from './numpad'

interface ManagerAuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  isLoading?: boolean
}

export function ManagerAuthDialog({
  open,
  onOpenChange,
  onSuccess,
  isLoading = false,
}: ManagerAuthDialogProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const CORRECT_PIN = '1234' // Dummy pin for implementation

  const handleKeyPress = (key: string) => {
    if (isLoading) return
    setError(false)
    if (pin.length < 4) {
      setPin((prev) => prev + key)
    }
  }

  const handleBackspace = () => {
    if (isLoading) return
    setError(false)
    setPin((prev) => prev.slice(0, -1))
  }

  const handleVerify = () => {
    if (isLoading) return
    if (pin === CORRECT_PIN) {
      onSuccess()
      setPin('')
      toast.success('Manager authorized')
      onOpenChange(false)
    } else {
      setError(true)
      setPin('')
      toast.error('Invalid PIN')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <div className='mx-auto mb-2 rounded-full bg-primary/10 p-3'>
            <ShieldCheck className='h-6 w-6 text-primary' />
          </div>
          <DialogTitle className='text-center'>
            Manager Authorization Required
          </DialogTitle>
          <DialogDescription className='text-center'>
            Please enter your 4-digit PIN to authorize this action.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-6 py-4'>
          <div className='relative'>
            <Input
              type='password'
              value={pin}
              readOnly
              disabled={isLoading}
              className={`h-16 text-center text-4xl tracking-[1em] ${
                error ? 'border-destructive ring-destructive' : ''
              }`}
              placeholder='••••'
            />
            {error && (
              <div className='absolute top-1/2 right-3 -translate-y-1/2'>
                <XCircle className='h-6 w-6 text-destructive' />
              </div>
            )}
          </div>

          <Numpad
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            onEnter={pin.length === 4 ? handleVerify : undefined}
          />
        </div>

        <div className='flex justify-center'>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
