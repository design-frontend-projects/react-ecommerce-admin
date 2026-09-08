import { type CellContext } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, History, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import type { StockBalanceRow } from '../data/schema'
import { useStockBalancesContext } from './stock-balances-provider'

export function StockBalancesRowActions({
  row,
}: CellContext<StockBalanceRow, unknown>) {
  const { setOpen, setCurrentRow } = useStockBalancesContext()
  const { has } = useAuth()
  const [copied, setCopied] = useState(false)

  const canManage =
    has({ permission: 'inventory.stock.manage' }) ||
    has({ role: 'super_admin' }) ||
    has({ role: 'admin' })

  const handleCopySku = () => {
    const sku = row.original.product_variants?.sku
    if (sku) {
      navigator.clipboard.writeText(sku)
      setCopied(true)
      toast.success(`Copied SKU "${sku}" to clipboard`)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0'>
          <span className='sr-only'>Open menu</span>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        {canManage && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('adjust')
            }}
          >
            <Pencil className='mr-2 h-4 w-4 text-primary' />
            Adjust Stock
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original)
            setOpen('movements')
          }}
        >
          <History className='mr-2 h-4 w-4 text-muted-foreground' />
          View Movements
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCopySku}>
          {copied ? (
            <Check className='mr-2 h-4 w-4 text-emerald-600' />
          ) : (
            <Copy className='mr-2 h-4 w-4 text-muted-foreground' />
          )}
          Copy SKU
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
