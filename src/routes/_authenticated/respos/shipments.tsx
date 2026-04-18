import { createFileRoute } from '@tanstack/react-router'
import { ShipmentsList } from '@/features/pos'

export const Route = createFileRoute('/_authenticated/respos/shipments')({
  component: ShipmentsPage,
})

function ShipmentsPage() {
  return (
    <div className='mx-auto w-full max-w-[1400px]'>
      <ShipmentsList />
    </div>
  )
}
