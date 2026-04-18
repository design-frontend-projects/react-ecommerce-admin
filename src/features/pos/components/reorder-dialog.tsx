import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { History, Plus, Loader2, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuth, useUser } from '@clerk/clerk-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useBasket } from '../store/use-basket'
import { createRefund } from '../data/refund-api'
import { ManagerAuthDialog } from './manager-auth-dialog'

type RecentTransaction = {
  id: string
  transaction_number: string
  total_amount: number | string
  created_at: string
  transaction_details: Array<{
    product_id: number
    quantity: number | string
    unit_price: number | string
    products: {
      name: string | null
      sku: string | null
      barcode: string | null
    } | null
  }>
}

export function ReorderDialog() {
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [refundingTx, setRefundingTx] = useState<RecentTransaction | null>(
    null
  )
  
  const { setBasketItems } = useBasket()
  const { userId } = useAuth()
  const { user: clerkUser } = useUser()
  const queryClient = useQueryClient()

  const { data: recentTransactions, isLoading } = useQuery<RecentTransaction[]>({
    queryKey: ['recent-pos-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          `
          id,
          transaction_number,
          total_amount,
          created_at,
          transaction_details (
            product_id,
            quantity,
            unit_price,
            products (
              name,
              sku,
              barcode
            )
          )
        `
        )
        .eq('transaction_type', 'sale')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    },
    enabled: open,
  })

  const handleReorder = (transaction: RecentTransaction) => {
    const newItems = transaction.transaction_details.map((d) => {
      const up = Number(d.unit_price)
      const qty = Number(d.quantity)
      return {
        productId: d.product_id,
        name: d.products?.name || 'Unknown Product',
        sku: d.products?.sku || 'N/A',
        barcode: d.products?.barcode || null,
        unitPrice: up,
        quantity: qty,
        subtotal: up * qty,
        total: up * qty,
      }
    })

    setBasketItems(newItems)
    setOpen(false)
  }

  const refundMutation = useMutation({
    mutationFn: (tx: RecentTransaction) =>
      createRefund({
        saleId: tx.id,
        refundAmount: Number(tx.total_amount),
        reason: 'Fast Refund',
        processedBy: userId ?? '',
        notes: 'Fast refund triggered beside reorder button.',
        orderId: tx.transaction_number,
        clerk_user_id: clerkUser?.id as string,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['shift-dashboard-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['recent-pos-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] })
      toast.success('Fast refund processed successfully.')
      setRefundingTx(null)
    },
    onError: (err: Error) => {
      toast.error('Failed to process fast refund: ' + err.message)
      setRefundingTx(null)
    },
  })

  const handleFastRefund = (tx: RecentTransaction) => {
    setRefundingTx(tx)
    setAuthOpen(true)
  }

  const handleManagerApproved = () => {
    if (refundingTx) {
      refundMutation.mutate(refundingTx)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' className='w-full'>
          <History className='mr-2 h-4 w-4' />
          Recent Orders
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Recent Orders</DialogTitle>
        </DialogHeader>

        <div className='max-h-[60vh] overflow-y-auto py-4'>
          {isLoading ? (
            <div className='flex justify-center p-8'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : recentTransactions?.length === 0 ? (
            <div className='py-8 text-center text-muted-foreground'>
              No recent orders found.
            </div>
          ) : (
            <div className='space-y-3'>
              {recentTransactions?.map((tx) => (
                <div
                  key={tx.id}
                  className='flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30'
                >
                  <div className='min-w-0'>
                    <div className='text-sm font-medium'>
                      {tx.transaction_number}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='font-bold'>
                      {formatCurrency(Number(tx.total_amount))}
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button size='sm' variant='destructive' onClick={() => handleFastRefund(tx)} disabled={refundMutation.isPending && refundingTx?.id === tx.id}>
                        {refundMutation.isPending && refundingTx?.id === tx.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RotateCcw className='mr-1 h-4 w-4' />}
                        Refund
                      </Button>
                      <Button size='sm' onClick={() => handleReorder(tx)}>
                        <Plus className='mr-1 h-4 w-4' />
                        Reorder
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
      <ManagerAuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={handleManagerApproved}
        isLoading={refundMutation.isPending}
      />
    </Dialog>
  )
}
