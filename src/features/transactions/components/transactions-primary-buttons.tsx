import { useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useTransactionsContext } from './transactions-provider'

export function TransactionsPrimaryButtons() {
  const { t } = useTranslation()
  const { setIsCreateOpen } = useTransactionsContext()
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['financial-transactions'] })
    toast.success('Ledger refreshed')
  }

  return (
    <div className='flex items-center space-x-2'>
      <Button
        variant='outline'
        size='sm'
        className='h-8 text-xs'
        onClick={handleRefresh}
      >
        <RefreshCw className='mr-1.5 h-3.5 w-3.5' />
        {t('common.refresh', 'Refresh')}
      </Button>

      <Button
        size='sm'
        className='h-8 text-xs'
        onClick={() => setIsCreateOpen(true)}
      >
        <Plus className='mr-1.5 h-3.5 w-3.5' />
        {t('transactions.newTransaction', 'New Transaction')}
      </Button>
    </div>
  )
}
