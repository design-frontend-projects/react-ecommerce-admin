import { motion } from 'framer-motion'
import { Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/features/respos/lib/formatters'
import type { CartItem as CartItemType } from '@/features/respos/types'

interface CartItemProps {
  item: CartItemType
  index: number
  onUpdateQuantity: (index: number, qty: number) => void
  onRemoveItem: (index: number) => void
}

export function CartItem({ item, index, onUpdateQuantity, onRemoveItem }: CartItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className='group relative rounded-3xl border-2 border-orange-500/10 bg-orange-500/5 p-4 shadow-sm transition-all hover:border-orange-500/20'
    >
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='truncate text-sm font-black'>
              {item.item.name}
            </span>
            {item.variant && (
              <span className='shrink-0 rounded-lg bg-orange-500/10 px-2 py-0.5 text-[9px] font-black text-orange-600 uppercase'>
                {item.variant.name}
              </span>
            )}
          </div>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6 rounded-lg text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500'
          onClick={() => onRemoveItem(index)}
        >
          <X className='h-3.5 w-3.5' />
        </Button>
      </div>

      {/* Quantity + Price Row */}
      <div className='mt-4 flex items-center justify-between'>
        <div className='flex items-center gap-1 rounded-2xl bg-background/50 p-1 ring-1 ring-border/50'>
          <Button
            size='icon'
            variant='ghost'
            className='h-7 w-7 rounded-xl hover:bg-background'
            onClick={() => onUpdateQuantity(index, item.quantity - 1)}
          >
            <Minus className='h-3' />
          </Button>
          <span className='min-w-[32px] text-center text-xs font-black'>
            {item.quantity}
          </span>
          <Button
            size='icon'
            variant='ghost'
            className='h-7 w-7 rounded-xl hover:bg-background'
            onClick={() => onUpdateQuantity(index, item.quantity + 1)}
          >
            <Plus className='h-3 w-3' />
          </Button>
        </div>
        <span className='text-sm font-black text-orange-600 dark:text-orange-400'>
          {formatCurrency(item.lineTotal)}
        </span>
      </div>

      {/* Meta info if exists */}
      {(item.selectedProperties.length > 0 || item.notes) && (
        <div className='mt-3 space-y-2 border-t border-orange-500/5 pt-3 text-[10px] font-bold text-muted-foreground uppercase'>
          {item.selectedProperties.map((p) => (
            <div key={p.id} className='flex justify-between'>
              <span>+ {p.name}</span>
              <span className='text-foreground'>{formatCurrency(p.price)}</span>
            </div>
          ))}
          {item.notes && (
            <div className='rounded-xl bg-orange-500/5 px-3 py-2 text-orange-600 normal-case italic'>
              "{item.notes}"
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
