import React from 'react'
import { WorkflowStepper, type WorkflowStep } from '@/components/shared/workflow-stepper'

const TRANSFER_STEPS: WorkflowStep[] = [
  { key: 'draft', title: 'Draft', description: 'Created' },
  { key: 'requested', title: 'Requested', description: 'Submitted for approval' },
  { key: 'approved', title: 'Approved', description: 'Approved by source WH' },
  { key: 'picked', title: 'Picked', description: 'Stock picked' },
  { key: 'in_transit', title: 'In Transit', description: 'Shipped to dest' },
  { key: 'received', title: 'Received', description: 'Arrived at dest' },
  { key: 'completed', title: 'Completed', description: 'Stock ledger updated' },
]

interface TransferTimelineProps {
  status: string
  createdAt?: string | null
  updatedAt?: string | null
  className?: string
}

export function TransferTimeline({
  status,
  createdAt,
  updatedAt,
  className,
}: TransferTimelineProps) {
  const isCancelled = status === 'cancelled'
  const isRejected = status === 'rejected'

  // Map backend status to stepper keys
  let currentKey = status
  if (status === 'cancelled' || status === 'rejected') {
    currentKey = 'draft'
  }

  // Update timestamps if available
  const steps = TRANSFER_STEPS.map((s) => {
    if (s.key === 'draft' && createdAt) {
      return { ...s, timestamp: new Date(createdAt).toLocaleDateString() }
    }
    if (s.key === status && updatedAt) {
      return { ...s, timestamp: new Date(updatedAt).toLocaleDateString() }
    }
    return s
  })

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
