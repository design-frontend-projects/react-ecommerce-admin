import { CustomerActionDialog } from './customer-action-dialog'
import { CustomerDeleteDialog } from './customer-delete-dialog'
import CustomerGroupsProvider from '@/features/customer-groups/components/customer-groups-provider'
import { CustomerGroupsActionDialog } from '@/features/customer-groups/components/customer-groups-action-dialog'

export function CustomersDialogs() {
  return (
    <CustomerGroupsProvider>
      <CustomerActionDialog />
      <CustomerDeleteDialog />
      <CustomerGroupsActionDialog />
    </CustomerGroupsProvider>
  )
}
