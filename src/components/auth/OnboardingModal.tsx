import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OnboardingForm } from '@/components/auth/OnboardingForm'
import type { OnboardingFormData } from '@/lib/validation/onboarding'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { telemetry } from '@/lib/telemetry'

interface OnboardingModalProps {
  open: boolean
  onSuccess: () => void
}

export function OnboardingModal({ open, onSuccess }: OnboardingModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const user = useAuthStore((state) => state.auth.user)

  const handleSubmit = async (data: OnboardingFormData) => {
    setIsLoading(true)
    try {
      // In a real implementation this would call the trpc/api route
      const response = await fetch('/api/tenant/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to complete onboarding')
      }

      telemetry.track('onboarding_completed')
      toast.success('Workspace setup complete!')
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during setup')
    } finally {
      setIsLoading(false)
    }
  }

  // Prevents closing by clicking outside or pressing Escape
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) return // Prevent closing
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Welcome to Bluewave POS</DialogTitle>
          <DialogDescription>
            Let's set up your workspace. This information will be used for billing and location settings.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <OnboardingForm 
            onSubmit={handleSubmit} 
            isLoading={isLoading} 
            defaultEmail={user?.email} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
