import { useTranslation } from 'react-i18next'
import { PackagePlus, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { useStockBalancesContext } from './stock-balances-provider'

export function StockBalancesPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = useStockBalancesContext()
  const { has } = useAuth()

  const canManage =
    has({ permission: 'inventory.stock.manage' }) ||
    has({ role: 'super_admin' }) ||
    has({ role: 'admin' })

  if (!canManage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant='outline' disabled className='space-x-1 cursor-not-allowed opacity-75'>
              <ShieldAlert className='mr-2 h-4 w-4 text-muted-foreground' />
              Read-Only Access
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Requires inventory.stock.manage permission to adjust inventory.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className='flex items-center gap-2'>
      <Button
        className='space-x-1 shadow-xs'
        onClick={() => {
          setCurrentRow(null)
          setOpen('adjust')
        }}
      >
        <PackagePlus className='mr-2 h-4 w-4' />
        {t('stockBalances.buttons.newAdjustment', 'New Stock Adjustment')}
      </Button>
    </div>
  )
}
