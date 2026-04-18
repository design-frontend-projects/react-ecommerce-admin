import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useUpdateTableStatus } from '../api/mutations'
import {
  useActiveOrderByTable,
  useFloors,
  useOpenDeliveryOrders,
  useTables,
} from '../api/queries'
import { CheckoutDialog } from '../components/checkout-dialog'
import { FloorManagerView } from '../components/floor-manager-view'
import { formatCurrency } from '../lib/formatters'
import { Button } from '@/components/ui/button'
import { type ResOrderWithDetails, type ResTable } from '../types'

export default function CashierCheckout() {
  const { has, isLoaded, isSignedIn } = useAuth()
  const [checkoutMode, setCheckoutMode] = useState<'table' | 'delivery'>('table')
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<ResTable | null>(null)
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] =
    useState<ResOrderWithDetails | null>(null)

  // Queries
  const { data: floors, isLoading: floorsLoading } = useFloors()
  const { data: tables, isLoading: tablesLoading } = useTables()
  const { mutate: updateTableStatus } = useUpdateTableStatus()
  const { data: deliveryOrders, isLoading: deliveryLoading } =
    useOpenDeliveryOrders()

  // Fetch active order for selected table
  const {
    data: activeOrder,
    isLoading: orderLoading,
    isFetching: orderFetching,
  } = useActiveOrderByTable(
    checkoutMode === 'table' ? (selectedTable?.id ?? '') : ''
  )

  // Handle table selection
  const handleTableSelect = (table: ResTable) => {
    if (checkoutMode !== 'table') return

    if (table.status !== 'occupied') {
      if (table.status === 'free') {
        toast.info('This table is free.')
        return
      }
    }

    setSelectedTable(table)
  }

  // Check for invalid table state (occupied but no order)
  useEffect(() => {
    if (checkoutMode !== 'table') return
    if (selectedTable && !activeOrder && !orderLoading && !orderFetching) {
      toast.error('No active order found for this table.')
      setTimeout(() => setSelectedTable(null), 0)
    }
  }, [checkoutMode, selectedTable, activeOrder, orderLoading, orderFetching])

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      if (checkoutMode === 'table') {
        setSelectedTable(null)
      } else {
        setSelectedDeliveryOrder(null)
      }
    }
  }

  // Handle checkout success
  const handleCheckoutSuccess = () => {
    if (checkoutMode === 'table' && selectedTable) {
      updateTableStatus(
        { tableId: selectedTable.id, status: 'free' },
        {
          onSuccess: () => {
            toast.success(`Table ${selectedTable.table_number} is now free`)
          },
          onError: () => {
            toast.error('Failed to update table status')
          },
        }
      )
    }

    if (checkoutMode === 'delivery') {
      setSelectedDeliveryOrder(null)
    }
  }

  const checkoutOrder =
    checkoutMode === 'table' ? (activeOrder ?? null) : selectedDeliveryOrder

  // Loading state
  const isLoading = floorsLoading || tablesLoading || !isLoaded

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  // Auth check
  if (isLoaded && isSignedIn) {
    const hasAccess =
      has({ role: 'cashier' }) ||
      has({ role: 'admin' }) ||
      has({ role: 'org:super_admin' }) ||
      has({ role: 'super_admin' }) // Added super_admin as role too just in case

    if (!hasAccess) {
      return (
        <div className='flex h-full flex-col items-center justify-center gap-4 text-center'>
          <ShieldAlert className='h-16 w-16 text-destructive' />
          <h2 className='text-2xl font-bold'>Access Restricted</h2>
          <p className='text-muted-foreground'>
            This area is for Cashiers and Admins only.
          </p>
        </div>
      )
    }
  }

  return (
    <>
      <div className='flex h-full flex-col gap-4 p-4'>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant={checkoutMode === 'table' ? 'default' : 'outline'}
            onClick={() => {
              setCheckoutMode('table')
              setSelectedDeliveryOrder(null)
            }}
          >
            Table Orders
          </Button>
          <Button
            type='button'
            variant={checkoutMode === 'delivery' ? 'default' : 'outline'}
            onClick={() => {
              setCheckoutMode('delivery')
              setSelectedTable(null)
            }}
          >
            Delivery Orders
          </Button>
        </div>

        {checkoutMode === 'table' ? (
          <FloorManagerView
            floors={floors || []}
            tables={tables || []}
            selectedFloorId={selectedFloorId}
            onSelectFloor={setSelectedFloorId}
            onSelectTable={handleTableSelect}
          />
        ) : (
          <div className='rounded-lg border bg-card p-4'>
            <h3 className='mb-3 text-sm font-semibold tracking-wide uppercase text-muted-foreground'>
              Open Delivery Orders
            </h3>

            {deliveryLoading ? (
              <div className='flex items-center justify-center py-10'>
                <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
              </div>
            ) : !deliveryOrders || deliveryOrders.length === 0 ? (
              <p className='py-8 text-center text-sm text-muted-foreground'>
                No open delivery orders found.
              </p>
            ) : (
              <div className='space-y-3'>
                {deliveryOrders.map((order) => (
                  <button
                    key={order.id}
                    type='button'
                    className='w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40'
                    onClick={() => setSelectedDeliveryOrder(order)}
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-semibold'>#{order.order_number}</span>
                      <span className='text-sm font-semibold text-orange-600'>
                        {formatCurrency(order.total_amount || 0)}
                      </span>
                    </div>
                    <div className='mt-1 text-xs text-muted-foreground'>
                      {order.items?.length || 0} items • {order.status}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CheckoutDialog
        open={!!checkoutOrder}
        onOpenChange={handleDialogClose}
        order={checkoutOrder || null}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Loading overlay for order fetch */}
      {checkoutMode === 'table' &&
        (orderLoading || orderFetching) &&
        selectedTable && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm'>
          <Loader2 className='h-10 w-10 animate-spin text-white' />
        </div>
      )}
    </>
  )
}
