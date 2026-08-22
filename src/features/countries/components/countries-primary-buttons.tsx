import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCountriesDialog } from './countries-provider'

export function CountriesPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen } = useCountriesDialog()

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='default'
        size='sm'
        className='h-8'
        onClick={() => setOpen('add')}
      >
        <Plus className='mr-2 h-4 w-4' />
        Add Country
      </Button>
    </div>
  )
}
