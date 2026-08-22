import React from 'react'
import { Check, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WorkflowStep {
  key: string
  title: string
  description?: string
  timestamp?: string | null
  actor?: string | null
}

interface WorkflowStepperProps {
  steps: WorkflowStep[]
  currentStepKey: string
  isCancelled?: boolean
  isRejected?: boolean
  className?: string
  onStepClick?: (stepKey: string) => void
}

export function WorkflowStepper({
  steps,
  currentStepKey,
  isCancelled = false,
  isRejected = false,
  className,
  onStepClick,
}: WorkflowStepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStepKey)
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex

  return (
    <div className={cn('w-full py-3', className)}>
      <div className="relative flex items-center justify-between">
        {/* Connection Bar */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full -z-0">
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              isCancelled || isRejected ? 'bg-destructive/60' : 'bg-primary'
            )}
            style={{
              width: `${(effectiveIndex / Math.max(steps.length - 1, 1)) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, idx) => {
          const isCompleted = idx < effectiveIndex && !isCancelled && !isRejected
          const isCurrent = idx === effectiveIndex
          const isPending = idx > effectiveIndex

          return (
            <div
              key={step.key}
              className={cn(
                'relative flex flex-col items-center group cursor-default z-10',
                onStepClick && 'cursor-pointer'
              )}
              onClick={() => onStepClick?.(step.key)}
            >
              {/* Step Circle */}
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm bg-background',
                  isCompleted &&
                    'border-primary bg-primary text-primary-foreground font-semibold',
                  isCurrent &&
                    !isCancelled &&
                    !isRejected &&
                    'border-primary ring-4 ring-primary/20 text-primary font-bold bg-background',
                  (isCancelled || isRejected) &&
                    isCurrent &&
                    'border-destructive ring-4 ring-destructive/20 text-destructive bg-destructive/10',
                  isPending && 'border-muted text-muted-foreground bg-muted/40'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : isCurrent && (isCancelled || isRejected) ? (
                  <AlertCircle className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4 animate-pulse text-primary" />
                ) : (
                  <span className="text-xs font-medium">{idx + 1}</span>
                )}
              </div>

              {/* Step Label */}
              <div className="absolute top-10 flex flex-col items-center w-28 text-center">
                <span
                  className={cn(
                    'text-xs font-medium transition-colors line-clamp-1',
                    isCurrent && 'text-foreground font-bold',
                    isCompleted && 'text-foreground/90 font-semibold',
                    isPending && 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
                {step.timestamp && (
                  <span className="text-[10px] text-muted-foreground/80 mt-0.5 whitespace-nowrap">
                    {step.timestamp}
                  </span>
                )}
                {step.actor && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                    {step.actor}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {/* Spacer for bottom labels */}
      <div className="h-9" />
    </div>
  )
}
