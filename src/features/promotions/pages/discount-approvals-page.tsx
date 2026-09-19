import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useDiscountApprovalRequests,
  useReviewDiscountApproval,
} from '../hooks/use-inv-approvals'
import type { ApprovalStatus } from '../types'

interface ApprovalRequestItem {
  id: string
  created_at: string | Date
  reviewed_at?: string | Date | null
  original_amount: number | string
  discount_value: number | string
  discount_amount: number | string
  discount_type: string
  user_max_allowed_percent: number | string
  reason: string
  rejection_reason?: string | null
  status: ApprovalStatus
  branches?: { name: string } | null
  pos_terminals?: { name: string } | null
}

export function DiscountApprovalsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('pending')
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const { data: approvalsData, isLoading } = useDiscountApprovalRequests({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const reviewMutation = useReviewDiscountApproval()

  const handleApprove = async (requestId: string) => {
    try {
      await reviewMutation.mutateAsync({
        requestId,
        approved: true,
      })
      toast.success(t('promotions.approvalsPage.approvedSuccess', 'Discount request approved'))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('promotions.approvalsPage.approvalFailed', 'Approval failed')
      toast.error(msg)
    }
  }

  const handleOpenReject = (requestId: string) => {
    setSelectedRequestId(requestId)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!selectedRequestId) return
    if (!rejectionReason.trim()) {
      toast.error(t('promotions.approvalsPage.enterRejectionReason', 'Please enter a rejection reason'))
      return
    }

    try {
      await reviewMutation.mutateAsync({
        requestId: selectedRequestId,
        approved: false,
        rejectionReason,
      })
      toast.success(t('promotions.approvalsPage.rejectedSuccess', 'Discount request rejected'))
      setRejectModalOpen(false)
      setSelectedRequestId(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('promotions.approvalsPage.rejectionFailed', 'Rejection failed')
      toast.error(msg)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header fixed>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/promotions' })}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">
            {t('promotions.approvalsPage.headerTitle', 'Discount Approvals')}
          </span>
        </div>
        <div className="ms-auto flex items-center space-x-4">
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className="flex-1 flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('promotions.approvalsPage.title', 'Discount Approval Queue')}
              </h1>
              <span className="text-xs bg-amber-500/10 text-amber-600 font-semibold px-2 py-0.5 rounded-full">
                {t('promotions.approvalsPage.badge', 'RBAC Supervisor Guard')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t(
                'promotions.approvalsPage.description',
                'Review and authorize high-value POS manual discounts exceeding cashier limits.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val: string) => setStatusFilter(val as ApprovalStatus | 'all')}
            >
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder={t('promotions.approvalsPage.status', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('promotions.approvalsPage.allRequests', 'All Requests')}
                </SelectItem>
                <SelectItem value="pending">
                  {t('promotions.approvalsPage.pending', 'Pending')}
                </SelectItem>
                <SelectItem value="approved">
                  {t('promotions.approvalsPage.approved', 'Approved')}
                </SelectItem>
                <SelectItem value="rejected">
                  {t('promotions.approvalsPage.rejected', 'Rejected')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Queue Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : approvalsData?.data?.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium">
                  {t(
                    'promotions.approvalsPage.noRequests',
                    'No discount requests waiting for approval.'
                  )}
                </p>
                <p className="text-xs">
                  {t(
                    'promotions.approvalsPage.noRequestsDesc',
                    'Cashier discount requests requiring manager override will appear here.'
                  )}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-left bg-muted/20">
                      <th className="py-3 px-4">
                        {t('promotions.approvalsPage.requestedAt', 'Requested At')}
                      </th>
                      <th className="py-3 px-4">
                        {t('promotions.approvalsPage.branchTerminal', 'Branch & Terminal')}
                      </th>
                      <th className="py-3 px-4">
                        {t('promotions.approvalsPage.originalAmount', 'Original Amount')}
                      </th>
                      <th className="py-3 px-4">
                        {t('promotions.approvalsPage.discountRequested', 'Discount Requested')}
                      </th>
                      <th className="py-3 px-4">
                        {t('promotions.approvalsPage.allowedLimit', 'Allowed Limit')}
                      </th>
                      <th className="py-3 px-4">
                        {t('promotions.approvalsPage.reason', 'Reason')}
                      </th>
                      <th className="py-3 px-4">
                        {t('promotions.approvalsPage.status', 'Status')}
                      </th>
                      <th className="py-3 px-4 text-right">
                        {t('promotions.approvalsPage.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(approvalsData?.data as ApprovalRequestItem[])?.map((req) => {
                      const isPending = req.status === 'pending'
                      return (
                        <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="font-medium text-foreground block">
                                {new Date(req.created_at).toLocaleDateString()}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(req.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="font-medium text-foreground block">
                                {req.branches?.name || t('promotions.approvalsPage.mainBranch', 'Main Branch')}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {req.pos_terminals?.name || t('promotions.approvalsPage.posTerminal', 'POS Terminal')}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-semibold">
                            {Number(req.original_amount).toLocaleString()} {t('common.qar', 'QAR')}
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="font-bold text-amber-600 dark:text-amber-400 block">
                                {Number(req.discount_value)}% ({Number(req.discount_amount).toLocaleString()} {t('common.qar', 'QAR')})
                              </span>
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {req.discount_type}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[11px]">
                              {t('promotions.approvalsPage.maxAllowed', {
                                percent: Number(req.user_max_allowed_percent),
                                defaultValue: `Max ${Number(req.user_max_allowed_percent)}%`,
                              })}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {req.reason}
                            </p>
                            {req.rejection_reason && (
                              <p className="text-[11px] text-destructive mt-1 italic">
                                {t('promotions.approvalsPage.rejectionPrefix', 'Rejection:')}{' '}
                                {req.rejection_reason}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                req.status === 'approved'
                                  ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                                  : req.status === 'rejected'
                                  ? 'border-destructive/30 text-destructive bg-destructive/10'
                                  : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                              }
                            >
                              {t(`promotions.common.${req.status}`, req.status)}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprove(req.id)}
                                  disabled={reviewMutation.isPending}
                                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-1"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  {t('promotions.approvalsPage.approve', 'Approve')}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenReject(req.id)}
                                  disabled={reviewMutation.isPending}
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  {t('promotions.approvalsPage.reject', 'Reject')}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                {t('promotions.approvalsPage.reviewed', {
                                  date: req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : '',
                                  defaultValue: `Reviewed ${req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : ''}`,
                                })}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DIALOG: Reject with Reason */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                {t('promotions.approvalsPage.rejectDialogTitle', 'Reject Discount Request')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'promotions.approvalsPage.rejectDialogDesc',
                  'Provide a reason for declining this cashier manual discount request.'
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Label htmlFor="rejectionReason">
                {t('promotions.approvalsPage.rejectionNoteLabel', 'Rejection Note *')}
              </Label>
              <Textarea
                id="rejectionReason"
                rows={3}
                placeholder={t(
                  'promotions.approvalsPage.rejectionNotePlaceholder',
                  'e.g. Exceeds customer margin threshold; maximum approved is 15%.'
                )}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
              >
                {t('promotions.common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={reviewMutation.isPending}
                className="gap-2"
              >
                {reviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('promotions.approvalsPage.confirmRejection', 'Confirm Rejection')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Main>
    </div>
  )
}
