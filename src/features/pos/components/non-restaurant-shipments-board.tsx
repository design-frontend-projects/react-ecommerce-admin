import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BadgeDollarSign,
  Clock3,
  Eye,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  RefreshCw,
  RotateCcw,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Textarea } from '@/components/ui/textarea'
import {
  NON_RESTAURANT_SHIPMENT_STATUSES,
  type NonRestaurantShipment,
  type NonRestaurantShipmentDetails,
  type NonRestaurantShipmentStatus,
  getNonRestaurantShipmentDetails,
  getNonRestaurantShipments,
  normalizeNonRestaurantShipmentStatus,
  updateNonRestaurantShipment,
} from '../data/api'

type BoardVariant = 'page' | 'embedded'
type BoardContext = 'inventory' | 'pos'
type ShipmentFilter =
  | 'all'
  | 'pending'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'delayed'
  | 'refundable'
  | 'other'
type ShipmentBucket = Exclude<ShipmentFilter, 'all'>
type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'

const QUERY_KEY = ['non-restaurant-shipments'] as const
const SHIPMENT_DETAILS_QUERY_KEY = ['non-restaurant-shipment-details'] as const
const shipmentDetailsQueryKey = (shipmentId: string) =>
  [...SHIPMENT_DETAILS_QUERY_KEY, shipmentId] as const

const POS_STATUS_OPTIONS = [
  'prepared',
  'pending',
  'approved',
  'in_transit',
  'shipped',
  'delivered',
  'cancelled',
  'failed',
] as const

const INVENTORY_QUICK_ACTIONS: Array<{
  label: string
  status: NonRestaurantShipmentStatus
  icon: LucideIcon
  destructive?: boolean
}> = [
  { label: 'Mark as shipped', status: 'shipped', icon: Truck },
  { label: 'Mark as not shipped', status: 'prepared', icon: RotateCcw },
  { label: 'Mark as delayed', status: 'delayed', icon: Clock3 },
  {
    label: 'Mark as refundable',
    status: 'refundable',
    icon: BadgeDollarSign,
  },
  {
    label: 'Cancel shipment',
    status: 'cancelled',
    icon: XCircle,
    destructive: true,
  },
]

function normalizeStatus(status: string | null | undefined) {
  return (status || 'prepared').trim().toLowerCase().replace(/\s+/g, '_')
}

function toTitleCase(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

function getShipmentBucket(status: string): ShipmentBucket {
  const normalizedStatus = normalizeStatus(status)

  if (normalizedStatus === 'delivered') return 'delivered'
  if (normalizedStatus === 'delayed') return 'delayed'
  if (normalizedStatus === 'refundable') return 'refundable'

  if (
    normalizedStatus === 'approved' ||
    normalizedStatus === 'in_transit' ||
    normalizedStatus === 'shipped'
  ) {
    return 'in_transit'
  }

  if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed') {
    return 'cancelled'
  }

  if (normalizedStatus === 'pending' || normalizedStatus === 'prepared') {
    return 'pending'
  }

  return 'other'
}

function getStatusBadgeVariant(status: string): BadgeVariant {
  const normalizedStatus = normalizeStatus(status)

  if (normalizedStatus === 'delivered') return 'default'

  if (
    normalizedStatus === 'approved' ||
    normalizedStatus === 'in_transit' ||
    normalizedStatus === 'shipped' ||
    normalizedStatus === 'refundable'
  ) {
    return 'secondary'
  }

  if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed') {
    return 'destructive'
  }

  return 'outline'
}

