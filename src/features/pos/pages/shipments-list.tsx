import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCheck,
  Clock3,
  Eye,
  Loader2,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  Phone,
  RefreshCw,
  RotateCcw,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getPosShipmentDetails,
  getPosShipments,
  updatePosShipmentStatus,
  type PosShipmentDetail,
} from '../data/api'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'
type ShipmentFilter = 'all' | 'pending' | 'approved' | 'delivered' | 'cancelled'
type ShipmentBucket = Exclude<ShipmentFilter, 'all'> | 'other'

type PosShipment = {
  id: string
  order_id: string
  recipient_name: string
  recipient_phone: string
  delivery_address: string
  city?: string | null
  state?: string | null
  postal_code?: string | null
  status: string
  tracking_number?: string | null
  carrier?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  notes?: string | null
  created_at: string
}

type ShipmentStatusUpdateInput = {
  shipmentId: string
  nextStatus: string
  actionLabel: string
}

const SHIPMENTS_QUERY_KEY = ['pos-shipments'] as const
const shipmentDetailQueryKey = (shipmentId: string) =>
  ['pos-shipment-details', shipmentId] as const

const STATUS_ACTIONS: Array<{
  label: string
  status: string
  icon: typeof CheckCheck
  destructive?: boolean
}> = [
  { label: 'Approve', status: 'approved', icon: CheckCheck },
  { label: 'Mark In Transit', status: 'in_transit', icon: Truck },
  { label: 'Mark Delivered', status: 'delivered', icon: PackageCheck },
  {
    label: 'Cancel Shipment',
    status: 'cancelled',
    icon: XCircle,
    destructive: true,
  },
  { label: 'Revert to Pending', status: 'pending', icon: RotateCcw },
]

function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace(/\s+/g, '_')
}

function getShipmentBucket(status: string): ShipmentBucket {
  const normalizedStatus = normalizeStatus(status)

  if (normalizedStatus === 'delivered') return 'delivered'

  if (
    normalizedStatus === 'approved' ||
    normalizedStatus === 'shipped' ||
    normalizedStatus === 'in_transit'
  ) {
    return 'approved'
  }

  if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed') {
    return 'cancelled'
  }

  if (normalizedStatus === 'pending' || normalizedStatus === 'prepared') {
    return 'pending'
  }

  return 'other'
}

function toTitleCase(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

function getStatusConfig(status: string): {
  label: string
  variant: BadgeVariant
  icon: typeof Clock3
} {
  const normalizedStatus = normalizeStatus(status)

  if (normalizedStatus === 'delivered') {
    return {
      label: 'Delivered',
      variant: 'default',
      icon: PackageCheck,
    }
  }

  if (normalizedStatus === 'approved') {
    return {
      label: 'Approved',
      variant: 'secondary',
      icon: CheckCheck,
    }
  }

  if (normalizedStatus === 'shipped' || normalizedStatus === 'in_transit') {
    return {
      label: 'In Transit',
      variant: 'secondary',
      icon: Truck,
    }
  }

  if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed') {
    return {
      label: 'Cancelled',
      variant: 'destructive',
      icon: XCircle,
    }
  }

  if (normalizedStatus === 'pending' || normalizedStatus === 'prepared') {
    return {
      label: 'Pending',
      variant: 'outline',
      icon: Clock3,
    }
  }

  return {
    label: toTitleCase(normalizedStatus) || 'Pending',
    variant: 'outline',
    icon: Clock3,
  }
}

function getOrderStatusVariant(status?: string | null): BadgeVariant {
  const normalizedStatus = normalizeStatus(status || 'pending')

  if (normalizedStatus === 'paid') return 'default'
  if (normalizedStatus === 'ready') return 'secondary'
  if (normalizedStatus === 'cancelled' || normalizedStatus === 'void') {
    return 'destructive'
  }
  return 'outline'
}

function getItemStatusVariant(status?: string | null): BadgeVariant {
  const normalizedStatus = normalizeStatus(status || 'pending')

  if (normalizedStatus === 'served' || normalizedStatus === 'ready') {
    return 'secondary'
  }
  if (normalizedStatus === 'cancelled' || normalizedStatus === 'void') {
    return 'destructive'
  }
  return 'outline'
}

function formatShipmentDate(value?: string | null) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return format(date, 'MMM dd, HH:mm')
}

