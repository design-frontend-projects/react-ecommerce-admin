import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  RotateCcw,
  Plus,
  ShieldAlert,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefundListTable } from './RefundListTable'
import { RefundApprovalQueue } from './RefundApprovalQueue'
import { POSRefundWorkflowModal } from './POSRefundWorkflowModal'
import { useCanRefundAction, useRefundsList } from '../hooks/useRefunds'

export function POSRefundsManagementView() {
  const { t } = useTranslation()
  const [isNewRefundOpen, setIsNewRefundOpen] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'queue'>('history')

  const canCreate = useCanRefundAction('create')
  const canApprove = useCanRefundAction('approve')
  const canView = useCanRefundAction('view')

  // Query pending approvals count for the badge
  const { data: queueData } = useRefundsList({
    status: 'pending_approval',
    pageSize: 1,
    enabled: canApprove,
  })
  const pendingCount = queueData?.total ?? 0

  if (!canView) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center bg-card">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <h3 className="text-base font-semibold text-foreground">
          {t('pos.refunds.noAccess', 'Access Restricted')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          {t(
            'pos.refunds.noAccessDesc',
            'You do not have permission to view POS refunds and returns. Contact your store administrator for authorization.'
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col space-y-4 overflow-y-auto p-1 sm:p-2">
      {/* Top Banner & Primary Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {t('pos.refunds.title', 'POS Refunds & Returns')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                'pos.refunds.subtitle',
                'Manage sales invoice returns, manager approvals, item restocks, and disbursement lifecycle.'
              )}
            </p>
          </div>
        </div>

        {/* Action Button: Hidden completely if unauthorized */}
        {canCreate && (
          <Button
            onClick={() => setIsNewRefundOpen(true)}
            className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>{t('pos.refunds.newRefund', 'New Return / Refund')}</span>
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      <Tabs
        value={activeSubTab}
        onValueChange={(val) => setActiveSubTab(val as 'history' | 'queue')}
        className="flex flex-1 flex-col space-y-3 min-h-0"
      >
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger
              value="history"
              className="gap-2 text-xs font-medium px-3 data-[state=active]:bg-background"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>{t('pos.refunds.tabAll', 'All Refunds & Returns')}</span>
            </TabsTrigger>

            {/* Approval Queue Tab: Only visible if user has approval rights */}
            {canApprove && (
              <TabsTrigger
                value="queue"
                className="gap-2 text-xs font-medium px-3 data-[state=active]:bg-background"
              >
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>{t('pos.refunds.tabQueue', 'Approval Queue')}</span>
                {pendingCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1.5 text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="history" className="mt-0 min-h-0 outline-none">
          <div className="rounded-lg border bg-card p-4 shadow-xs">
            <RefundListTable />
          </div>
        </TabsContent>

        {canApprove && (
          <TabsContent value="queue" className="mt-0 min-h-0 outline-none">
            <div className="rounded-lg border bg-card p-4 shadow-xs">
              <RefundApprovalQueue />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* New Refund Workflow Modal */}
      {canCreate && (
        <POSRefundWorkflowModal
          open={isNewRefundOpen}
          onOpenChange={setIsNewRefundOpen}
        />
      )}
    </div>
  )
}
