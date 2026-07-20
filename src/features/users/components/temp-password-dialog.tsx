import { useState } from 'react'
import { Check, Copy, Share2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface TempPasswordDetails {
  email: string
  password: string
}

interface TempPasswordDialogProps {
  /** Non-null while the credential is revealed; null closes the dialog. */
  details: TempPasswordDetails | null
  onClose: () => void
}

/**
 * Reveal-once dialog for a server-generated temporary password.
 *
 * The plaintext is shown a single time (it is never persisted server-side). Closing the
 * dialog clears it from the parent's state via {@link onClose}; a new credential requires an
 * explicit password reset.
 */
export function TempPasswordDialog({ details, onClose }: TempPasswordDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!details) return
    try {
      await navigator.clipboard.writeText(details.password)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      toast.success('Temporary password copied.')
    } catch {
      toast.error('Unable to copy. Select and copy the password manually.')
    }
  }

  const handleShare = async () => {
    if (!details) return
    const text = `Sign-in email: ${details.email}\nTemporary password: ${details.password}\n\nYou will be asked to set a new password at first sign-in.`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Account credentials', text })
        return
      } catch {
        // User dismissed the share sheet, or sharing is unavailable — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Credentials copied to clipboard.')
    } catch {
      toast.error('Unable to share. Copy the password manually.')
    }
  }

  return (
    <Dialog
      open={details !== null}
      onOpenChange={(next) => {
        if (!next) {
          setCopied(false)
          onClose()
        }
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-start'>
          <DialogTitle>User created</DialogTitle>
          <DialogDescription>
            Share these credentials with the user now. The temporary password is shown once and
            cannot be retrieved again.
          </DialogDescription>
        </DialogHeader>

        {details && (
          <div className='space-y-3'>
            <div className='space-y-1'>
              <p className='text-xs font-medium text-muted-foreground'>Email</p>
              <p className='rounded-md border bg-muted/40 px-3 py-2 text-sm break-all'>
                {details.email}
              </p>
            </div>
            <div className='space-y-1'>
              <p className='text-xs font-medium text-muted-foreground'>
                Temporary password
              </p>
              <div className='flex items-center gap-2'>
                <code className='flex-1 rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm break-all'>
                  {details.password}
                </code>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  onClick={handleCopy}
                  aria-label='Copy temporary password'
                >
                  {copied ? (
                    <Check className='h-4 w-4 text-green-600' />
                  ) : (
                    <Copy className='h-4 w-4' />
                  )}
                </Button>
              </div>
            </div>
            <div className='flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400'>
              <TriangleAlert className='mt-0.5 h-4 w-4 shrink-0' />
              <span>
                The user must set a new password the first time they sign in.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className='gap-2 sm:gap-2'>
          <Button type='button' variant='outline' onClick={handleShare}>
            <Share2 className='mr-2 h-4 w-4' />
            Share
          </Button>
          <Button type='button' onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
