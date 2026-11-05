import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, ShieldAlert, ShieldCheck, UserCheck, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Numpad } from './numpad'
import { useAuthStore } from '@/stores/auth-store'
import { usePosStore } from '../store/use-pos-store'
import { useVerifyUserPinMutation, useVerifyManagerPinMutation } from '../hooks/use-pos-queries'

interface ManagerAuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (authData?: { userId?: string; userName?: string }) => void
  targetUserId?: string
  title?: string
  description?: string
  actionDescription?: string
  requiredPermission?: string
  isLoading?: boolean
}

export function ManagerAuthDialog({
  open,
  onOpenChange,
  onSuccess,
  targetUserId,
  title,
  description,
  requiredPermission = 'pos.refund.create',
  isLoading = false,
}: ManagerAuthDialogProps) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [useManagerOverride, setUseManagerOverride] = useState(false)

  const profile = useAuthStore((state) => state.auth.profile)
  const { session, terminal } = usePosStore()

  const verifyUserPinMutation = useVerifyUserPinMutation()
  const verifyManagerPinMutation = useVerifyManagerPinMutation()

  const isVerifying = verifyUserPinMutation.isPending || verifyManagerPinMutation.isPending || isLoading

  // Effective user ID to authenticate: explicitly passed, or current session cashier, or logged-in profile
  const effectiveUserId = targetUserId || session?.cashier_id || profile?.id || ''

  const handleKeyPress = (key: string) => {
    if (isVerifying || isLocked) return
    setErrorMessage(null)
    if (pin.length < 8) {
      setPin((prev) => prev + key)
    }
  }

  const handleBackspace = () => {
    if (isVerifying) return
    setErrorMessage(null)
    setPin((prev) => prev.slice(0, -1))
  }

  const handleVerify = async () => {
    if (isVerifying || pin.length < 4) return

    setErrorMessage(null)

    try {
      if (useManagerOverride) {
        const result = await verifyManagerPinMutation.mutateAsync({
          managerUserId: effectiveUserId,
          pin,
          requiredPermission,
          terminalId: terminal?.id,
          sessionId: session?.id,
        })

        if (!result.valid) {
          setErrorMessage(result.error || 'Manager authorization failed')
          if (result.locked) setIsLocked(true)
          setPin('')
          return
        }

        toast.success(
          result.userName
            ? t('pos.managerAuth.managerAuthorized', 'Manager authorized: {{name}}', { name: result.userName })
            : t('pos.managerAuth.authorizedToast', 'Manager authorized')
        )
        onSuccess({ userId: result.tenantUserId, userName: result.userName })
        setPin('')
        onOpenChange(false)
      } else {
        const result = await verifyUserPinMutation.mutateAsync({
          userId: effectiveUserId,
          pin,
          terminalId: terminal?.id,
          sessionId: session?.id,
        })

        if (!result.valid) {
          setErrorMessage(result.error || t('pos.managerAuth.invalidPin', 'Invalid PIN'))
          if (result.locked) setIsLocked(true)
          setPin('')
          return
        }

        toast.success(
          result.userName
            ? t('pos.managerAuth.userAuthorized', 'PIN verified: {{name}}', { name: result.userName })
            : t('pos.managerAuth.authorizedToast', 'Authorized')
        )
        onSuccess({ userId: result.tenantUserId, userName: result.userName })
        setPin('')
        onOpenChange(false)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authorization verification failed')
      setPin('')
    }
  }

  const handleClose = () => {
    setPin('')
    setErrorMessage(null)
    setIsLocked(false)
    setUseManagerOverride(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <div className='mx-auto mb-2 rounded-full bg-primary/10 p-3'>
            {useManagerOverride ? (
              <ShieldCheck className='h-6 w-6 text-primary' />
            ) : (
              <KeyRound className='h-6 w-6 text-primary' />
            )}
          </div>
          <DialogTitle className='text-center'>
            {title ||
              (useManagerOverride
                ? t('pos.managerAuth.title', 'Manager Authorization Required')
                : t('pos.userAuth.title', 'Security PIN Verification'))}
          </DialogTitle>
          <DialogDescription className='text-center'>
            {description ||
              (useManagerOverride
                ? t('pos.managerAuth.desc', 'Please enter manager authorization PIN.')
                : t('pos.userAuth.desc', 'Enter your assigned POS PIN to authorize this operation.'))}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4 py-2'>
          <div className='relative'>
            <Input
              type='password'
              value={pin}
              readOnly
              disabled={isVerifying || isLocked}
              className={`h-16 text-center text-4xl tracking-[1em] font-mono ${
                errorMessage ? 'border-destructive ring-destructive' : ''
              }`}
              placeholder='••••'
            />
            {errorMessage && (
              <div className='absolute top-1/2 right-3 -translate-y-1/2'>
                <XCircle className='h-6 w-6 text-destructive' />
              </div>
            )}
          </div>

          {errorMessage && (
            <div className='flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive'>
              <ShieldAlert className='h-4 w-4 shrink-0' />
              <span>{errorMessage}</span>
            </div>
          )}

          <Numpad
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            onEnter={pin.length >= 4 ? handleVerify : undefined}
          />
        </div>

        <div className='flex items-center justify-between border-t pt-3'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              setUseManagerOverride(!useManagerOverride)
              setPin('')
              setErrorMessage(null)
            }}
            className='text-xs text-muted-foreground hover:text-foreground'
          >
            {useManagerOverride
              ? t('pos.auth.useCashierPin', '← Use Cashier PIN')
              : t('pos.auth.useManagerOverride', 'Manager Override?')}
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={handleClose}
            disabled={isVerifying}
          >
            {t('pos.cartSection.cancel', 'Cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
