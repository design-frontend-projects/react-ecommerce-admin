import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Warehouse,
  Store,
  Package,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  ClipboardCheck,
  Calendar,
  Loader2,
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { AdjustmentListItem } from '../data/schema'
import {
  useAdjustment,
  useApplyAdjustment,
  useCancelAdjustment,
} from '../hooks/use-stock-adjustments'
import {
  AdjustmentApprovalFlow,
  getAdjustmentApprovalTier,
} from './adjustment-approval-flow'

export function AdjustmentViewDialog({
  adjustment,
  open,
  onOpenChange,
}: {
  adjustment: AdjustmentListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: detail, isLoading } = useAdjustment(
    open ? adjustment.id : undefined
  )
  const applyAdjustment = useApplyAdjustment()
  const cancelAdjustment = useCancelAdjustment()

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [showConfirmApprove, setShowConfirmApprove] = useState(false)
  const [showConfirmReject, setShowConfirmReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Prefer enriched detail when loaded, fallback to list item
  const activeAdjustment = detail ?? adjustment

  const items = detail?.stock_adjustment_items ?? []

  const totalDeltaUnits =
    items.reduce((acc, it) => acc + Number(it.qty_adjusted || 0), 0) || 0

  const totalImpactCost =
    items.reduce(
      (acc, it) =>
        acc + Number(it.qty_adjusted || 0) * Number(it.unit_cost || 0),
      0
    ) || 0

  const locationName =
    activeAdjustment.warehouses?.name ??
    activeAdjustment.stores?.name ??
    (activeAdjustment.warehouse_id ? 'Warehouse' : activeAdjustment.store_id ? 'Store' : 'All Facilities')

  const locationCode =
    activeAdjustment.warehouses?.code ?? activeAdjustment.stores?.code ?? null

  const isWarehouse = Boolean(activeAdjustment.warehouse_id)

  const isPending =
    activeAdjustment.status === 'draft' ||
    activeAdjustment.status === 'pending'

  const tierInfo = getAdjustmentApprovalTier(totalImpactCost)

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const handleApprove = async () => {
    try {
      await applyAdjustment.mutateAsync(activeAdjustment.id)
      setShowConfirmApprove(false)
    } catch {
      // Handled in mutation onError
    }
  }

  const handleReject = async () => {
    try {
      await cancelAdjustment.mutateAsync(activeAdjustment.id)
      setShowConfirmReject(false)
      setRejectReason('')
    } catch {
      // Handled in mutation onError
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'damage':
        return <AlertTriangle className='h-3.5 w-3.5 text-amber-500 mr-1.5 shrink-0' />
      case 'stocktake':
        return <ClipboardCheck className='h-3.5 w-3.5 text-blue-500 mr-1.5 shrink-0' />
      default:
        return <SlidersHorizontal className='h-3.5 w-3.5 text-emerald-500 mr-1.5 shrink-0' />
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
          {/* Header */}
          <DialogHeader className='p-6 pb-4 border-b bg-card shrink-0'>
            <div className='flex flex-wrap items-center justify-between gap-3 pr-6'>
              <div className='flex flex-wrap items-center gap-2.5'>
                <DialogTitle className='text-xl font-bold tracking-tight'>
                  ADJ-{activeAdjustment.id.slice(0, 8).toUpperCase()}
                </DialogTitle>

                <Badge variant='outline' className='capitalize inline-flex items-center text-xs py-0.5 px-2.5'>
                  {getTypeIcon(activeAdjustment.type)}
                  {activeAdjustment.type}
                </Badge>

                <Badge
                  variant='secondary'
                  className='inline-flex items-center gap-1.5 text-xs py-0.5 px-2.5'
                >
                  {isWarehouse ? (
                    <Warehouse className='h-3.5 w-3.5 text-blue-500' />
                  ) : (
                    <Store className='h-3.5 w-3.5 text-amber-500' />
                  )}
                  <span>{locationName}</span>
                  {locationCode ? (
                    <span className='text-[10px] opacity-70 font-mono'>
                      ({locationCode})
                    </span>
                  ) : null}
                </Badge>
              </div>

              <StatusBadge status={activeAdjustment.status} />
            </div>

            <DialogDescription className='text-xs text-muted-foreground pt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1'>
              <span className='inline-flex items-center gap-1'>
                <Calendar className='h-3 w-3' />
                Created:{' '}
                <span className='font-medium text-foreground'>
                  {new Date(activeAdjustment.created_at).toLocaleDateString(
                    undefined,
                    { year: 'numeric', month: 'short', day: 'numeric' }
                  )}
                </span>
              </span>
              {activeAdjustment.approved_at && (
                <span className='inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium'>
                  <CheckCircle2 className='h-3 w-3' />
                  Applied:{' '}
                  {new Date(activeAdjustment.approved_at).toLocaleDateString(
                    undefined,
                    { year: 'numeric', month: 'short', day: 'numeric' }
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Body */}
          <ScrollArea className='flex-1 p-6 space-y-5 overflow-y-auto'>
            {/* KPI Summary Cards */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              <div className='p-3.5 rounded-lg border bg-card/60 shadow-xs space-y-1'>
                <div className='flex items-center justify-between text-muted-foreground'>
                  <span className='text-xs font-medium'>Adjusted Lines</span>
                  <Layers className='h-4 w-4 text-primary opacity-80' />
                </div>
                <div className='text-lg font-bold tracking-tight'>
                  {isLoading ? '...' : items.length}
                  <span className='text-xs font-normal text-muted-foreground ml-1'>
                    Items
                  </span>
                </div>
              </div>

              <div className='p-3.5 rounded-lg border bg-card/60 shadow-xs space-y-1'>
                <div className='flex items-center justify-between text-muted-foreground'>
                  <span className='text-xs font-medium'>Net Delta</span>
                  {totalDeltaUnits >= 0 ? (
                    <TrendingUp className='h-4 w-4 text-emerald-600' />
                  ) : (
                    <TrendingDown className='h-4 w-4 text-rose-600' />
                  )}
                </div>
                <div
                  className={`text-lg font-bold tracking-tight ${
                    totalDeltaUnits >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {totalDeltaUnits > 0 ? '+' : ''}
                  {totalDeltaUnits.toLocaleString()}
                  <span className='text-xs font-normal text-muted-foreground ml-1'>
                    Units
                  </span>
                </div>
              </div>

              <div className='p-3.5 rounded-lg border bg-card/60 shadow-xs space-y-1'>
                <div className='flex items-center justify-between text-muted-foreground'>
                  <span className='text-xs font-medium'>Impact Valuation</span>
                  <DollarSign className='h-4 w-4 text-emerald-600 opacity-80' />
                </div>
                <div className='text-lg font-bold tracking-tight text-foreground'>
                  ${Math.abs(totalImpactCost).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className='p-3.5 rounded-lg border bg-card/60 shadow-xs space-y-1'>
                <div className='flex items-center justify-between text-muted-foreground'>
                  <span className='text-xs font-medium'>Policy Level</span>
                  <ShieldCheck className='h-4 w-4 text-primary opacity-80' />
                </div>
                <div className='flex items-center gap-1.5'>
                  <Badge variant='outline' className={`text-[11px] font-semibold ${tierInfo.color}`}>
                    {tierInfo.tier.split(' ')[0]} {tierInfo.tier.split(' ')[1]}
                  </Badge>
                </div>
              </div>
            </div>

            {/* ABAC Approval Flow Banner */}
            <AdjustmentApprovalFlow
              adjustmentId={activeAdjustment.id}
              status={activeAdjustment.status}
              totalImpactValue={totalImpactCost}
              storeName={locationName}
              onSuccess={() => onOpenChange(false)}
            />

            {/* Status Announcement if finalized */}
            {activeAdjustment.status === 'approved' && (
              <div className='p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2'>
                <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0' />
                <span>
                  This adjustment has been <strong>approved and posted</strong>. Stock balances have been updated and movements recorded.
                </span>
              </div>
            )}

            {activeAdjustment.status === 'cancelled' && (
              <div className='p-3.5 rounded-lg border border-rose-200 bg-rose-50/60 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2'>
                <XCircle className='h-4 w-4 text-rose-600 shrink-0' />
                <span>
                  This adjustment has been <strong>cancelled</strong>. No stock balance changes were executed.
                </span>
              </div>
            )}

            {/* Line Items Section */}
            <div className='space-y-3 pt-2'>
              <div className='flex items-center justify-between text-xs font-semibold text-muted-foreground px-1'>
                <span>Adjustment Line Items ({items.length})</span>
                <span className='text-[11px] font-normal'>
                  Click rows to toggle extended variant specifications
                </span>
              </div>

              {isLoading ? (
                <div className='flex flex-col items-center justify-center py-12 text-sm text-muted-foreground space-y-2 border rounded-lg'>
                  <Loader2 className='h-6 w-6 animate-spin text-primary' />
                  <span>Loading adjustment line details...</span>
                </div>
              ) : items.length === 0 ? (
                <div className='p-8 text-center text-sm text-muted-foreground border rounded-lg'>
                  No item lines found on this adjustment.
                </div>
              ) : (
                <>
                  {/* Desktop Data Table */}
                  <div className='hidden sm:block overflow-hidden rounded-lg border bg-card'>
                    <Table>
                      <TableHeader>
                        <TableRow className='bg-muted/40 hover:bg-muted/40 text-[11px] uppercase tracking-wider'>
                          <TableHead className='w-8'></TableHead>
                          <TableHead className='min-w-[220px]'>Product & Variant</TableHead>
                          <TableHead className='text-center w-20'>UOM</TableHead>
                          <TableHead className='text-end w-20'>Before</TableHead>
                          <TableHead className='text-end w-20'>After</TableHead>
                          <TableHead className='text-end w-24'>Delta (Δ)</TableHead>
                          <TableHead className='text-end w-24'>Unit Cost</TableHead>
                          <TableHead className='text-end w-28'>Impact ($)</TableHead>
                          <TableHead className='w-28'>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const isExpanded = Boolean(expandedItems[item.id])
                          const lineImpact =
                            Number(item.qty_adjusted || 0) *
                            Number(item.unit_cost || 0)

                          const variant = item.product_variants
                          const product = variant?.products
                          const productName = product?.name || 'Product Variant'
                          const variantSku = variant?.sku || item.product_variant_id
                          const variantName = variant?.name
                          const uomName = product?.uom || 'PCS'
                          const delta = Number(item.qty_adjusted || 0)

                          return (
                            <TableRow
                              key={item.id}
                              className='text-xs hover:bg-muted/30 cursor-pointer transition-colors'
                              onClick={() => toggleExpand(item.id)}
                            >
                              <TableCell className='py-3 pl-3 pr-0'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-5 w-5 p-0'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpand(item.id)
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className='h-3.5 w-3.5' />
                                  ) : (
                                    <ChevronRight className='h-3.5 w-3.5' />
                                  )}
                                </Button>
                              </TableCell>

                              {/* Product & Variant Cell */}
                              <TableCell className='py-3'>
                                <div className='space-y-1'>
                                  <div className='font-semibold text-foreground leading-tight'>
                                    {productName}
                                  </div>
                                  <div className='flex flex-wrap items-center gap-1.5'>
                                    <Badge
                                      variant='secondary'
                                      className='font-mono text-[10px] px-1.5 py-0 font-normal'
                                    >
                                      {variantSku}
                                    </Badge>
                                    {variantName && variantName !== productName && (
                                      <span className='text-[11px] text-muted-foreground'>
                                        {variantName}
                                      </span>
                                    )}
                                  </div>
                                  {isExpanded && (
                                    <div className='pt-2 mt-2 border-t text-[11px] text-muted-foreground grid grid-cols-2 gap-2 bg-muted/20 p-2 rounded'>
                                      {product?.brands?.name && (
                                        <div>
                                          Brand: <span className='font-medium text-foreground'>{product.brands.name}</span>
                                        </div>
                                      )}
                                      {product?.categories?.name && (
                                        <div>
                                          Category: <span className='font-medium text-foreground'>{product.categories.name}</span>
                                        </div>
                                      )}
                                      {variant?.barcode && (
                                        <div>
                                          Barcode: <span className='font-mono text-foreground'>{variant.barcode}</span>
                                        </div>
                                      )}
                                      {item.batch_id && (
                                        <div>
                                          Batch ID: <span className='font-mono text-foreground'>{item.batch_id.slice(0, 8)}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              {/* UOM */}
                              <TableCell className='text-center py-3 text-[11px] text-muted-foreground font-medium'>
                                {uomName}
                              </TableCell>

                              {/* Before */}
                              <TableCell className='text-end py-3 text-muted-foreground font-mono'>
                                {Number(item.qty_before).toLocaleString()}
                              </TableCell>

                              {/* After */}
                              <TableCell className='text-end py-3 font-semibold font-mono text-foreground'>
                                {Number(item.qty_after).toLocaleString()}
                              </TableCell>

                              {/* Delta */}
                              <TableCell
                                className={`text-end py-3 font-bold font-mono ${
                                  delta >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {delta > 0 ? '+' : ''}
                                {delta.toLocaleString()}
                              </TableCell>

                              {/* Unit Cost */}
                              <TableCell className='text-end py-3 text-muted-foreground font-mono'>
                                ${Number(item.unit_cost || 0).toFixed(2)}
                              </TableCell>

                              {/* Impact Cost */}
                              <TableCell className='text-end py-3 font-medium text-foreground font-mono'>
                                ${Math.abs(lineImpact).toFixed(2)}
                              </TableCell>

                              {/* Reason */}
                              <TableCell className='py-3'>
                                <Badge
                                  variant='outline'
                                  className='capitalize text-[10px] font-normal px-2 py-0.5'
                                >
                                  {item.reason ? item.reason.replace(/_/g, ' ') : 'Other'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards Layout */}
                  <div className='sm:hidden space-y-2.5'>
                    {items.map((item) => {
                      const variant = item.product_variants
                      const product = variant?.products
                      const productName = product?.name || 'Product Variant'
                      const variantSku = variant?.sku || item.product_variant_id
                      const delta = Number(item.qty_adjusted || 0)
                      const lineImpact = delta * Number(item.unit_cost || 0)

                      return (
                        <div
                          key={item.id}
                          className='p-3.5 rounded-lg border bg-card space-y-2 text-xs'
                        >
                          <div className='flex items-start justify-between gap-2'>
                            <div>
                              <div className='font-semibold text-foreground leading-snug'>
                                {productName}
                              </div>
                              <div className='font-mono text-[10px] text-muted-foreground mt-0.5'>
                                SKU: {variantSku}
                              </div>
                            </div>
                            <Badge
                              variant='outline'
                              className='capitalize text-[10px] shrink-0'
                            >
                              {item.reason ? item.reason.replace(/_/g, ' ') : '—'}
                            </Badge>
                          </div>

                          <div className='grid grid-cols-3 gap-2 pt-1 border-t text-center font-mono'>
                            <div className='p-1.5 rounded bg-muted/30'>
                              <div className='text-[10px] text-muted-foreground'>Before</div>
                              <div className='font-medium'>{item.qty_before}</div>
                            </div>
                            <div className='p-1.5 rounded bg-muted/30'>
                              <div className='text-[10px] text-muted-foreground'>After</div>
                              <div className='font-bold'>{item.qty_after}</div>
                            </div>
                            <div
                              className={`p-1.5 rounded ${
                                delta >= 0
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              }`}
                            >
                              <div className='text-[10px] opacity-75'>Delta</div>
                              <div className='font-bold'>
                                {delta > 0 ? '+' : ''}
                                {delta}
                              </div>
                            </div>
                          </div>

                          <div className='flex items-center justify-between text-[11px] pt-1 text-muted-foreground'>
                            <span>Unit Cost: ${Number(item.unit_cost || 0).toFixed(2)}</span>
                            <span className='font-semibold text-foreground'>
                              Impact: ${Math.abs(lineImpact).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Notes Section */}
            {activeAdjustment.notes ? (
              <div className='p-3.5 rounded-lg bg-muted/30 border text-xs space-y-1.5'>
                <span className='font-semibold text-foreground flex items-center gap-1.5'>
                  <Package className='h-3.5 w-3.5 text-muted-foreground' />
                  Adjustment Notes & Remarks
                </span>
                <p className='text-muted-foreground leading-relaxed pl-5'>
                  {activeAdjustment.notes}
                </p>
              </div>
            ) : null}
          </ScrollArea>

          {/* Footer Actions */}
          <DialogFooter className='p-4 border-t bg-card/90 flex flex-wrap items-center justify-between gap-2 shrink-0'>
            <div className='flex items-center gap-2'>
              {isPending && (
                <>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='text-destructive hover:bg-destructive/10 gap-1.5'
                    onClick={() => setShowConfirmReject(true)}
                    disabled={cancelAdjustment.isPending || applyAdjustment.isPending}
                  >
                    <XCircle className='h-4 w-4' />
                    Cancel Adjustment
                  </Button>

                  <Button
                    type='button'
                    size='sm'
                    className='bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-sm'
                    onClick={() => setShowConfirmApprove(true)}
                    disabled={applyAdjustment.isPending || cancelAdjustment.isPending}
                  >
                    {applyAdjustment.isPending ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <CheckCircle2 className='h-4 w-4' />
                    )}
                    Approve & Apply to Stock
                  </Button>
                </>
              )}
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Approve & Post to Stock */}
      <AlertDialog open={showConfirmApprove} onOpenChange={setShowConfirmApprove}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <div className='flex items-center gap-2 text-emerald-600'>
              <CheckCircle2 className='h-5 w-5' />
              <AlertDialogTitle>Approve & Apply Stock Adjustment</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className='space-y-2 pt-2 text-sm text-muted-foreground'>
                <p>
                  Are you sure you want to approve adjustment{' '}
                  <strong className='text-foreground'>
                    #{activeAdjustment.id.slice(0, 8).toUpperCase()}
                  </strong>{' '}
                  for <strong className='text-foreground'>{locationName}</strong>?
                </p>
                <div className='p-3 rounded-md bg-muted/60 text-xs space-y-1.5'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Adjusted Items:</span>
                    <span className='font-bold text-foreground'>{items.length} lines</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Net Unit Delta:</span>
                    <span className='font-bold text-foreground'>
                      {totalDeltaUnits > 0 ? '+' : ''}
                      {totalDeltaUnits} units
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Total Valuation Impact:</span>
                    <span className='font-bold text-foreground'>
                      ${Math.abs(totalImpactCost).toFixed(2)}
                    </span>
                  </div>
                </div>
                <p className='text-[11px] text-muted-foreground pt-1'>
                  This will atomically update <code>stock_balances</code> and log immutable records in <code>inventory_movements</code>.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyAdjustment.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-emerald-600 hover:bg-emerald-700 text-white'
              onClick={handleApprove}
              disabled={applyAdjustment.isPending}
            >
              {applyAdjustment.isPending ? 'Applying...' : 'Confirm & Apply'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog: Cancel Adjustment */}
      <AlertDialog open={showConfirmReject} onOpenChange={setShowConfirmReject}>
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <div className='flex items-center gap-2 text-destructive'>
              <XCircle className='h-5 w-5' />
              <AlertDialogTitle>Cancel Stock Adjustment</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className='space-y-2 pt-2 text-sm text-muted-foreground'>
                <p>
                  Are you sure you want to cancel adjustment{' '}
                  <strong className='text-foreground'>
                    #{activeAdjustment.id.slice(0, 8).toUpperCase()}
                  </strong>? This will void the adjustment without altering stock balances.
                </p>
                <div className='space-y-1.5 pt-2'>
                  <Label htmlFor='reject-reason' className='text-xs'>
                    Cancellation Note (Optional)
                  </Label>
                  <Textarea
                    id='reject-reason'
                    placeholder='Reason for cancelling...'
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className='text-xs'
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelAdjustment.isPending}>
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive hover:bg-destructive/90 text-white'
              onClick={handleReject}
              disabled={cancelAdjustment.isPending}
            >
              {cancelAdjustment.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
