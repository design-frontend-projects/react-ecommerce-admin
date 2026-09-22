import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Numpad } from './numpad'

interface ManualSkuDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSearch: (sku: string) => void
}

export function ManualSkuDialog({
  open,
  onOpenChange,
  onSearch,
}: ManualSkuDialogProps) {
  const { t } = useTranslation()
  const [sku, setSku] = useState('')

  const handleKeyPress = (key: string) => {
    setSku((prev) => prev + key)
  }

  const handleBackspace = () => {
    setSku((prev) => prev.slice(0, -1))
  }

  const handleEnter = () => {
    if (sku.trim()) {
      onSearch(sku.trim())
      setSku('')
      onOpenChange(false)
    }
  }

  // Handle physical keyboard typing while modal is open
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEnter()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {t('pos.manualSku.title', 'Manual Item Entry')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'pos.manualSku.desc',
              'Enter the product SKU or barcode using the numpad or keyboard.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-6 py-4'>
          <Input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('pos.manualSku.placeholder', 'Enter SKU...')}
            className='h-16 text-center text-3xl font-bold tracking-widest'
            autoFocus
          />

          <Numpad
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            onEnter={handleEnter}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
