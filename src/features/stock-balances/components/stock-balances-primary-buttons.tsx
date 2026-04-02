import { PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStockBalancesContext } from './stock-balances-provider'

export function StockBalancesPrimaryButtons() {
  const { setOpen, setCurrentRow } = useStockBalancesContext()

  return (
    <div className='flex gap-2'>
      <Button
        className='space-x-1'
        onClick={() => {
          setCurrentRow(null)
          setOpen('adjust')
        }}
      >
        <PackagePlus className='mr-2 h-4 w-4' />
        New Adjustment
      </Button>
    </div>
  )
}
