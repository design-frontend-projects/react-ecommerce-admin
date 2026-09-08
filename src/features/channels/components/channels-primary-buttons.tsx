import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChannelsContext } from './channels-provider'

export function ChannelsPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = useChannelsContext()

  return (
    <div className='flex items-center gap-2'>
      <Button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
        className='space-x-1'
      >
        <Plus className='h-4 w-4' />
        <span>
          {t('channels.actions.addChannel', { defaultValue: 'New Channel' })}
        </span>
      </Button>
    </div>
  )
}
