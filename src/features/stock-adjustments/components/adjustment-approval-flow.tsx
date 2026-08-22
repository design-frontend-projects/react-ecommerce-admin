import { ShieldCheck, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ApprovalButtonGroup } from '@/components/shared/approval-button'
import {
  useApplyAdjustment,
  useCancelAdjustment,
} from '../hooks/use-stock-adjustments'

interface AdjustmentApprovalFlowProps {
  adjustmentId: string
  status: string
  totalImpactValue: number
  storeName?: string | null
  onSuccess?: () => void
  className?: string
}

export function getAdjustmentApprovalTier(value: number): {
  tier: string
  roleRequired: string
  color: string
  description: string
} {
  const absVal = Math.abs(value)
  if (absVal <= 500) {
    return {
      tier: 'Tier 1 (≤$500)',
      roleRequired: 'Warehouse Manager / Lead',
      color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      description: 'Standard operational threshold',
    }
  }
  if (absVal <= 5000) {
    return {
      tier: 'Tier 2 ($500 - $5,000)',
      roleRequired: 'Branch Manager / Operations Head',
      color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      description: 'Managerial sign-off required',
    }
  }
  return {
    tier: 'Tier 3 (>$5,000)',
    roleRequired: 'Executive Director / Finance Head',
    color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    description: 'High-value variance review required',
  }
}

export function AdjustmentApprovalFlow({
  adjustmentId,
  status,
  totalImpactValue,
  storeName,
  onSuccess,
  className,
}: AdjustmentApprovalFlowProps) {
  const applyAdjustment = useApplyAdjustment()
  const cancelAdjustment = useCancelAdjustment()
  const tierInfo = getAdjustmentApprovalTier(totalImpactValue)

  const isPendingApproval = status === 'draft' || status === 'submitted'

  const handleApprove = async () => {
    await applyAdjustment.mutateAsync(adjustmentId)
    onSuccess?.()
  }

  const handleReject = async () => {
    await cancelAdjustment.mutateAsync(adjustmentId)
    onSuccess?.()
  }

  return (
    <div className={`space-y-3 p-3 rounded-lg border bg-muted/20 ${className || ''}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground">ABAC Approval Policy:</span>
          <Badge variant="outline" className={tierInfo.color}>
            {tierInfo.tier}
          </Badge>
        </div>

        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <UserCheck className="h-3.5 w-3.5" />
          Required: <span className="font-medium text-foreground">{tierInfo.roleRequired}</span>
        </span>
      </div>

      {isPendingApproval && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t flex-wrap">
          <div className="text-xs text-muted-foreground">
            Net Value Impact:{' '}
            <span className="font-bold text-foreground">
              ${Math.abs(totalImpactValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <ApprovalButtonGroup
            permission={['inventory.stock.manage', 'inventory.adjustment.approve']}
            entityTitle="Stock Adjustment"
            entityReference={`Adj #${adjustmentId.slice(0, 8)} (${storeName || 'Store'})`}
            amount={Math.abs(totalImpactValue)}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={applyAdjustment.isPending || cancelAdjustment.isPending}
          />
        </div>
      )}
    </div>
  )
}
