import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Share2, TriangleAlert, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  phone?: string
  name?: string
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
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  const [phone, setPhone] = useState(details?.phone || '')

  // Sync phone if details change
  if (details && details.phone && phone !== details.phone && !phone) {
    setPhone(details.phone)
  }

  const handleCopy = async () => {
    if (!details) return
    try {
      await navigator.clipboard.writeText(details.password)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      toast.success(t('users.tempPasswordDialog.copiedToast', 'Temporary password copied!'))
    } catch {
      toast.error(t('users.tempPasswordDialog.copyErrorToast', 'Failed to copy password.'))
    }
  }

  const getShareMessage = () => {
    if (!details) return ''
    const greeting = details.name ? `Hello ${details.name},\n\n` : 'Hello,\n\n'
    return `${greeting}Your login credentials for the portal:\n` +
      `🌐 Portal: ${window.location.origin}\n` +
      `📧 Email: ${details.email}\n` +
      `🔑 Temporary Password: ${details.password}\n\n` +
      `⚠️ Please log in and change your password immediately upon your first sign-in.`
  }

  const handleCopyAll = async () => {
    if (!details) return
    const text = getShareMessage()
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAll(true)
      window.setTimeout(() => setCopiedAll(false), 2000)
      toast.success(t('users.tempPasswordDialog.credentialsCopiedToast', 'All credentials copied to clipboard!'))
    } catch {
      toast.error(t('users.tempPasswordDialog.shareErrorToast', 'Failed to copy credentials.'))
    }
  }

  const handleWhatsAppShare = () => {
    if (!details) return
    const text = getShareMessage()
    const targetPhone = (phone || details.phone || '').replace(/[^0-9]/g, '')
    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleShare = async () => {
    if (!details) return
    const text = getShareMessage()
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Account credentials', text })
        return
      } catch {
        // User dismissed the share sheet, fall through
      }
    }
    await handleCopyAll()
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
          <DialogTitle>{t('users.tempPasswordDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('users.tempPasswordDialog.desc')}
          </DialogDescription>
        </DialogHeader>

        {details && (
          <div className='space-y-4'>
            <div className='space-y-1'>
              <Label className='text-xs font-medium text-muted-foreground'>
                {t('users.tempPasswordDialog.email', 'Email')}
              </Label>
              <p className='rounded-md border bg-muted/40 px-3 py-2 text-sm break-all font-medium'>
                {details.email}
              </p>
            </div>

            <div className='space-y-1'>
              <Label className='text-xs font-medium text-muted-foreground'>
                {t('users.tempPasswordDialog.tempPassword', 'Temporary Password')}
              </Label>
              <div className='flex items-center gap-2'>
                <code className='flex-1 rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm break-all font-semibold text-primary'>
                  {details.password}
                </code>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  onClick={handleCopy}
                  title='Copy temporary password'
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

            <div className='space-y-1'>
              <Label htmlFor='whatsapp-phone' className='text-xs font-medium text-muted-foreground'>
                {t('users.tempPasswordDialog.recipientPhone', 'WhatsApp / Phone Number')}
              </Label>
              <div className='flex items-center gap-2'>
                <Input
                  id='whatsapp-phone'
                  type='tel'
                  placeholder='+1234567890'
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className='h-9 text-sm'
                />
                <Button
                  type='button'
                  onClick={handleWhatsAppShare}
                  className='bg-[#25D366] hover:bg-[#1EBE5D] text-white font-medium shrink-0 h-9 px-3 gap-1.5'
                  title='Share directly via WhatsApp'
                >
                  <MessageCircle className='h-4 w-4' />
                  <span>WhatsApp</span>
                </Button>
              </div>
              <p className='text-[11px] text-muted-foreground'>
                {t('users.tempPasswordDialog.whatsappHelp', 'Enter international phone number (e.g. +966...) to open WhatsApp chat directly with credentials.')}
              </p>
            </div>

            <div className='flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400'>
              <TriangleAlert className='mt-0.5 h-4 w-4 shrink-0' />
              <span>
                {t('users.tempPasswordDialog.mustSetPassword')}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className='flex-col sm:flex-row gap-2 sm:gap-2'>
          <Button type='button' variant='outline' onClick={handleCopyAll} className='gap-2'>
            {copiedAll ? <Check className='h-4 w-4 text-green-600' /> : <Copy className='h-4 w-4' />}
            {t('users.tempPasswordDialog.copyAll', 'Copy Credentials')}
          </Button>
          <Button type='button' variant='outline' onClick={handleShare}>
            <Share2 className='mr-2 h-4 w-4' />
            {t('users.tempPasswordDialog.share', 'Share')}
          </Button>
          <Button type='button' onClick={onClose}>
            {t('users.tempPasswordDialog.done', 'Done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
