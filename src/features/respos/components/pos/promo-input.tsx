import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePromotion } from '../../hooks/use-promotion'
import { formatCurrency } from '../../lib/formatters'

export function PromoInput() {
  const [code, setCode] = useState('')
  const { applyPromo, removePromo, isLoading, currentPromo, discountAmount } = usePromotion()

  const handleApply = async () => {
    if (!code.trim()) return
    const result = await applyPromo(code)
    if (result.success) {
      setCode('') // clear input on success
    }
  }

  return (
    <div className='flex flex-col gap-2'>
      <AnimatePresence mode='popLayout'>
        {currentPromo ? (
          <motion.div
            key='applied'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className='flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3'
          >
            <div className='flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600'>
                <Tag className='h-4 w-4' />
              </div>
              <div>
                <p className='text-sm font-bold text-emerald-700 dark:text-emerald-400'>
                  {currentPromo.code}
                </p>
                <p className='text-[10px] font-medium text-emerald-600/80 uppercase'>
                  {currentPromo.name} (-{formatCurrency(discountAmount)})
                </p>
              </div>
            </div>
            <Button
              variant='ghost'
              size='icon'
              onClick={removePromo}
              className='h-8 w-8 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700'
            >
              <X className='h-4 w-4' />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key='input'
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className='flex gap-2'
          >
            <div className='relative flex-1'>
              <Tag className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50' />
              <Input
                placeholder='Promo code'
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply()
                }}
                className='h-10 rounded-xl bg-background/50 pl-9 pr-4 font-mono font-bold uppercase transition-all focus-visible:ring-orange-500'
              />
            </div>
            <Button
              onClick={handleApply}
              disabled={!code.trim() || isLoading}
              className='h-10 rounded-xl bg-primary px-4 font-bold shadow-sm transition-all'
            >
              {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Apply'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
