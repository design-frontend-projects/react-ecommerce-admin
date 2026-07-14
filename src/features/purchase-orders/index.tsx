import { Main } from '@/components/layout/main'
import { useProducts } from '../products/hooks/use-products'
import { PODialogs } from './components/po-dialogs'
import { POPrimaryButtons } from './components/po-primary-buttons'
import { POProvider } from './components/po-provider'
import { POReorderAlerts } from './components/po-reorder-alerts'
import { POTable } from './components/po-table'
import { usePurchaseOrders } from './hooks/use-purchase-orders'

export function PurchaseOrders() {
  return (
    <POProvider>
      <PurchaseOrdersContent />
    </POProvider>
  )
}

function PurchaseOrdersContent() {
  const { data: purchaseOrders, isLoading, error } = usePurchaseOrders()
  // Warm products + variants query cache before opening PO dialogs.
  useProducts()

  return (
    <Main>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-x-4'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Purchase Orders</h2>
          <p className='text-muted-foreground'>
            Manage purchase orders, receive shipments, and track inventory
            replenishment.
          </p>
        </div>
        <POPrimaryButtons />
      </div>

      <POReorderAlerts />

      <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
        {isLoading && (
          <div className='py-12 text-center text-muted-foreground'>
            Loading purchase orders...
          </div>
        )}
        {error && (
          <div className='py-12 text-center text-destructive'>
            Failed to load purchase orders: {(error as Error).message}
          </div>
        )}
        {purchaseOrders && <POTable data={purchaseOrders} />}
      </div>

      <PODialogs />
    </Main>
  )
}
