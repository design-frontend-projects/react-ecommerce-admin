import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Eye,
  Loader2,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  Phone,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  Utensils,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { usePaymentMethods } from '@/features/payment-methods/hooks/use-payment-methods'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
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
  getPosTakeawayOrders,
  updatePosShipmentStatus,
  type PosShipmentDetail,
  type PosTakeawayOrder,
} from '../data/api'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'
type MainTab = 'all' | 'shipments' | 'takeaways'
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
const TAKEAWAYS_QUERY_KEY = ['pos-takeaway-orders'] as const
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

export function ShipmentsList() {
  const queryClient = useQueryClient()
  const [mainTab, setMainTab] = useState<MainTab>('all')
  const [statusFilter, setStatusFilter] = useState<ShipmentFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(null)
  const [isViewShipmentOpen, setIsViewShipmentOpen] = useState(false)

  const [activeTakeaway, setActiveTakeaway] = useState<PosTakeawayOrder | null>(
    null
  )
  const [isViewTakeawayOpen, setIsViewTakeawayOpen] = useState(false)

  const { data: paymentMethods } = usePaymentMethods()

  const paymentMethodsMap = useMemo(() => {
    const map = new Map<string, string>()
    if (paymentMethods) {
      for (const pm of paymentMethods) {
        if (pm.id && pm.name) {
          map.set(pm.id, pm.name)
          map.set(pm.id.toLowerCase(), pm.name)
        }
        if (pm.name) {
          map.set(pm.name.toLowerCase(), pm.name)
        }
      }
    }
    return map
  }, [paymentMethods])

  const resolvePaymentMethodName = useMemo(() => {
    return (methodIdOrName?: string | null): string => {
      if (!methodIdOrName) return 'Paid'
      const trimmed = methodIdOrName.trim()
      if (paymentMethodsMap.has(trimmed)) {
        return paymentMethodsMap.get(trimmed)!
      }
      if (paymentMethodsMap.has(trimmed.toLowerCase())) {
        return paymentMethodsMap.get(trimmed.toLowerCase())!
      }
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          trimmed
        )
      if (isUuid) {
        return 'Card / Cash'
      }
      return toTitleCase(trimmed)
    }
  }, [paymentMethodsMap])

  // 1. Fetch Shipments
  const {
    data: shipments,
    error: shipmentsError,
    isError: isShipmentsError,
    isFetching: isShipmentsFetching,
    isLoading: isShipmentsLoading,
    refetch: refetchShipments,
  } = useQuery<PosShipment[]>({
    queryKey: SHIPMENTS_QUERY_KEY,
    queryFn: getPosShipments,
  })

  // 2. Fetch Takeaway Orders (paid res_orders with order_type = takeaway)
  const {
    data: takeaways,
    error: takeawaysError,
    isError: isTakeawaysError,
    isFetching: isTakeawaysFetching,
    isLoading: isTakeawaysLoading,
    refetch: refetchTakeaways,
  } = useQuery<PosTakeawayOrder[]>({
    queryKey: TAKEAWAYS_QUERY_KEY,
    queryFn: getPosTakeawayOrders,
  })

  // 3. Fetch Shipment Details
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
    enabled: isViewShipmentOpen && !!activeShipmentId,
  })

  // 4. Mutation for updating shipment status
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
  const takeawaysData = useMemo(() => takeaways ?? [], [takeaways])

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    let result = shipmentsData

    if (statusFilter !== 'all') {
      result = result.filter(
        (shipment) => getShipmentBucket(shipment.status) === statusFilter
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (s) =>
          s.order_id.toLowerCase().includes(q) ||
          s.recipient_name.toLowerCase().includes(q) ||
          s.recipient_phone.toLowerCase().includes(q) ||
          s.delivery_address.toLowerCase().includes(q) ||
          (s.tracking_number && s.tracking_number.toLowerCase().includes(q))
      )
    }

    return result
  }, [shipmentsData, statusFilter, searchQuery])

  // Filtered takeaways
  const filteredTakeaways = useMemo(() => {
    let result = takeawaysData

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (t) =>
          t.order_number.toLowerCase().includes(q) ||
          (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
          (t.mobile_number && t.mobile_number.toLowerCase().includes(q)) ||
          t.id.toLowerCase().includes(q)
      )
    }

    return result
  }, [takeawaysData, searchQuery])

  // Shipment counts
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
      { total: 0, pending: 0, approved: 0, delivered: 0, cancelled: 0 }
    )
  }, [shipmentsData])

  // Takeaway revenue
  const takeawayRevenue = useMemo(() => {
    return takeawaysData.reduce((sum, item) => sum + item.total_amount, 0)
  }, [takeawaysData])

  const handleRefetchAll = () => {
    void refetchShipments()
    void refetchTakeaways()
  }

  const isAnyFetching = isShipmentsFetching || isTakeawaysFetching
  const isLoadingInitial = isShipmentsLoading && isTakeawaysLoading

  const openShipmentDetails = (shipmentId: string) => {
    setActiveShipmentId(shipmentId)
    setIsViewShipmentOpen(true)
  }

  const openTakeawayDetails = (takeaway: PosTakeawayOrder) => {
    setActiveTakeaway(takeaway)
    setIsViewTakeawayOpen(true)
  }

  const handleStatusAction = (
    shipmentId: string,
    nextStatus: string,
    actionLabel: string
  ) => {
    updateShipmentStatus({ shipmentId, nextStatus, actionLabel })
  }

  if (isLoadingInitial) {
    return (
      <div className='flex h-96 flex-col items-center justify-center gap-4 rounded-2xl border bg-card/50 p-8 shadow-sm backdrop-blur-sm'>
        <div className='relative flex items-center justify-center'>
          <div className='size-14 animate-spin rounded-full border-4 border-primary/20 border-t-primary' />
          <Truck className='absolute size-6 text-primary' />
        </div>
        <div className='flex flex-col items-center gap-1 text-center'>
          <h3 className='text-lg font-semibold text-foreground'>
            Loading Fulfillment Center
          </h3>
          <p className='text-sm text-muted-foreground'>
            Fetching latest delivery shipments & takeaway orders...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6 py-2'>
      {/* 1. Header Section */}
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex flex-col gap-1.5'>
          <div className='flex items-center gap-2.5'>
            <div className='flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner'>
              <Truck className='size-5' />
            </div>
            <div>
              <h1 className='flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl'>
                Shipments & Takeaway
              </h1>
              <p className='text-xs text-muted-foreground md:text-sm'>
                Manage delivery shipments, track lifecycles, and view paid
                takeaway orders.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className='flex flex-wrap items-center gap-3'>
          <div className='relative max-w-xs min-w-[240px] flex-1 sm:flex-none'>
            <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='text'
              placeholder='Search order #, customer, address...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-9.5 pr-8 pl-9 text-xs shadow-xs focus-visible:ring-1 sm:text-sm'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                className='absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground'
              >
                <X className='size-3.5' />
              </button>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Badge
              variant='outline'
              className='hidden h-9 items-center gap-1.5 bg-background/50 px-3 text-xs font-normal sm:inline-flex'
            >
              <Sparkles className='size-3 text-emerald-500' />
              Live Sync
            </Badge>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={handleRefetchAll}
              disabled={isAnyFetching}
              className='h-9 gap-1.5 font-medium shadow-xs'
            >
              {isAnyFetching ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <RefreshCw className='size-3.5' />
              )}
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Top Stats Metrics Grid */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.03] p-4 shadow-sm transition-all hover:shadow-md'>
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <span className='text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                Total Shipments
              </span>
              <div className='text-2xl font-bold tracking-tight text-foreground'>
                {shipmentCounts.total}
              </div>
              <p className='text-[11px] text-muted-foreground'>
                Delivery queue entries
              </p>
            </div>
            <div className='flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400'>
              <Truck className='size-5' />
            </div>
          </div>
        </Card>

        <Card className='relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-amber-500/[0.03] p-4 shadow-sm transition-all hover:shadow-md'>
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <span className='text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                Pending Approval
              </span>
              <div className='text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400'>
                {shipmentCounts.pending}
              </div>
              <p className='text-[11px] text-muted-foreground'>
                Awaiting dispatch status
              </p>
            </div>
            <div className='flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400'>
              <Clock3 className='size-5' />
            </div>
          </div>
        </Card>

        <Card className='relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-emerald-500/[0.03] p-4 shadow-sm transition-all hover:shadow-md'>
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <span className='text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                Paid Takeaways
              </span>
              <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400'>
                {takeawaysData.length}
              </div>
              <p className='text-[11px] text-muted-foreground'>
                Takeaway orders paid
              </p>
            </div>
            <div className='flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
              <ShoppingBag className='size-5' />
            </div>
          </div>
        </Card>

        <Card className='relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-purple-500/[0.03] p-4 shadow-sm transition-all hover:shadow-md'>
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <span className='text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                Takeaway Revenue
              </span>
              <div className='text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400'>
                {formatCurrency(takeawayRevenue)}
              </div>
              <p className='text-[11px] text-muted-foreground'>
                Total from paid takeaway
              </p>
            </div>
            <div className='flex size-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400'>
              <DollarSign className='size-5' />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Main Fulfillment Card Container */}
      <Card className='overflow-hidden border-border/60 shadow-sm'>
        {/* Navigation Tabs Header */}
        <div className='border-b bg-muted/20 px-4 pt-3 pb-0 md:px-6'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <Tabs
              value={mainTab}
              onValueChange={(val) => setMainTab(val as MainTab)}
              className='w-full sm:w-auto'
            >
              <TabsList className='grid h-10 w-full grid-cols-3 bg-muted/60 p-1 sm:inline-flex sm:w-auto'>
                <TabsTrigger
                  value='all'
                  className='gap-2 text-xs font-medium sm:text-sm'
                >
                  <Utensils className='size-3.5' />
                  <span>All Fulfillment</span>
                  <Badge
                    variant='secondary'
                    className='px-1.5 py-0 text-[10px]'
                  >
                    {shipmentsData.length + takeawaysData.length}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value='shipments'
                  className='gap-2 text-xs font-medium sm:text-sm'
                >
                  <Truck className='size-3.5' />
                  <span>Shipments</span>
                  <Badge
                    variant='secondary'
                    className='px-1.5 py-0 text-[10px]'
                  >
                    {shipmentsData.length}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value='takeaways'
                  className='gap-2 text-xs font-medium sm:text-sm'
                >
                  <ShoppingBag className='size-3.5' />
                  <span>Takeaway Orders</span>
                  <Badge
                    variant='default'
                    className='bg-emerald-600 px-1.5 py-0 text-[10px] text-white hover:bg-emerald-600'
                  >
                    {takeawaysData.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Sub-tabs for Shipments (when mainTab === 'shipments' or 'all') */}
          {(mainTab === 'shipments' || mainTab === 'all') && (
            <div className='mt-3 border-t pt-2 pb-2'>
              <ScrollArea orientation='horizontal' className='w-full pb-1'>
                <div className='flex items-center gap-1.5'>
                  <span className='mr-2 text-xs font-medium text-muted-foreground'>
                    Shipment Status:
                  </span>
                  {[
                    {
                      value: 'all',
                      label: 'All Shipments',
                      count: shipmentCounts.total,
                    },
                    {
                      value: 'pending',
                      label: 'Pending',
                      count: shipmentCounts.pending,
                    },
                    {
                      value: 'approved',
                      label: 'Approved / Transit',
                      count: shipmentCounts.approved,
                    },
                    {
                      value: 'delivered',
                      label: 'Delivered',
                      count: shipmentCounts.delivered,
                    },
                    {
                      value: 'cancelled',
                      label: 'Cancelled',
                      count: shipmentCounts.cancelled,
                    },
                  ].map((tab) => (
                    <Button
                      key={tab.value}
                      type='button'
                      size='sm'
                      variant={
                        statusFilter === tab.value ? 'secondary' : 'ghost'
                      }
                      onClick={() =>
                        setStatusFilter(tab.value as ShipmentFilter)
                      }
                      className='h-7.5 gap-1.5 rounded-lg px-2.5 text-xs font-medium'
                    >
                      {tab.label}
                      <span className='py-0.2 rounded-full bg-background/80 px-1.5 font-mono text-[10px] text-muted-foreground'>
                        {tab.count}
                      </span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Content Body */}
        <CardContent className='p-0'>
          {/* Error Banner if any */}
          {(isShipmentsError || isTakeawaysError) && (
            <div className='p-4 md:p-6'>
              <Alert variant='destructive'>
                <AlertTriangle className='size-4' />
                <AlertTitle>Fulfillment data alert</AlertTitle>
                <AlertDescription>
                  {shipmentsError instanceof Error
                    ? shipmentsError.message
                    : takeawaysError instanceof Error
                      ? takeawaysError.message
                      : 'Some data could not be fetched from the database. Please try refreshing.'}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* SECTION 1: Takeaway Orders Table (Shown on 'takeaways' tab or 'all' tab) */}
          {(mainTab === 'takeaways' || mainTab === 'all') && (
            <div className='flex flex-col gap-3 p-4 md:p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
                    <ShoppingBag className='size-4' />
                  </div>
                  <div>
                    <h3 className='text-base font-semibold tracking-tight text-foreground'>
                      Takeaway Orders (Paid)
                    </h3>
                    <p className='text-xs text-muted-foreground'>
                      Latest created takeaway orders from res_orders ready for
                      pickup.
                    </p>
                  </div>
                </div>

                <Badge
                  variant='outline'
                  className='border-emerald-500/30 bg-emerald-500/5 font-mono text-xs text-emerald-600 dark:text-emerald-400'
                >
                  {filteredTakeaways.length} Paid Takeaways
                </Badge>
              </div>

              <div className='overflow-hidden rounded-xl border border-border/60 bg-card'>
                <ScrollArea orientation='horizontal' className='w-full'>
                  <Table className='min-w-[800px]'>
                    <TableHeader className='bg-muted/40'>
                      <TableRow className='hover:bg-transparent'>
                        <TableHead className='w-[140px] text-xs font-semibold'>
                          Order Number
                        </TableHead>
                        <TableHead className='w-[200px] text-xs font-semibold'>
                          Customer Info
                        </TableHead>
                        <TableHead className='w-[120px] text-xs font-semibold'>
                          Items
                        </TableHead>
                        <TableHead className='w-[140px] text-xs font-semibold'>
                          Payment & Total
                        </TableHead>
                        <TableHead className='w-[130px] text-xs font-semibold'>
                          Status
                        </TableHead>
                        <TableHead className='w-[150px] text-xs font-semibold'>
                          Paid Time
                        </TableHead>
                        <TableHead className='w-[80px] text-right text-xs font-semibold'>
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTakeaways.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className='h-28 text-center'>
                            <div className='flex flex-col items-center justify-center gap-1.5 text-muted-foreground'>
                              <ShoppingBag className='size-6 text-muted-foreground/60' />
                              <span className='text-sm font-medium'>
                                No paid takeaway orders found.
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTakeaways.map((takeaway) => (
                          <TableRow
                            key={takeaway.id}
                            className='transition-colors hover:bg-muted/30'
                          >
                            <TableCell className='font-mono text-xs font-semibold text-foreground'>
                              <div className='flex items-center gap-1.5'>
                                <Receipt className='size-3.5 text-emerald-500' />
                                <span>{takeaway.order_number}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className='flex flex-col gap-0.5'>
                                <span className='text-xs font-medium text-foreground'>
                                  {takeaway.customer_name || 'Walk-in Customer'}
                                </span>
                                {takeaway.mobile_number ? (
                                  <a
                                    href={`tel:${takeaway.mobile_number}`}
                                    className='inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground'
                                  >
                                    <Phone className='size-3' />
                                    {takeaway.mobile_number}
                                  </a>
                                ) : (
                                  <span className='text-[11px] text-muted-foreground'>
                                    No phone provided
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant='outline'
                                className='bg-background/60 text-xs font-normal'
                              >
                                {takeaway.order_items.length} item
                                {takeaway.order_items.length !== 1 ? 's' : ''}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <div className='flex flex-col gap-0.5'>
                                <span className='text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
                                  {formatCurrency(takeaway.total_amount)}
                                </span>
                                <span className='inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground'>
                                  <CreditCard className='size-3 text-muted-foreground/70' />
                                  {resolvePaymentMethodName(
                                    takeaway.payment_method
                                  )}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge className='gap-1 border-emerald-500/20 bg-emerald-500/10 text-xs font-medium text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'>
                                <CheckCircle2 className='size-3 text-emerald-500' />
                                Paid & Ready
                              </Badge>
                            </TableCell>

                            <TableCell className='text-xs text-muted-foreground'>
                              <div className='flex items-center gap-1.5'>
                                <Clock3 className='size-3.5 text-muted-foreground/70' />
                                <span>
                                  {formatShipmentDate(
                                    takeaway.paid_at || takeaway.created_at
                                  )}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className='text-right'>
                              <Button
                                size='sm'
                                variant='ghost'
                                onClick={() => openTakeawayDetails(takeaway)}
                                className='h-8 gap-1 text-xs font-medium hover:bg-muted'
                              >
                                <Eye className='size-3.5' />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Separator if both sections are shown on 'all' tab */}
          {mainTab === 'all' && (
            <div className='px-4 md:px-6'>
              <Separator />
            </div>
          )}

          {/* SECTION 2: Delivery Shipments Table (Shown on 'shipments' tab or 'all' tab) */}
          {(mainTab === 'shipments' || mainTab === 'all') && (
            <div className='flex flex-col gap-3 p-4 md:p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='flex size-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400'>
                    <Truck className='size-4' />
                  </div>
                  <div>
                    <h3 className='text-base font-semibold tracking-tight text-foreground'>
                      Delivery Queue Shipments
                    </h3>
                    <p className='text-xs text-muted-foreground'>
                      Delivery requests and shipment status tracking.
                    </p>
                  </div>
                </div>

                <Badge variant='outline' className='font-mono text-xs'>
                  {filteredShipments.length} Delivery Shipments
                </Badge>
              </div>

              <div className='overflow-hidden rounded-xl border border-border/60 bg-card'>
                <ScrollArea orientation='horizontal' className='w-full'>
                  <Table className='min-w-[960px]'>
                    <TableHeader className='bg-muted/40'>
                      <TableRow className='hover:bg-transparent'>
                        <TableHead className='w-[130px] text-xs font-semibold'>
                          Order ID
                        </TableHead>
                        <TableHead className='w-[220px] text-xs font-semibold'>
                          Recipient
                        </TableHead>
                        <TableHead className='w-[300px] text-xs font-semibold'>
                          Delivery Address
                        </TableHead>
                        <TableHead className='w-[140px] text-xs font-semibold'>
                          Status
                        </TableHead>
                        <TableHead className='w-[150px] text-xs font-semibold'>
                          Created At
                        </TableHead>
                        <TableHead className='w-[80px] text-right text-xs font-semibold'>
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShipments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className='h-28 text-center'>
                            <div className='flex flex-col items-center justify-center gap-1.5 text-muted-foreground'>
                              <Truck className='size-6 text-muted-foreground/60' />
                              <span className='text-sm font-medium'>
                                No shipments found for this status filter.
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
                            <TableRow
                              key={shipment.id}
                              className='transition-colors hover:bg-muted/30'
                            >
                              <TableCell className='font-mono text-xs text-muted-foreground'>
                                <span className='inline-block max-w-[110px] truncate font-medium text-foreground'>
                                  {orderId}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className='flex flex-col gap-0.5'>
                                  <span className='flex items-center gap-1.5 text-xs font-medium text-foreground'>
                                    <User className='size-3 text-muted-foreground' />
                                    {shipment.recipient_name}
                                  </span>
                                  <a
                                    href={`tel:${shipment.recipient_phone}`}
                                    className='inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground'
                                  >
                                    <Phone className='size-3' />
                                    {shipment.recipient_phone}
                                  </a>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className='flex max-w-[300px] flex-col gap-0.5'>
                                  <span className='flex items-start gap-1.5 text-xs text-foreground'>
                                    <MapPin className='mt-0.5 size-3 shrink-0 text-muted-foreground' />
                                    <span className='line-clamp-2'>
                                      {shipment.delivery_address}
                                    </span>
                                  </span>
                                  <span className='pl-4 text-[11px] text-muted-foreground'>
                                    {[
                                      shipment.city,
                                      shipment.state,
                                      shipment.postal_code,
                                    ]
                                      .filter(Boolean)
                                      .join(', ') || '--'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={statusConfig.variant}
                                  className='gap-1 text-xs font-medium'
                                >
                                  <StatusIcon className='size-3' />
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell className='text-xs text-muted-foreground'>
                                <span className='inline-flex items-center gap-1.5'>
                                  <Clock3 className='size-3.5 text-muted-foreground/70' />
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
                                      <MoreHorizontal className='size-4' />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align='end'
                                    className='w-52'
                                  >
                                    <DropdownMenuGroup>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          openShipmentDetails(shipment.id)
                                        }
                                      >
                                        <Eye className='size-3.5' />
                                        View Details
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
                                              <Loader2 className='size-3.5 animate-spin' />
                                            ) : (
                                              <action.icon className='size-3.5' />
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Takeaway Details Sheet */}
      <Sheet
        open={isViewTakeawayOpen}
        onOpenChange={(open) => {
          setIsViewTakeawayOpen(open)
          if (!open) setActiveTakeaway(null)
        }}
      >
        <SheetContent side='right' className='w-full p-6 sm:max-w-xl'>
          <SheetHeader className='border-b pb-4 text-start'>
            <div className='flex items-center gap-2'>
              <Badge className='border-emerald-500/20 bg-emerald-500/10 text-emerald-600'>
                Takeaway Order
              </Badge>
            </div>
            <SheetTitle className='text-xl font-bold tracking-tight'>
              Order #{activeTakeaway?.order_number}
            </SheetTitle>
            <SheetDescription className='text-xs'>
              Paid takeaway order summary & item breakdown.
            </SheetDescription>
          </SheetHeader>

          {activeTakeaway && (
            <ScrollArea className='mt-4 h-[calc(100vh-10rem)] pr-2'>
              <div className='space-y-5 pb-8'>
                {/* Order Overview Card */}
                <Card className='border-border/60 shadow-xs'>
                  <CardHeader className='bg-muted/20 px-4 pt-4 pb-3'>
                    <CardTitle className='flex items-center justify-between text-sm font-semibold'>
                      <span>Customer & Payment Info</span>
                      <Badge className='bg-emerald-500/10 text-xs font-normal text-emerald-700 dark:text-emerald-300'>
                        <CheckCircle2 className='mr-1 size-3 text-emerald-500' />
                        Paid
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-2.5 p-4 text-xs'>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>
                        Customer Name
                      </span>
                      <span className='font-medium text-foreground'>
                        {activeTakeaway.customer_name || 'Walk-in Customer'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>
                        Mobile Phone
                      </span>
                      <span className='font-medium text-foreground'>
                        {activeTakeaway.mobile_number || '--'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>
                        Payment Method
                      </span>
                      <span className='inline-flex items-center gap-1.5 font-medium text-foreground'>
                        <CreditCard className='size-3.5 text-emerald-500' />
                        {resolvePaymentMethodName(
                          activeTakeaway.payment_method
                        )}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>
                        Paid Timestamp
                      </span>
                      <span className='font-mono text-muted-foreground'>
                        {formatShipmentDate(
                          activeTakeaway.paid_at || activeTakeaway.created_at
                        )}
                      </span>
                    </div>
                    {activeTakeaway.notes && (
                      <div className='mt-2 border-t pt-2'>
                        <span className='mb-1 block text-muted-foreground'>
                          Order Notes:
                        </span>
                        <p className='rounded-md bg-muted/40 p-2 text-foreground italic'>
                          {activeTakeaway.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Items Breakdown Card */}
                <Card className='border-border/60 shadow-xs'>
                  <CardHeader className='bg-muted/20 px-4 pt-4 pb-3'>
                    <CardTitle className='flex items-center justify-between text-sm font-semibold'>
                      <span>Ordered Menu Items</span>
                      <Badge variant='outline' className='text-xs font-normal'>
                        {activeTakeaway.order_items.length} items
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='p-4'>
                    <div className='space-y-3'>
                      {activeTakeaway.order_items.length === 0 ? (
                        <p className='py-2 text-center text-xs text-muted-foreground italic'>
                          No itemized details available for this order.
                        </p>
                      ) : (
                        activeTakeaway.order_items.map((item) => (
                          <div
                            key={item.id}
                            className='flex items-center justify-between gap-3 border-b pb-2.5 text-xs last:border-0 last:pb-0'
                          >
                            <div className='flex flex-col gap-0.5'>
                              <span className='font-medium text-foreground'>
                                {item.menu_item?.name || 'Menu Item'}
                              </span>
                              <span className='text-[11px] text-muted-foreground'>
                                {item.quantity} x{' '}
                                {formatCurrency(item.unit_price)}
                              </span>
                            </div>
                            <span className='font-semibold text-foreground'>
                              {formatCurrency(item.quantity * item.unit_price)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <Separator className='my-3' />

                    {/* Totals Summary */}
                    <div className='space-y-1.5 pt-1 text-xs'>
                      <div className='flex justify-between text-muted-foreground'>
                        <span>Subtotal</span>
                        <span>{formatCurrency(activeTakeaway.subtotal)}</span>
                      </div>
                      {activeTakeaway.discount_amount > 0 && (
                        <div className='flex justify-between text-emerald-600 dark:text-emerald-400'>
                          <span>Discount</span>
                          <span>
                            -{formatCurrency(activeTakeaway.discount_amount)}
                          </span>
                        </div>
                      )}
                      {activeTakeaway.tax_amount > 0 && (
                        <div className='flex justify-between text-muted-foreground'>
                          <span>Tax</span>
                          <span>
                            +{formatCurrency(activeTakeaway.tax_amount)}
                          </span>
                        </div>
                      )}
                      <div className='mt-2 flex justify-between border-t pt-2 text-sm font-bold text-foreground'>
                        <span>Total Paid</span>
                        <span className='text-emerald-600 dark:text-emerald-400'>
                          {formatCurrency(activeTakeaway.total_amount)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* 5. Shipment Details Sheet */}
      <Sheet
        open={isViewShipmentOpen}
        onOpenChange={(open) => {
          setIsViewShipmentOpen(open)
          if (!open) setActiveShipmentId(null)
        }}
      >
        <SheetContent side='right' className='w-full p-6 sm:max-w-2xl'>
          <SheetHeader className='border-b pb-4 text-start'>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className='border-blue-500/30 text-blue-600 dark:text-blue-400'
              >
                Delivery Shipment
              </Badge>
            </div>
            <SheetTitle className='text-xl font-bold tracking-tight'>
              Shipment Details
            </SheetTitle>
            <SheetDescription className='text-xs'>
              Delivery tracking and recipient overview.
            </SheetDescription>
          </SheetHeader>

          <div className='mt-4 flex h-[calc(100vh-10rem)] flex-col'>
            {isShipmentDetailLoading || isShipmentDetailFetching ? (
              <div className='flex h-full flex-col items-center justify-center gap-3 text-muted-foreground'>
                <Loader2 className='size-8 animate-spin text-primary' />
                <p className='text-xs'>Loading shipment details...</p>
              </div>
            ) : isShipmentDetailError ? (
              <div className='space-y-4'>
                <Alert variant='destructive'>
                  <AlertTriangle className='size-4' />
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
                  size='sm'
                  onClick={() => void refetchShipmentDetail()}
                >
                  <RefreshCw className='mr-1.5 size-3.5' />
                  Retry
                </Button>
              </div>
            ) : !shipmentDetail ? (
              <div className='flex h-full items-center justify-center text-xs text-muted-foreground'>
                No shipment details found.
              </div>
            ) : (
              <ScrollArea className='h-full pr-2'>
                <div className='space-y-5 pb-8'>
                  {/* Shipment Info Card */}
                  <Card className='border-border/60 shadow-xs'>
                    <CardHeader className='bg-muted/20 px-4 pt-4 pb-3'>
                      <CardTitle className='flex items-center justify-between text-sm font-semibold'>
                        <span>Shipment Status</span>
                        <Badge
                          variant={
                            getStatusConfig(shipmentDetail.shipment.status)
                              .variant
                          }
                          className='gap-1 text-xs'
                        >
                          {
                            getStatusConfig(shipmentDetail.shipment.status)
                              .label
                          }
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2.5 p-4 text-xs'>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>
                          Recipient Name
                        </span>
                        <span className='font-medium text-foreground'>
                          {shipmentDetail.shipment.recipient_name}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>Phone</span>
                        <a
                          href={`tel:${shipmentDetail.shipment.recipient_phone}`}
                          className='font-medium text-primary hover:underline'
                        >
                          {shipmentDetail.shipment.recipient_phone}
                        </a>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>
                          Delivery Address
                        </span>
                        <span className='max-w-[240px] text-right font-medium text-foreground'>
                          {shipmentDetail.shipment.delivery_address}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>
                          City / State
                        </span>
                        <span className='text-muted-foreground'>
                          {[
                            shipmentDetail.shipment.city,
                            shipmentDetail.shipment.state,
                          ]
                            .filter(Boolean)
                            .join(', ') || '--'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Details Card */}
                  {shipmentDetail.order && (
                    <Card className='border-border/60 shadow-xs'>
                      <CardHeader className='bg-muted/20 px-4 pt-4 pb-3'>
                        <CardTitle className='flex items-center justify-between text-sm font-semibold'>
                          <span>Associated Order</span>
                          <span className='font-mono text-xs text-muted-foreground'>
                            #
                            {shipmentDetail.order.order_number ||
                              shipmentDetail.order.id}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='space-y-3 p-4'>
                        {shipmentDetail.order.payment_method && (
                          <div className='flex items-center justify-between border-b pb-2 text-xs'>
                            <span className='text-muted-foreground'>
                              Payment Method
                            </span>
                            <span className='inline-flex items-center gap-1.5 font-medium text-foreground'>
                              <CreditCard className='size-3.5 text-emerald-500' />
                              {resolvePaymentMethodName(
                                shipmentDetail.order.payment_method
                              )}
                            </span>
                          </div>
                        )}
                        <div className='space-y-2 text-xs'>
                          {shipmentDetail.order.order_items.map((item) => (
                            <div
                              key={item.id}
                              className='flex items-center justify-between border-b pb-2 last:border-0 last:pb-0'
                            >
                              <div>
                                <span className='block font-medium text-foreground'>
                                  {item.menu_item?.name || 'Menu Item'}
                                </span>
                                <span className='text-[11px] text-muted-foreground'>
                                  Qty: {item.quantity || 1}
                                </span>
                              </div>
                              <span className='font-semibold text-foreground'>
                                {formatCurrency(
                                  Number(item.quantity || 1) *
                                    Number(item.unit_price || 0)
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
