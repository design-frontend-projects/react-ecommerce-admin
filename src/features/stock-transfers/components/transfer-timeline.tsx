import React from 'react'
import { WorkflowStepper, type WorkflowStep } from '@/components/shared/workflow-stepper'

const TRANSFER_STEPS: WorkflowStep[] = [
  { key: 'draft', title: 'Draft', description: 'Created' },
  { key: 'approved', title: 'Approved', description: 'Approved for picking' },
  { key: 'picked', title: 'Picked', description: 'Stock picked' },
  { key: 'in_transit', title: 'In Transit', description: 'Shipped to destination' },
  { key: 'received', title: 'Received', description: 'Arrived & stock posted' },
  { key: 'completed', title: 'Completed', description: 'Transfer finalized' },
]

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
  const isCancelled = status === 'cancelled'
  const isRejected = status === 'rejected'

  let currentKey = status
  if (status === 'cancelled' || status === 'rejected') {
    currentKey = 'draft'
  }

  const steps = TRANSFER_STEPS.map((s) => {
    if (s.key === 'draft' && createdAt) {
      return { ...s, timestamp: new Date(createdAt).toLocaleDateString() }
    }
    if (s.key === 'approved' && approvedAt) {
      return { ...s, timestamp: new Date(approvedAt).toLocaleDateString() }
    }
    if (s.key === 'in_transit' && shippedAt) {
      return { ...s, timestamp: new Date(shippedAt).toLocaleDateString() }
    }
    if (s.key === 'received' && receivedAt) {
      return { ...s, timestamp: new Date(receivedAt).toLocaleDateString() }
    }
    if (s.key === 'completed' && status === 'completed' && updatedAt) {
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
