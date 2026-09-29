import React from 'react'
import { useTranslation } from 'react-i18next'
import { WorkflowStepper, type WorkflowStep } from '@/components/shared/workflow-stepper'

interface TransferTimelineProps {
  status: string
  createdAt?: string | null
  requestedAt?: string | null
  approvedAt?: string | null
  shippedAt?: string | null
  receivedAt?: string | null
  updatedAt?: string | null
  className?: string
}

export function TransferTimeline({
  status,
  createdAt,
  requestedAt,
  approvedAt,
  shippedAt,
  receivedAt,
  updatedAt,
  className,
}: TransferTimelineProps) {
  const { t } = useTranslation()
  const isCancelled = status === 'cancelled'
  const isRejected = status === 'rejected'

  let currentKey = 'draft'
  if (status === 'pending_approval') {
    currentKey = 'pending_approval'
  } else if (status === 'approved') {
    currentKey = 'approved'
  } else if (status === 'ready_to_ship' || status === 'picked') {
    currentKey = 'picked'
  } else if (
    status === 'partially_shipped' ||
    status === 'shipped' ||
    status === 'in_transit'
  ) {
    currentKey = 'in_transit'
  } else if (status === 'partially_received' || status === 'received') {
    currentKey = 'received'
  } else if (status === 'closed' || status === 'completed') {
    currentKey = 'completed'
  } else if (isCancelled || isRejected) {
    currentKey = 'draft'
  }

  const steps: WorkflowStep[] = [
    {
      key: 'draft',
      title: t('stockTransfers.timeline.draft.title', 'Draft'),
      description: t('stockTransfers.timeline.draft.description', 'Created'),
      timestamp: createdAt ? new Date(createdAt).toLocaleDateString() : undefined,
    },
    {
      key: 'pending_approval',
      title: t('stockTransfers.timeline.pendingApproval.title', 'Pending Approval'),
      description: t('stockTransfers.timeline.pendingApproval.description', 'Submitted for review'),
      timestamp: requestedAt ? new Date(requestedAt).toLocaleDateString() : undefined,
    },
    {
      key: 'approved',
      title: t('stockTransfers.timeline.approved.title', 'Approved'),
      description: t('stockTransfers.timeline.approved.description', 'Authorized for dispatch'),
      timestamp: approvedAt ? new Date(approvedAt).toLocaleDateString() : undefined,
    },
    {
      key: 'picked',
      title: t('stockTransfers.timeline.picked.title', 'Picked & Staged'),
      description: t('stockTransfers.timeline.picked.description', 'Ready to ship'),
    },
    {
      key: 'in_transit',
      title: t('stockTransfers.timeline.in_transit.title', 'Shipped'),
      description: t('stockTransfers.timeline.in_transit.description', 'In Logistics Transit'),
      timestamp: shippedAt ? new Date(shippedAt).toLocaleDateString() : undefined,
    },
    {
      key: 'received',
      title: t('stockTransfers.timeline.received.title', 'Received'),
      description: t('stockTransfers.timeline.received.description', 'Arrived & stock posted'),
      timestamp: receivedAt ? new Date(receivedAt).toLocaleDateString() : undefined,
    },
    {
      key: 'completed',
      title: t('stockTransfers.timeline.completed.title', 'Closed'),
      description: t('stockTransfers.timeline.completed.description', 'Reconciled & finalized'),
      timestamp:
        (status === 'completed' || status === 'closed') && updatedAt
          ? new Date(updatedAt).toLocaleDateString()
          : undefined,
    },
  ]

  return (
    <WorkflowStepper
      steps={steps}
      currentStepKey={currentKey}
      isCancelled={isCancelled}
      isRejected={isRejected}
      className={className}
    />
  )
}
