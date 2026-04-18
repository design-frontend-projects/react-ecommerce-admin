import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCheck,
  Clock3,
  Loader2,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  Phone,
  Truck,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getPosShipments, updatePosShipmentStatus } from '../data/api'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'

type PosShipment = {
  id: string
  order_id: string
  recipient_name: string
  recipient_phone: string
  delivery_address: string
  city: string
  state: string
  postal_code: string
  status: string
  created_at: string
}

function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace(/\s+/g, '_')
}

function getStatusConfig(status: string): {
  label: string
  variant: BadgeVariant
  dotClassName: string
  isApproved: boolean
} {
  const normalizedStatus = normalizeStatus(status)

  if (normalizedStatus === 'delivered') {
    return {
      label: 'Delivered',
      variant: 'default',
      dotClassName: 'bg-primary',
      isApproved: true,
    }
  }

  if (
    normalizedStatus === 'approved' ||
    normalizedStatus === 'shipped' ||
    normalizedStatus === 'in_transit'
  ) {
    return {
      label: 'Approved',
      variant: 'secondary',
      dotClassName: 'bg-emerald-500',
      isApproved: true,
    }
  }

  if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed') {
    return {
      label: 'Cancelled',
      variant: 'destructive',
      dotClassName: 'bg-destructive',
      isApproved: false,
    }
  }

  return {
    label: 'Pending',
    variant: 'outline',
    dotClassName: 'bg-amber-500',
    isApproved: false,
  }
}

function formatShipmentDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return format(date, 'MMM dd, HH:mm')
}

export function ShipmentsList() {
  const queryClient = useQueryClient()

  const { data: shipments, isLoading } = useQuery<PosShipment[]>({
    queryKey: ['pos-shipments'],
    queryFn: getPosShipments,
  })

  const {
    mutate: approveShipment,
    isPending: isApproving,
    variables: approvingShipmentId,
  } = useMutation({
    mutationFn: (shipmentId: string) =>
      updatePosShipmentStatus(shipmentId, 'approved'),
    onMutate: async (shipmentId) => {
      await queryClient.cancelQueries({ queryKey: ['pos-shipments'] })

      const previousShipments =
        queryClient.getQueryData<PosShipment[]>(['pos-shipments']) ?? []

      queryClient.setQueryData<PosShipment[]>(['pos-shipments'], (current) =>
        (current ?? []).map((shipment) =>
          shipment.id === shipmentId
            ? { ...shipment, status: 'approved' }
            : shipment
        )
      )

      return { previousShipments }
    },
    onError: (_error, _shipmentId, context) => {
      if (context?.previousShipments) {
        queryClient.setQueryData(['pos-shipments'], context.previousShipments)
      }

      toast.error('Failed to approve shipment')
    },
    onSuccess: () => {
      toast.success('Shipment approved successfully')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['pos-shipments'] })
    },
  })

  const shipmentsData = shipments ?? []
  const totalShipments = shipmentsData.length
  const pendingShipments = shipmentsData.filter((shipment) => {
    const normalizedStatus = normalizeStatus(shipment.status)
    return normalizedStatus === 'pending' || normalizedStatus === 'prepared'
  }).length
  const approvedShipments = shipmentsData.filter(
    (shipment) => getStatusConfig(shipment.status).isApproved
  ).length

  if (isLoading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <Loader2 className='size-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='flex flex-col gap-1'>
          <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
            <Truck className='size-8 text-primary' />
            Shipments
          </h1>
          <p className='text-sm text-muted-foreground'>
            Review delivery requests and approve each shipment before dispatch.
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline'>Total: {totalShipments}</Badge>
          <Badge variant='outline'>Pending: {pendingShipments}</Badge>
          <Badge variant='secondary'>Approved: {approvedShipments}</Badge>
        </div>
      </div>

      <Card className='overflow-hidden'>
        <CardHeader className='border-b bg-muted/30'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <PackageCheck className='size-4 text-primary' />
            Delivery Queue
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className='w-[56px] text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipmentsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-28 text-center'>
                    <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                      <Truck className='size-5' />
                      <span className='text-sm'>No shipments found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                shipmentsData.map((shipment) => {
                  const statusConfig = getStatusConfig(shipment.status)
                  const isApprovingCurrentRow =
                    isApproving && approvingShipmentId === shipment.id

                  return (
                    <TableRow key={shipment.id}>
                      <TableCell className='font-mono text-xs text-muted-foreground'>
                        {shipment.order_id?.slice(0, 8) || '--'}...
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col gap-0.5'>
                          <span className='flex items-center gap-1.5 font-medium'>
                            <User className='size-3.5 text-muted-foreground' />
                            {shipment.recipient_name}
                          </span>
                          <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                            <Phone className='size-3.5' />
                            {shipment.recipient_phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex max-w-[260px] flex-col gap-0.5'>
                          <span className='flex items-start gap-1.5 text-sm'>
                            <MapPin className='mt-0.5 size-3.5 shrink-0 text-muted-foreground' />
                            <span className='truncate'>
                              {shipment.delivery_address}
                            </span>
                          </span>
                          <span className='text-xs text-muted-foreground'>
                            {shipment.city}, {shipment.state}{' '}
                            {shipment.postal_code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              statusConfig.dotClassName
                            )}
                          />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        <span className='inline-flex items-center gap-1.5'>
                          <Clock3 className='size-3.5' />
                          {formatShipmentDate(shipment.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className='text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              className='h-8 w-8 p-0 data-[state=open]:bg-muted'
                            >
                              <MoreHorizontal className='size-4' />
                              <span className='sr-only'>
                                Open shipment actions
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-44'>
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                disabled={
                                  statusConfig.isApproved ||
                                  isApprovingCurrentRow
                                }
                                onClick={() => approveShipment(shipment.id)}
                              >
                                {isApprovingCurrentRow ? (
                                  <Loader2 className='size-3.5 animate-spin text-muted-foreground' />
                                ) : (
                                  <CheckCheck className='size-3.5 text-muted-foreground' />
                                )}
                                {statusConfig.isApproved
                                  ? 'Already approved'
                                  : 'Approve shipment'}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
