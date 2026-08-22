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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AdjustmentListItem } from '../data/schema'
import { useAdjustment } from '../hooks/use-stock-adjustments'
import { AdjustmentApprovalFlow } from './adjustment-approval-flow'

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

  const totalDeltaUnits = detail?.stock_adjustment_items?.reduce(
    (acc, it) => acc + Number(it.qty_adjusted || 0),
    0
  ) || 0

  const totalImpactCost = detail?.stock_adjustment_items?.reduce(
    (acc, it) =>
      acc + Number(it.qty_adjusted || 0) * Number(it.unit_cost || 0),
    0
  ) || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center justify-between gap-3 pr-6'>
            <div className='flex items-center gap-2'>
              <DialogTitle className='text-lg font-bold'>
                Adjustment #{adjustment.id.slice(0, 8)}
              </DialogTitle>
              <Badge variant='outline' className='capitalize'>
                {adjustment.type}
              </Badge>
            </div>
            <StatusBadge status={adjustment.status} />
          </div>
          <DialogDescription className='text-xs pt-1'>
            Location:{' '}
            <span className='font-semibold text-foreground'>
              {adjustment.stores?.name ?? '—'}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Tiered Approval Workflow Component */}
        <AdjustmentApprovalFlow
          adjustmentId={adjustment.id}
          status={adjustment.status}
          totalImpactValue={totalImpactCost}
          storeName={adjustment.stores?.name}
          onSuccess={() => onOpenChange(false)}
        />

        {/* Items Table */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-xs font-semibold text-muted-foreground'>
            <span>Adjusted Lines ({detail?.stock_adjustment_items?.length || 0})</span>
            <span>
              Net Delta:{' '}
              <span
                className={
                  totalDeltaUnits >= 0
                    ? 'text-emerald-600 font-bold'
                    : 'text-rose-600 font-bold'
                }
              >
                {totalDeltaUnits > 0 ? '+' : ''}
                {totalDeltaUnits} Units
              </span>
            </span>
          </div>

          {isLoading ? (
            <p className='text-sm text-muted-foreground py-6 text-center'>
              Loading items...
            </p>
          ) : (
            <div className='overflow-hidden rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/40'>
                    <TableHead className='text-xs'>Product / Variant</TableHead>
                    <TableHead className='text-xs text-end'>Before</TableHead>
                    <TableHead className='text-xs text-end'>After</TableHead>
                    <TableHead className='text-xs text-end'>Delta (Δ)</TableHead>
                    <TableHead className='text-xs text-end'>Impact ($)</TableHead>
                    <TableHead className='text-xs'>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.stock_adjustment_items.map((item) => {
                    const lineImpact =
                      Number(item.qty_adjusted || 0) * Number(item.unit_cost || 0)
                    return (
                      <TableRow key={item.id} className='text-xs'>
                        <TableCell className='font-medium'>
                          {item.product_variants?.sku ?? item.product_variant_id}
                        </TableCell>
                        <TableCell className='text-end text-muted-foreground'>
                          {item.qty_before}
                        </TableCell>
                        <TableCell className='text-end font-semibold'>
                          {item.qty_after}
                        </TableCell>
                        <TableCell
                          className={
                            item.qty_adjusted >= 0
                              ? 'text-end font-bold text-emerald-600'
                              : 'text-end font-bold text-rose-600'
                          }
                        >
                          {item.qty_adjusted > 0 ? '+' : ''}
                          {item.qty_adjusted}
                        </TableCell>
                        <TableCell className='text-end font-medium text-foreground'>
                          ${Math.abs(lineImpact).toFixed(2)}
                        </TableCell>
                        <TableCell className='text-muted-foreground capitalize text-[11px]'>
                          {item.reason ?? '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {adjustment.notes ? (
          <div className='p-3 rounded-md bg-muted/40 text-xs space-y-1'>
            <span className='font-semibold text-foreground'>Adjustment Notes:</span>
            <p className='text-muted-foreground'>{adjustment.notes}</p>
          </div>
        ) : null}

        <DialogFooter className='pt-2 border-t'>
          <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
