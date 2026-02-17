import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useUpdateTableStatus } from '../api/mutations'
import { useActiveOrderByTable, useFloors, useTables } from '../api/queries'
import { CheckoutDialog } from '../components/checkout-dialog'
import { FloorManagerView } from '../components/floor-manager-view'
import { type ResTable } from '../types'

export default function CashierCheckout() {
  const { has, isLoaded, isSignedIn } = useAuth()
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<ResTable | null>(null)

  // Queries
  const { data: floors, isLoading: floorsLoading } = useFloors()
  const { data: tables, isLoading: tablesLoading } = useTables()
  const { mutate: updateTableStatus } = useUpdateTableStatus()

  // Fetch active order for selected table
  const {
    data: activeOrder,
    isLoading: orderLoading,
    isFetching: orderFetching,
  } = useActiveOrderByTable(selectedTable?.id || '')

  // Handle table selection
  const handleTableSelect = (table: ResTable) => {
    if (table.status !== 'occupied') {
      // Option: allow checking out "active" tables even if not strictly "occupied" if they have an order?
      // But for now, restrict to occupied tables as per requirement implying "served orders"
      // Also might want to allow "dirty" tables? No, dirty means it needs cleaning.
      // User said: "with served orders".
      if (table.status === 'free') {
        toast.info('This table is free.')
        return
      }
    }

    setSelectedTable(table)
  }

  // Check for invalid table state (occupied but no order)
  useEffect(() => {
    if (selectedTable && !activeOrder && !orderLoading && !orderFetching) {
      // Table is occupied but no active order found?
      toast.error('No active order found for this table.')
      setTimeout(() => setSelectedTable(null), 0) // Reset selection
    }
  }, [selectedTable, activeOrder, orderLoading, orderFetching])

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSelectedTable(null)
    }
  }

  // Handle checkout success
  const handleCheckoutSuccess = () => {
    if (selectedTable) {
      // Set table to free
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
  }

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
      <FloorManagerView
        floors={floors || []}
        tables={tables || []}
        selectedFloorId={selectedFloorId}
        onSelectFloor={setSelectedFloorId}
        onSelectTable={handleTableSelect}
      />

      <CheckoutDialog
        open={!!selectedTable && !!activeOrder}
        onOpenChange={handleDialogClose}
        order={activeOrder || null}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Loading overlay for order fetch */}
      {(orderLoading || orderFetching) && selectedTable && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm'>
          <Loader2 className='h-10 w-10 animate-spin text-white' />
        </div>
      )}
    </>
  )
}
