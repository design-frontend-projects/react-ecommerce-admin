import { createFileRoute } from '@tanstack/react-router'
import { ShipmentsList } from '@/features/pos'

export const Route = createFileRoute('/_authenticated/respos/shipments')({
  component: ShipmentsPage,
})

function ShipmentsPage() {
  return (
    <div className='mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8 space-y-6'>
      <ShipmentsList />
    </div>
  )
}