function formatShipmentDate(value: string | null) {
  if (!value) return '--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toNullableValue(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

type EditFormState = {
  status: string
  tracking_number: string
  carrier: string
  notes: string
}

type NonRestaurantShipmentsBoardProps = {
  variant?: BoardVariant
  context?: BoardContext
}

export function NonRestaurantShipmentsBoard({
  variant = 'page',
  context,
}: NonRestaurantShipmentsBoardProps) {
  const resolvedContext: BoardContext =
    context ?? (variant === 'page' ? 'inventory' : 'pos')
  const isInventoryMode = resolvedContext === 'inventory'
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ShipmentFilter>('all')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingShipment, setEditingShipment] =
    useState<NonRestaurantShipment | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(null)
  const [formState, setFormState] = useState<EditFormState>({
    status: 'prepared',
    tracking_number: '',
    carrier: '',
    notes: '',
  })

  const {
    data: shipments,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getNonRestaurantShipments,
  })

  const {
    data: shipmentDetails,
    isLoading: isShipmentDetailsLoading,
    isFetching: isShipmentDetailsFetching,
    isError: isShipmentDetailsError,
    error: shipmentDetailsError,
    refetch: refetchShipmentDetails,
  } = useQuery<NonRestaurantShipmentDetails>({
    queryKey: shipmentDetailsQueryKey(activeShipmentId || ''),
    queryFn: () => {
      if (!activeShipmentId) {
        throw new Error('Shipment id is required')
      }

      return getNonRestaurantShipmentDetails(activeShipmentId)
    },
    enabled: isInventoryMode && isDetailsOpen && !!activeShipmentId,
  })

  useEffect(() => {
    const channel = supabase
      .channel(`inventory-shipments-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY })
          queryClient.invalidateQueries({ queryKey: SHIPMENT_DETAILS_QUERY_KEY })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const {
    mutate: saveShipment,
    isPending: isSaving,
    variables: pendingUpdate,
  } = useMutation({
    mutationFn: updateNonRestaurantShipment,
    onSuccess: () => {
      toast.success('Shipment updated successfully')
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SHIPMENT_DETAILS_QUERY_KEY })
      setIsEditOpen(false)
      setEditingShipment(null)
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to update shipment'
      )
    },
  })

  const shipmentRows = useMemo(() => shipments ?? [], [shipments])

  const counts = useMemo(() => {
    return shipmentRows.reduce(
      (acc, shipment) => {
        const bucket = getShipmentBucket(shipment.status)

        acc.total += 1
        if (bucket === 'pending') acc.pending += 1
        if (bucket === 'in_transit') acc.in_transit += 1
        if (bucket === 'delivered') acc.delivered += 1
        if (bucket === 'cancelled') acc.cancelled += 1
        if (bucket === 'delayed') acc.delayed += 1
        if (bucket === 'refundable') acc.refundable += 1

        return acc
      },
      {
        total: 0,
        pending: 0,
        in_transit: 0,
        delivered: 0,
        cancelled: 0,
        delayed: 0,
        refundable: 0,
      }
    )
  }, [shipmentRows])

  const filterTabs: Array<{ value: ShipmentFilter; label: string; count: number }> =
    isInventoryMode
      ? [
          { value: 'all', label: 'All', count: counts.total },
          { value: 'pending', label: 'Pending', count: counts.pending },
          { value: 'in_transit', label: 'In Transit', count: counts.in_transit },
          { value: 'delayed', label: 'Delayed', count: counts.delayed },
          { value: 'refundable', label: 'Refundable', count: counts.refundable },
          { value: 'delivered', label: 'Delivered', count: counts.delivered },
          { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
        ]
      : [
          { value: 'all', label: 'All', count: counts.total },
          { value: 'pending', label: 'Pending', count: counts.pending },
          { value: 'in_transit', label: 'In Transit', count: counts.in_transit },
          { value: 'delivered', label: 'Delivered', count: counts.delivered },
          { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
        ]

  const filteredShipments = useMemo(() => {
    if (statusFilter === 'all') return shipmentRows
    return shipmentRows.filter(
      (shipment) => getShipmentBucket(shipment.status) === statusFilter
    )
  }, [shipmentRows, statusFilter])

  const openEditDialog = (shipment: NonRestaurantShipment) => {
    setEditingShipment(shipment)
    setFormState({
      status: normalizeStatus(shipment.status),
      tracking_number: shipment.tracking_number || '',
      carrier: shipment.carrier || '',
      notes: shipment.notes || '',
    })
    setIsEditOpen(true)
  }

  const openDetailsSheet = (shipmentId: number) => {
    setActiveShipmentId(String(shipmentId))
    setIsDetailsOpen(true)
  }

  const submitEdit = () => {
    if (!editingShipment) return

    saveShipment({
      shipmentId: editingShipment.shipment_id,
      status: formState.status,
      tracking_number: toNullableValue(formState.tracking_number),
      carrier: toNullableValue(formState.carrier),
      notes: toNullableValue(formState.notes),
    })
  }

  const handleQuickStatusAction = (
    shipment: NonRestaurantShipment,
    status: NonRestaurantShipmentStatus
  ) => {
    saveShipment({
      shipmentId: shipment.shipment_id,
      status,
    })
  }

  if (isLoading) {
    return (
      <div className='flex h-64 flex-col items-center justify-center gap-3'>
        <Loader2 className='size-8 animate-spin text-muted-foreground' />
        <p className='text-sm text-muted-foreground'>Loading shipments...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Unable to load shipments</CardTitle>
          <CardDescription>
            We could not fetch shipment tracking data.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Alert variant='destructive'>
            <AlertTriangle />
            <AlertTitle>Request failed</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : 'Please try again in a few moments.'}
            </AlertDescription>
          </Alert>
          <Button type='button' variant='outline' onClick={() => void refetch()}>
            <RefreshCw data-icon='inline-start' />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const editableStatusOptions = isInventoryMode
    ? NON_RESTAURANT_SHIPMENT_STATUSES
    : POS_STATUS_OPTIONS

  return (
    <>
      <div className='flex flex-col gap-5'>
        {variant === 'page' ? (
          <div className='flex flex-col gap-2'>
            <h2 className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
              <Truck className='size-6 text-primary' />
              Shipments
            </h2>
            <p className='text-sm text-muted-foreground'>
              Track non-restaurant order shipments in realtime and update status,
              carrier, and tracking details.
            </p>
          </div>
        ) : (
          <div className='flex items-center justify-between gap-2'>
            <h3 className='flex items-center gap-2 text-lg font-semibold'>
              <Truck className='size-5 text-primary' />
              Shipment Tracking
            </h3>
            <Button
              type='button'
              variant='outline'
              size='sm'
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
        )}

        <div
          className={`grid gap-3 ${
            isInventoryMode ? 'sm:grid-cols-3 xl:grid-cols-6' : 'sm:grid-cols-2 xl:grid-cols-4'
          }`}
        >
          <Card>
            <CardHeader className='gap-1 pb-2'>
              <CardDescription>Total</CardDescription>
              <CardTitle>{counts.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className='gap-1 pb-2'>
              <CardDescription>Pending</CardDescription>
              <CardTitle>{counts.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className='gap-1 pb-2'>
              <CardDescription>In Transit</CardDescription>
              <CardTitle>{counts.in_transit}</CardTitle>
            </CardHeader>
          </Card>
          {isInventoryMode ? (
            <>
              <Card>
                <CardHeader className='gap-1 pb-2'>
                  <CardDescription>Delayed</CardDescription>
                  <CardTitle>{counts.delayed}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className='gap-1 pb-2'>
                  <CardDescription>Refundable</CardDescription>
                  <CardTitle>{counts.refundable}</CardTitle>
                </CardHeader>
              </Card>
            </>
          ) : null}
          <Card>
            <CardHeader className='gap-1 pb-2'>
              <CardDescription>Delivered</CardDescription>
              <CardTitle>{counts.delivered}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className='overflow-hidden'>
          <CardHeader className='border-b bg-muted/20'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <PackageCheck className='size-4 text-primary' />
              Shipment Queue
            </CardTitle>
            <CardDescription>
              Schema-first tracking fields with recipient fallback from serialized
              notes.
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
              <Table className='min-w-[1180px]'>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[110px]'>Shipment</TableHead>
                    <TableHead className='w-[90px]'>Order</TableHead>
                    <TableHead className='w-[130px]'>Status</TableHead>
                    <TableHead className='w-[140px]'>Carrier</TableHead>
                    <TableHead className='w-[180px]'>Tracking</TableHead>
                    <TableHead className='w-[200px]'>Recipient</TableHead>
                    <TableHead className='w-[220px]'>Destination</TableHead>
                    <TableHead className='w-[150px]'>Shipped</TableHead>
                    <TableHead className='w-[150px]'>Delivered</TableHead>
                    <TableHead className='w-[120px] text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className='h-28 text-center'>
                        <span className='text-sm text-muted-foreground'>
                          No shipments found for this filter.
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShipments.map((shipment) => {
                      const statusValue = normalizeStatus(shipment.status)
                      const statusLabel = toTitleCase(statusValue)
                      const isUpdatingCurrentShipment =
                        isSaving &&
                        Number(pendingUpdate?.shipmentId) === shipment.shipment_id

                      return (
                        <TableRow key={shipment.shipment_id}>
                          <TableCell className='font-mono text-xs'>
                            #{shipment.shipment_id}
                          </TableCell>
                          <TableCell className='font-mono text-xs'>
                            {shipment.order_id}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(shipment.status)}>
                              {statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>{shipment.carrier || '--'}</TableCell>
                          <TableCell>
                            <span className='font-mono text-xs'>
                              {shipment.tracking_number || '--'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className='flex flex-col gap-0.5'>
                              <span className='font-medium'>
                                {shipment.recipient_name || '--'}
                              </span>
                              <span className='text-xs text-muted-foreground'>
                                {shipment.recipient_phone || '--'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='flex flex-col gap-0.5'>
                              <span>{shipment.delivery_address || '--'}</span>
                              <span className='text-xs text-muted-foreground'>
                                {shipment.city || '--'}, {shipment.state || '--'}{' '}
                                {shipment.postal_code || '--'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatShipmentDate(shipment.shipped_date)}</TableCell>
                          <TableCell>
                            {formatShipmentDate(shipment.delivered_date)}
                          </TableCell>
                          <TableCell className='text-right'>
                            {isInventoryMode ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='size-8 data-[state=open]:bg-muted'
                                    disabled={isUpdatingCurrentShipment}
                                    aria-label='Open shipment actions'
                                  >
                                    {isUpdatingCurrentShipment ? (
                                      <Loader2 className='animate-spin' />
                                    ) : (
                                      <MoreHorizontal />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end' className='w-56'>
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        openDetailsSheet(shipment.shipment_id)
                                      }
                                    >
                                      <Eye />
                                      View details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openEditDialog(shipment)}
                                    >
                                      <Pencil />
                                      Edit shipment
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuGroup>
                                    {INVENTORY_QUICK_ACTIONS.map((action) => {
                                      const disabled =
                                        isUpdatingCurrentShipment ||
                                        normalizeNonRestaurantShipmentStatus(
                                          shipment.status
                                        ) === action.status

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
                                            handleQuickStatusAction(
                                              shipment,
                                              action.status
                                            )
                                          }
                                        >
                                          <action.icon />
                                          {action.label}
                                        </DropdownMenuItem>
                                      )
                                    })}
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => openEditDialog(shipment)}
                              >
                                <Pencil data-icon='inline-start' />
                                Edit
                              </Button>
                            )}
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

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) {
            setEditingShipment(null)
          }
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Edit Shipment</DialogTitle>
            <DialogDescription>
              Update status and delivery metadata for shipment{' '}
              {editingShipment ? `#${editingShipment.shipment_id}` : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'>
              <Label htmlFor='shipment-status'>Status</Label>
              <Select
                value={formState.status}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger id='shipment-status'>
                  <SelectValue placeholder='Select status' />
                </SelectTrigger>
                <SelectContent>
                  {editableStatusOptions.map((statusOption) => (
                    <SelectItem key={statusOption} value={statusOption}>
                      {toTitleCase(statusOption)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='tracking-number'>Tracking Number</Label>
                <Input
                  id='tracking-number'
                  value={formState.tracking_number}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      tracking_number: event.target.value,
                    }))
                  }
                  placeholder='e.g. 1Z999AA10123456784'
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='carrier'>Carrier</Label>
                <Input
                  id='carrier'
                  value={formState.carrier}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      carrier: event.target.value,
                    }))
                  }
                  placeholder='e.g. DHL'
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='shipment-notes'>Notes</Label>
              <Textarea
                id='shipment-notes'
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder='Operational notes or delivery instructions'
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={submitEdit}
              disabled={isSaving || !editingShipment}
            >
              {isSaving ? (
                <Loader2 data-icon='inline-start' className='animate-spin' />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isInventoryMode ? (
        <Sheet
          open={isDetailsOpen}
          onOpenChange={(open) => {
            setIsDetailsOpen(open)
            if (!open) {
              setActiveShipmentId(null)
            }
          }}
        >
          <SheetContent side='right' className='w-full sm:max-w-2xl'>
            <SheetHeader className='text-start'>
              <SheetTitle>Shipment Details</SheetTitle>
              <SheetDescription>
                Full shipment metadata and linked order breakdown.
              </SheetDescription>
            </SheetHeader>

            <div className='mt-4 flex h-[calc(100vh-9rem)] flex-col'>
              {isShipmentDetailsLoading || isShipmentDetailsFetching ? (
                <div className='flex h-full flex-col items-center justify-center gap-3 text-muted-foreground'>
                  <Loader2 className='size-8 animate-spin' />
                  <p className='text-sm'>Loading shipment details...</p>
                </div>
              ) : isShipmentDetailsError ? (
                <div className='space-y-4'>
                  <Alert variant='destructive'>
                    <AlertTriangle />
                    <AlertTitle>Failed to load details</AlertTitle>
                    <AlertDescription>
                      {shipmentDetailsError instanceof Error
                        ? shipmentDetailsError.message
                        : 'Unable to load shipment details.'}
                    </AlertDescription>
                  </Alert>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => void refetchShipmentDetails()}
                  >
                    <RefreshCw data-icon='inline-start' />
                    Retry
                  </Button>
                </div>
              ) : !shipmentDetails ? (
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
                            {shipmentDetails.shipment.shipment_id}
                          </span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground'>Order ID</span>
                          <span className='font-mono text-xs'>
                            {shipmentDetails.shipment.order_id}
                          </span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-muted-foreground'>Status</span>
                          <Badge
                            variant={getStatusBadgeVariant(
                              shipmentDetails.shipment.status
                            )}
                          >
                            {toTitleCase(shipmentDetails.shipment.status)}
                          </Badge>
                        </div>
                        <div className='grid gap-2 sm:grid-cols-2'>
                          <div>
                            <p className='text-xs text-muted-foreground'>
                              Tracking
                            </p>
                            <p>{shipmentDetails.shipment.tracking_number || '--'}</p>
                          </div>
                          <div>
                            <p className='text-xs text-muted-foreground'>Carrier</p>
                            <p>{shipmentDetails.shipment.carrier || '--'}</p>
                          </div>
                          <div>
                            <p className='text-xs text-muted-foreground'>Shipped</p>
                            <p>
                              {formatShipmentDate(
                                shipmentDetails.shipment.shipped_date
                              )}
                            </p>
                          </div>
                          <div>
                            <p className='text-xs text-muted-foreground'>
                              Delivered
                            </p>
                            <p>
                              {formatShipmentDate(
                                shipmentDetails.shipment.delivered_date
                              )}
                            </p>
                          </div>
                        </div>
                        <div className='space-y-1'>
                          <p className='text-xs text-muted-foreground'>
                            Recipient
                          </p>
                          <p className='font-medium'>
                            {shipmentDetails.shipment.recipient_name || '--'}
                          </p>
                          <p className='text-muted-foreground'>
                            {shipmentDetails.shipment.recipient_phone || '--'}
                          </p>
                        </div>
                        <div className='space-y-1'>
                          <p className='text-xs text-muted-foreground'>
                            Destination
                          </p>
                          <p>{shipmentDetails.shipment.delivery_address || '--'}</p>
                          <p className='text-muted-foreground'>
                            {shipmentDetails.shipment.city || '--'},{' '}
                            {shipmentDetails.shipment.state || '--'}{' '}
                            {shipmentDetails.shipment.postal_code || '--'}
                          </p>
                        </div>
                        <div>
                          <p className='text-xs text-muted-foreground'>Notes</p>
                          <p>{shipmentDetails.shipment.notes || '--'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className='pb-2'>
                        <CardTitle className='text-base'>Order Summary</CardTitle>
                      </CardHeader>
                      <CardContent className='space-y-2 text-sm'>
                        {shipmentDetails.order ? (
                          <>
                            <div className='flex items-center justify-between'>
                              <span className='text-muted-foreground'>Sale ID</span>
                              <span className='font-mono text-xs'>
                                {shipmentDetails.order.sale_id}
                              </span>
                            </div>
                            <div className='flex items-center justify-between'>
                              <span className='text-muted-foreground'>
                                Sale Date
                              </span>
                              <span>
                                {formatShipmentDate(shipmentDetails.order.sale_date)}
                              </span>
                            </div>
                            <div className='flex items-center justify-between'>
                              <span className='text-muted-foreground'>
                                Order Status
                              </span>
                              <span className='capitalize'>
                                {shipmentDetails.order.status || '--'}
                              </span>
                            </div>
                            <div className='flex items-center justify-between'>
                              <span className='text-muted-foreground'>
                                Payment Method
                              </span>
                              <span className='capitalize'>
                                {shipmentDetails.order.payment_method || '--'}
                              </span>
                            </div>
                            <div className='grid gap-2 sm:grid-cols-2'>
                              <div>
                                <p className='text-xs text-muted-foreground'>
                                  Subtotal
                                </p>
                                <p>{formatCurrency(shipmentDetails.order.subtotal)}</p>
                              </div>
                              <div>
                                <p className='text-xs text-muted-foreground'>
                                  Discount
                                </p>
                                <p>
                                  {formatCurrency(
                                    shipmentDetails.order.discount_amount
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className='text-xs text-muted-foreground'>Tax</p>
                                <p>{formatCurrency(shipmentDetails.order.tax_amount)}</p>
                              </div>
                              <div>
                                <p className='text-xs text-muted-foreground'>Total</p>
                                <p className='font-semibold'>
                                  {formatCurrency(shipmentDetails.order.total_amount)}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className='text-muted-foreground'>
                            Linked POS order details are unavailable.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className='pb-2'>
                        <CardTitle className='text-base'>Order Items</CardTitle>
                        <CardDescription>
                          {shipmentDetails.order?.items.length || 0} item(s)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {!shipmentDetails.order ||
                        shipmentDetails.order.items.length === 0 ? (
                          <p className='text-sm text-muted-foreground'>
                            No order items found.
                          </p>
                        ) : (
                          <div className='space-y-3'>
                            {shipmentDetails.order.items.map((item) => (
                              <div
                                key={item.sale_item_id}
                                className='rounded-md border p-3 text-sm'
                              >
                                <div className='flex items-center justify-between gap-2'>
                                  <div>
                                    <p className='font-medium'>
                                      {item.product_name || 'Unknown Product'}
                                    </p>
                                    <p className='text-xs text-muted-foreground'>
                                      SKU: {item.product_sku || '--'}
                                    </p>
                                  </div>
                                  <span className='font-mono text-xs'>
                                    #{item.sale_item_id}
                                  </span>
                                </div>
                                <div className='mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3'>
                                  <span>Qty: {item.quantity}</span>
                                  <span>
                                    Unit: {formatCurrency(item.unit_price)}
                                  </span>
                                  <span>
                                    Line: {formatCurrency(item.line_subtotal)}
                                  </span>
                                </div>
                              </div>
                            ))}
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
      ) : null}
    </>
  )
}
