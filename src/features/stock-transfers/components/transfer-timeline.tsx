import React from 'react'
import { useTranslation } from 'react-i18next'
import { WorkflowStepper, type WorkflowStep } from '@/components/shared/workflow-stepper'

interface TransferTimelineProps {
  status: string
  createdAt?: string | null
  approvedAt?: string | null
  shippedAt?: string | null
  receivedAt?: string | null
  updatedAt?: string | null
  className?: string
}

export function TransferTimeline({
  status,
  createdAt,
  approvedAt,
  shippedAt,
  receivedAt,
  updatedAt,
  className,
}: TransferTimelineProps) {
  const { t } = useTranslation()
  const isCancelled = status === 'cancelled'
  const isRejected = status === 'rejected'

  let currentKey = status
  if (status === 'cancelled' || status === 'rejected') {
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
      key: 'approved',
      title: t('stockTransfers.timeline.approved.title', 'Approved'),
      description: t('stockTransfers.timeline.approved.description', 'Approved for picking'),
      timestamp: approvedAt ? new Date(approvedAt).toLocaleDateString() : undefined,
    },
    {
      key: 'picked',
      title: t('stockTransfers.timeline.picked.title', 'Picked'),
      description: t('stockTransfers.timeline.picked.description', 'Stock picked'),
    },
    {
      key: 'in_transit',
      title: t('stockTransfers.timeline.in_transit.title', 'In Transit'),
      description: t('stockTransfers.timeline.in_transit.description', 'Shipped to destination'),
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
      title: t('stockTransfers.timeline.completed.title', 'Completed'),
      description: t('stockTransfers.timeline.completed.description', 'Transfer finalized'),
      timestamp: status === 'completed' && updatedAt ? new Date(updatedAt).toLocaleDateString() : undefined,
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