function isStatusActionDisabled(currentStatus: string, nextStatus: string) {
  const current = normalizeStatus(currentStatus)
  const target = normalizeStatus(nextStatus)

  if (current === target) return true

  if (target === 'approved') {
    return !['pending', 'prepared'].includes(current)
  }

  if (target === 'in_transit') {
    return !['pending', 'prepared', 'approved'].includes(current)
  }

  if (target === 'delivered') {
    return !['approved', 'in_transit', 'shipped'].includes(current)
  }

  if (target === 'cancelled') {
    return ['cancelled', 'delivered', 'failed'].includes(current)
  }

  if (target === 'pending') {
    return !['approved', 'in_transit', 'shipped'].includes(current)
  }

  return false
}

function parsePropertiesLabel(properties: unknown) {
  if (!Array.isArray(properties) || properties.length === 0) return '--'

  const names = properties
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return ''
      const candidate = (entry as { name?: unknown }).name
      return typeof candidate === 'string' ? candidate : ''
    })
    .filter(Boolean)

  return names.length > 0 ? names.join(', ') : '--'
}

export function ShipmentsList() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ShipmentFilter>('all')
  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)

  const {
    data: shipments,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery<PosShipment[]>({
    queryKey: SHIPMENTS_QUERY_KEY,
    queryFn: getPosShipments,
  })

  const {
    data: shipmentDetail,
    error: shipmentDetailError,
    isError: isShipmentDetailError,
    isFetching: isShipmentDetailFetching,
    isLoading: isShipmentDetailLoading,
    refetch: refetchShipmentDetail,
  } = useQuery<PosShipmentDetail>({
    queryKey: ['pos-shipment-details', activeShipmentId] as const,
    queryFn: ({ queryKey }) => getPosShipmentDetails(queryKey[1] as string),
    enabled: isViewOpen && !!activeShipmentId,
  })

  const {
    mutate: updateShipmentStatus,
    isPending: isUpdatingStatus,
    variables: updatingStatusVars,
  } = useMutation({
    mutationFn: ({ shipmentId, nextStatus }: ShipmentStatusUpdateInput) =>
      updatePosShipmentStatus(shipmentId, nextStatus),
    onMutate: async ({ shipmentId, nextStatus }) => {
      await queryClient.cancelQueries({ queryKey: SHIPMENTS_QUERY_KEY })

      const previousShipments =
        queryClient.getQueryData<PosShipment[]>(SHIPMENTS_QUERY_KEY) ?? []

      queryClient.setQueryData<PosShipment[]>(SHIPMENTS_QUERY_KEY, (current) =>
        (current ?? []).map((shipment) =>
          shipment.id === shipmentId
            ? { ...shipment, status: nextStatus }
            : shipment
        )
      )

      return { previousShipments }
    },
    onError: (_error, variables, context) => {
      if (context?.previousShipments) {
        queryClient.setQueryData(SHIPMENTS_QUERY_KEY, context.previousShipments)
      }

      toast.error(`Failed to ${variables.actionLabel.toLowerCase()}`)
    },
    onSuccess: (_data, variables) => {
      toast.success(`${variables.actionLabel} successful`)
    },
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({ queryKey: SHIPMENTS_QUERY_KEY })

      if (
        variables?.shipmentId &&
        activeShipmentId &&
        variables.shipmentId === activeShipmentId
      ) {
        await queryClient.invalidateQueries({
          queryKey: shipmentDetailQueryKey(activeShipmentId),
        })
      }
    },
  })

  const shipmentsData = useMemo(() => shipments ?? [], [shipments])

  const shipmentCounts = useMemo(() => {
    return shipmentsData.reduce(
      (acc, shipment) => {
        const bucket = getShipmentBucket(shipment.status)

        acc.total += 1
        if (bucket === 'pending') acc.pending += 1
        if (bucket === 'approved') acc.approved += 1
        if (bucket === 'delivered') acc.delivered += 1
        if (bucket === 'cancelled') acc.cancelled += 1

        return acc
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        delivered: 0,
        cancelled: 0,
      }
    )
  }, [shipmentsData])

  const filteredShipments = useMemo(() => {
    if (statusFilter === 'all') return shipmentsData
    return shipmentsData.filter(
      (shipment) => getShipmentBucket(shipment.status) === statusFilter
    )
  }, [shipmentsData, statusFilter])

  const filterTabs: Array<{
    value: ShipmentFilter
    label: string
    count: number
  }> = [
    { value: 'all', label: 'All', count: shipmentCounts.total },
    { value: 'pending', label: 'Pending', count: shipmentCounts.pending },
    { value: 'approved', label: 'Approved', count: shipmentCounts.approved },
    { value: 'delivered', label: 'Delivered', count: shipmentCounts.delivered },
    { value: 'cancelled', label: 'Cancelled', count: shipmentCounts.cancelled },
  ]

  const openShipmentDetails = (shipmentId: string) => {
    setActiveShipmentId(shipmentId)
    setIsViewOpen(true)
  }

  const handleStatusAction = (
    shipmentId: string,
    nextStatus: string,
    actionLabel: string
  ) => {
    updateShipmentStatus({ shipmentId, nextStatus, actionLabel })
  }

  if (isLoading) {
    return (
      <div className='flex h-64 flex-col items-center justify-center gap-3'>
        <Loader2 className='size-8 animate-spin text-muted-foreground' />
        <p className='text-sm text-muted-foreground'>
          Loading shipment queue...
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <Card className='gap-4 py-5'>
        <CardHeader>
          <CardTitle className='text-base'>Unable to load shipments</CardTitle>
          <CardDescription>
            We could not fetch the latest delivery queue.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <Alert variant='destructive'>
            <AlertTriangle />
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : 'Please check your connection and try again.'}
            </AlertDescription>
          </Alert>
          <div>
            <Button
              type='button'
              variant='outline'
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 data-icon='inline-start' className='animate-spin' />
              ) : (
                <RefreshCw data-icon='inline-start' />
              )}
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className='flex flex-col gap-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
          <div className='flex flex-col gap-1'>
            <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
              <Truck className='size-8 text-primary' />
              Shipments
            </h1>
            <p className='text-sm text-muted-foreground'>
              Review delivery requests and manage each shipment lifecycle.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline'>Visible: {filteredShipments.length}</Badge>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 data-icon='inline-start' className='animate-spin' />
              ) : (
                <RefreshCw data-icon='inline-start' />
              )}
              Refresh
            </Button>
          </div>
        </div>

        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <Card className='gap-3 py-4'>
            <CardHeader className='px-4 pb-0'>
              <CardDescription>Total Shipments</CardDescription>
              <CardTitle className='text-2xl'>{shipmentCounts.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className='gap-3 py-4'>
            <CardHeader className='px-4 pb-0'>
              <CardDescription>Pending Approval</CardDescription>
              <CardTitle className='text-2xl'>
                {shipmentCounts.pending}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className='gap-3 py-4'>
            <CardHeader className='px-4 pb-0'>
              <CardDescription>In Transit / Approved</CardDescription>
              <CardTitle className='text-2xl'>
                {shipmentCounts.approved}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className='gap-3 py-4'>
            <CardHeader className='px-4 pb-0'>
              <CardDescription>Delivered</CardDescription>
              <CardTitle className='text-2xl'>
                {shipmentCounts.delivered}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className='overflow-hidden'>
          <CardHeader className='border-b bg-muted/30'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <PackageCheck className='size-4 text-primary' />
              Delivery Queue
            </CardTitle>
            <CardDescription>
              Filter by shipment status and run lifecycle actions.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4 p-0'>
            <Tabs
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ShipmentFilter)}
              className='px-4 pt-4 sm:px-6'
            >
              <ScrollArea orientation='horizontal' className='w-full pb-1'>
                <TabsList>
                  {filterTabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                      {tab.label}
                      <Badge variant='outline'>{tab.count}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </Tabs>

            <ScrollArea orientation='horizontal' className='w-full'>
              <Table className='min-w-[960px]'>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[130px]'>Order ID</TableHead>
                    <TableHead className='w-[240px]'>Recipient</TableHead>
                    <TableHead className='w-[320px]'>Address</TableHead>
                    <TableHead className='w-[150px]'>Status</TableHead>
                    <TableHead className='w-[160px]'>Created At</TableHead>
                    <TableHead className='w-[80px] text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className='h-28 text-center'>
                        <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                          <Truck className='size-5' />
                          <span className='text-sm'>
                            No shipments found for this filter.
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShipments.map((shipment) => {
                      const statusConfig = getStatusConfig(shipment.status)
                      const StatusIcon = statusConfig.icon
                      const orderId = shipment.order_id || '--'
                      const isUpdatingCurrentRow =
                        isUpdatingStatus &&
                        updatingStatusVars?.shipmentId === shipment.id

                      return (
                        <TableRow key={shipment.id}>
                          <TableCell className='font-mono text-xs text-muted-foreground'>
                            <span className='inline-block max-w-[100px] truncate'>
                              {orderId}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className='flex flex-col gap-0.5'>
                              <span className='flex items-center gap-1.5 font-medium'>
                                <User className='size-3.5 text-muted-foreground' />
                                {shipment.recipient_name}
                              </span>
                              <a
                                href={`tel:${shipment.recipient_phone}`}
                                className='inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground'
                              >
                                <Phone className='size-3.5' />
                                {shipment.recipient_phone}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='flex max-w-[320px] flex-col gap-0.5'>
                              <span className='flex items-start gap-1.5 text-sm'>
                                <MapPin className='mt-0.5 size-3.5 shrink-0 text-muted-foreground' />
                                <span className='line-clamp-2'>
                                  {shipment.delivery_address}
                                </span>
                              </span>
                              <span className='text-xs text-muted-foreground'>
                                {shipment.city || '--'}, {shipment.state || '--'}{' '}
                                {shipment.postal_code || '--'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig.variant}>
                              <StatusIcon />
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
                                  size='icon'
                                  className='size-8 data-[state=open]:bg-muted'
                                  aria-label='Open shipment actions'
                                >
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end' className='w-52'>
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onClick={() => openShipmentDetails(shipment.id)}
                                  >
                                    <Eye />
                                    View
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  {STATUS_ACTIONS.map((action) => {
                                    const disabled =
                                      isUpdatingCurrentRow ||
                                      isStatusActionDisabled(
                                        shipment.status,
                                        action.status
                                      )

                                    return (
                                      <DropdownMenuItem
                                        key={action.status}
                                        variant={
                                          action.destructive
                                            ? 'destructive'
                                            : 'default'
                                        }
                                        disabled={disabled}
                                        onClick={() =>
                                          handleStatusAction(
                                            shipment.id,
                                            action.status,
                                            action.label
                                          )
                                        }
                                      >
                                        {isUpdatingCurrentRow &&
                                        updatingStatusVars?.nextStatus ===
                                          action.status ? (
                                          <Loader2 className='animate-spin' />
                                        ) : (
                                          <action.icon />
                                        )}
                                        {action.label}
                                      </DropdownMenuItem>
                                    )
                                  })}
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
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={isViewOpen}
        onOpenChange={(open) => {
          setIsViewOpen(open)
          if (!open) {
            setActiveShipmentId(null)
          }
        }}
      >
        <SheetContent side='right' className='w-full sm:max-w-2xl'>
          <SheetHeader className='text-start'>
            <SheetTitle>Shipment Details</SheetTitle>
            <SheetDescription>
              Shipment, order, and item-level status overview.
            </SheetDescription>
          </SheetHeader>

          <div className='mt-4 flex h-[calc(100vh-9rem)] flex-col'>
            {isShipmentDetailLoading || isShipmentDetailFetching ? (
              <div className='flex h-full flex-col items-center justify-center gap-3 text-muted-foreground'>
                <Loader2 className='size-8 animate-spin' />
                <p className='text-sm'>Loading shipment details...</p>
              </div>
            ) : isShipmentDetailError ? (
              <div className='space-y-4'>
                <Alert variant='destructive'>
                  <AlertTriangle />
                  <AlertTitle>Failed to load details</AlertTitle>
                  <AlertDescription>
                    {shipmentDetailError instanceof Error
                      ? shipmentDetailError.message
                      : 'Unable to load shipment details.'}
                  </AlertDescription>
                </Alert>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => void refetchShipmentDetail()}
                >
                  <RefreshCw data-icon='inline-start' />
                  Retry
                </Button>
              </div>
            ) : !shipmentDetail ? (
              <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
                No shipment details found.
              </div>
            ) : (
              <ScrollArea className='h-full pr-4'>
                <div className='space-y-5 pb-8'>
                  <Card>
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-base'>Shipment</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2 text-sm'>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>Shipment ID</span>
                        <span className='font-mono text-xs'>
                          {shipmentDetail.shipment.id}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>Status</span>
                        <Badge
                          variant={
                            getStatusConfig(shipmentDetail.shipment.status).variant
                          }
                        >
                          {getStatusConfig(shipmentDetail.shipment.status).label}
                        </Badge>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>Recipient</span>
                        <span className='font-medium'>
                          {shipmentDetail.shipment.recipient_name}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>Phone</span>
                        <span>{shipmentDetail.shipment.recipient_phone}</span>
                      </div>
                      <div className='space-y-1'>
                        <span className='text-muted-foreground'>Address</span>
                        <p className='text-sm'>
                          {shipmentDetail.shipment.delivery_address}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {shipmentDetail.shipment.city || '--'},{' '}
                          {shipmentDetail.shipment.state || '--'}{' '}
                          {shipmentDetail.shipment.postal_code || '--'}
                        </p>
                      </div>
                      <Separator />
                      <div className='grid gap-2 sm:grid-cols-2'>
                        <div>
                          <p className='text-xs text-muted-foreground'>Tracking</p>
                          <p className='text-sm'>
                            {shipmentDetail.shipment.tracking_number || '--'}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs text-muted-foreground'>Carrier</p>
                          <p className='text-sm'>
                            {shipmentDetail.shipment.carrier || '--'}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs text-muted-foreground'>Created</p>
                          <p className='text-sm'>
                            {formatShipmentDate(shipmentDetail.shipment.created_at)}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs text-muted-foreground'>Shipped</p>
                          <p className='text-sm'>
                            {formatShipmentDate(shipmentDetail.shipment.shipped_at)}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs text-muted-foreground'>Delivered</p>
                          <p className='text-sm'>
                            {formatShipmentDate(shipmentDetail.shipment.delivered_at)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>Notes</p>
                        <p className='text-sm'>
                          {shipmentDetail.shipment.notes || '--'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-base'>Order</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2 text-sm'>
                      {shipmentDetail.order ? (
                        <>
                          <div className='flex items-center justify-between'>
                            <span className='text-muted-foreground'>Order ID</span>
                            <span className='font-mono text-xs'>
                              {shipmentDetail.order.id}
                            </span>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-muted-foreground'>
                              Order Number
                            </span>
                            <span className='font-medium'>
                              {shipmentDetail.order.order_number || '--'}
                            </span>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-muted-foreground'>
                              Order Status
                            </span>
                            <Badge
                              variant={getOrderStatusVariant(
                                shipmentDetail.order.status
                              )}
                              className='capitalize'
                            >
                              {shipmentDetail.order.status || 'pending'}
                            </Badge>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-muted-foreground'>Context</span>
                            <span>
                              {shipmentDetail.order.table?.table_number
                                ? `Table ${shipmentDetail.order.table.table_number}`
                                : 'Delivery / No table'}
                            </span>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-muted-foreground'>Payment</span>
                            <span className='capitalize'>
                              {shipmentDetail.order.payment_method || '--'}
                            </span>
                          </div>
                          <Separator />
                          <div className='grid gap-2 sm:grid-cols-2'>
                            <div>
                              <p className='text-xs text-muted-foreground'>
                                Subtotal
                              </p>
                              <p>{formatCurrency(shipmentDetail.order.subtotal)}</p>
                            </div>
                            <div>
                              <p className='text-xs text-muted-foreground'>
                                Discount
                              </p>
                              <p>
                                {formatCurrency(
                                  shipmentDetail.order.discount_amount
                                )}
                              </p>
                            </div>
                            <div>
                              <p className='text-xs text-muted-foreground'>Tax</p>
                              <p>{formatCurrency(shipmentDetail.order.tax_amount)}</p>
                            </div>
                            <div>
                              <p className='text-xs text-muted-foreground'>Total</p>
                              <p className='font-semibold'>
                                {formatCurrency(shipmentDetail.order.total_amount)}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className='text-xs text-muted-foreground'>Notes</p>
                            <p>{shipmentDetail.order.notes || '--'}</p>
                          </div>
                        </>
                      ) : (
                        <p className='text-muted-foreground'>
                          Related order details are not available.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-base'>Order Items</CardTitle>
                      <CardDescription>
                        {shipmentDetail.order?.order_items.length || 0} item(s)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!shipmentDetail.order ||
                      shipmentDetail.order.order_items.length === 0 ? (
                        <p className='text-sm text-muted-foreground'>
                          No order items found.
                        </p>
                      ) : (
                        <div className='space-y-3'>
                          {shipmentDetail.order.order_items.map((item) => {
                            const lineTotal =
                              Number(item.unit_price || 0) *
                              Number(item.quantity || 0)

                            return (
                              <div
                                key={item.id}
                                className='rounded-md border p-3 text-sm'
                              >
                                <div className='flex items-start justify-between gap-3'>
                                  <div>
                                    <p className='font-medium'>
                                      {item.menu_item?.name || 'Unknown Item'}
                                    </p>
                                    <p className='text-xs text-muted-foreground'>
                                      Variant: {item.variant?.name || '--'}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={getItemStatusVariant(item.status)}
                                    className='capitalize'
                                  >
                                    {item.status || 'pending'}
                                  </Badge>
                                </div>
                                <div className='mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3'>
                                  <span>Qty: {item.quantity || 0}</span>
                                  <span>
                                    Unit: {formatCurrency(item.unit_price)}
                                  </span>
                                  <span>Line: {formatCurrency(lineTotal)}</span>
                                </div>
                                <div className='mt-2 text-xs'>
                                  <p className='text-muted-foreground'>
                                    Properties: {parsePropertiesLabel(item.properties)}
                                  </p>
                                  <p className='text-muted-foreground'>
                                    Notes: {item.notes || '--'}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
