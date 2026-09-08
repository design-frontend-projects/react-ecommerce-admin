import { useTranslation } from 'react-i18next'
import { Check, Edit, Minus, Radio } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useChannelsContext } from './channels-provider'

export function ChannelViewDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useChannelsContext()
  const isOpen = open === 'view'

  if (!currentRow) return null

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && setOpen(null)}>
      <DialogContent className='max-w-md sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Radio className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-xl'>
                {currentRow.name}
              </DialogTitle>
              <DialogDescription>
                {t('channels.view.subtitle', { defaultValue: 'Channel specifications and details.' })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='space-y-4 py-2 text-sm'>
          <div className='flex items-center justify-between rounded-lg border bg-muted/40 p-3'>
            <div>
              <span className='text-xs text-muted-foreground uppercase tracking-wider block font-semibold'>
                {t('channels.fields.code', { defaultValue: 'Channel Code' })}
              </span>
              <span className='font-mono text-base font-bold text-foreground'>
                {currentRow.code}
              </span>
            </div>
            <Badge
              variant={currentRow.is_active ? 'default' : 'secondary'}
              className={
                currentRow.is_active
                  ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20'
                  : 'text-muted-foreground'
              }
            >
              {currentRow.is_active ? (
                <Check className='mr-1 h-3 w-3' />
              ) : (
                <Minus className='mr-1 h-3 w-3' />
              )}
              {currentRow.is_active
                ? t('common.active', { defaultValue: 'Active' })
                : t('common.inactive', { defaultValue: 'Inactive' })}
            </Badge>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <span className='text-xs text-muted-foreground font-semibold block mb-1'>
                {t('channels.fields.name', { defaultValue: 'English Name' })}
              </span>
              <span className='font-medium text-foreground'>{currentRow.name}</span>
            </div>
            <div>
              <span className='text-xs text-muted-foreground font-semibold block mb-1'>
                {t('channels.fields.nameAr', { defaultValue: 'Arabic Name' })}
              </span>
              <span dir='rtl' className='font-medium text-foreground block'>
                {currentRow.name_ar || '—'}
              </span>
            </div>
          </div>

          <Separator />

          <div>
            <span className='text-xs text-muted-foreground font-semibold block mb-1'>
              {t('channels.fields.description', { defaultValue: 'Description' })}
            </span>
            <p className='text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/20 p-2.5 text-xs sm:text-sm'>
              {currentRow.description || (
                <span className='italic'>
                  {t('common.noDescription', { defaultValue: 'No description provided.' })}
                </span>
              )}
            </p>
          </div>

          <Separator />

          <div className='grid grid-cols-2 gap-4 text-xs text-muted-foreground'>
            <div>
              <span className='font-semibold block text-foreground/70 mb-0.5'>
                {t('common.created', { defaultValue: 'Created' })}
              </span>
              {currentRow.created_at
                ? new Date(currentRow.created_at).toLocaleString()
                : '—'}
            </div>
            <div>
              <span className='font-semibold block text-foreground/70 mb-0.5'>
                {t('common.updated', { defaultValue: 'Last Updated' })}
              </span>
              {currentRow.updated_at
                ? new Date(currentRow.updated_at).toLocaleString()
                : '—'}
            </div>
          </div>

          <div className='rounded-md border bg-muted/20 p-2 text-xs font-mono text-muted-foreground truncate'>
            <span className='font-semibold select-none'>ID: </span>
            {currentRow.id}
          </div>
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            variant='outline'
            onClick={() => setOpen(null)}
          >
            {t('common.close', { defaultValue: 'Close' })}
          </Button>
          <Button
            onClick={() => {
              setOpen('update')
            }}
          >
            <Edit className='mr-2 h-4 w-4' />
            {t('common.edit', { defaultValue: 'Edit Channel' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
