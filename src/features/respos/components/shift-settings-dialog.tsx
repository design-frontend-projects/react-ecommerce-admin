// Tenant-configurable shift thresholds (specs/026): variance threshold with
// required comment, stale-flag hours, and auto-close hours.
import { useState } from 'react'
import { Loader2, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useShiftSettings, useUpdateShiftSettings } from '../api/shift-hooks'
import { toMoneyString, type ShiftSettingsDto } from '../data/shift-schemas'

interface ShiftSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId?: string | null
}

export function ShiftSettingsDialog({
  open,
  onOpenChange,
  restaurantId,
}: ShiftSettingsDialogProps) {
  const { data: settings } = useShiftSettings(restaurantId, null, {
    enabled: open,
  })

  // Mount the form only once settings are loaded so state initializes from
  // the saved values; remount when the dialog reopens.
  if (!open || !settings) {
    return null
  }

  return (
    <SettingsDialogContent
      settings={settings}
      onOpenChange={onOpenChange}
      restaurantId={restaurantId}
    />
  )
}

function SettingsDialogContent({
  settings,
  onOpenChange,
  restaurantId,
}: {
  settings: ShiftSettingsDto
  onOpenChange: (open: boolean) => void
  restaurantId?: string | null
}) {
  const { t } = useTranslation()
  const updateSettings = useUpdateShiftSettings()

  const [varianceThreshold, setVarianceThreshold] = useState(
    settings.varianceThreshold
  )
  const [requireComment, setRequireComment] = useState(
    settings.requireCommentOverThreshold
  )
  const [staleHours, setStaleHours] = useState(String(settings.staleShiftHours))
  const [autoCloseHours, setAutoCloseHours] = useState(
    String(settings.autoCloseHours)
  )

  const staleInvalid =
    !Number.isInteger(Number(staleHours)) || Number(staleHours) < 1
  const autoCloseInvalid =
    !Number.isInteger(Number(autoCloseHours)) ||
    Number(autoCloseHours) <= Number(staleHours)

  const handleSubmit = async () => {
    if (staleInvalid || autoCloseInvalid) return
    try {
      await updateSettings.mutateAsync({
        restaurantId: restaurantId ?? null,
        varianceThreshold: toMoneyString(Number(varianceThreshold) || 0),
        requireCommentOverThreshold: requireComment,
        staleShiftHours: Number(staleHours),
        autoCloseHours: Number(autoCloseHours),
      })
      toast.success(t('shifts.settings.success', 'Shift settings saved'))
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('shifts.settings.error', 'Unable to save shift settings')
      )
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Settings2 className='h-5 w-5 text-muted-foreground' />
            {t('shifts.settings.title', 'Shift Settings')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'shifts.settings.desc',
              'Cash variance and abandoned-shift thresholds for this restaurant.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='settings-threshold'>
              {t('shifts.settings.varianceThreshold', 'Variance threshold')}
            </Label>
            <Input
              id='settings-threshold'
              type='number'
              step='0.01'
              min='0'
              value={varianceThreshold}
              onChange={(event) => setVarianceThreshold(event.target.value)}
            />
            <p className='text-xs text-muted-foreground'>
              {t(
                'shifts.settings.varianceThresholdHint',
                'Closing with an absolute variance above this amount flags the shift for review.'
              )}
            </p>
          </div>

          <div className='flex items-center justify-between rounded-lg border p-3'>
            <div className='space-y-0.5'>
              <Label>
                {t('shifts.settings.requireComment', 'Require comment')}
              </Label>
              <p className='text-xs text-muted-foreground'>
                {t(
                  'shifts.settings.requireCommentHint',
                  'Employees must explain variances above the threshold.'
                )}
              </p>
            </div>
            <Switch
              checked={requireComment}
              onCheckedChange={setRequireComment}
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='settings-stale'>
                {t('shifts.settings.staleHours', 'Flag as stale after (hours)')}
              </Label>
              <Input
                id='settings-stale'
                type='number'
                min='1'
                step='1'
                value={staleHours}
                onChange={(event) => setStaleHours(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='settings-autoclose'>
                {t(
                  'shifts.settings.autoCloseHours',
                  'Auto-close after (hours)'
                )}
              </Label>
              <Input
                id='settings-autoclose'
                type='number'
                min='2'
                step='1'
                value={autoCloseHours}
                onChange={(event) => setAutoCloseHours(event.target.value)}
              />
            </div>
          </div>
          {autoCloseInvalid && !staleInvalid && (
            <p className='text-sm text-destructive'>
              {t(
                'shifts.settings.autoCloseInvalid',
                'Auto-close must be later than the stale threshold.'
              )}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={updateSettings.isPending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={
              staleInvalid || autoCloseInvalid || updateSettings.isPending
            }
            className='gap-2'
          >
            {updateSettings.isPending && (
              <Loader2 className='h-4 w-4 animate-spin' />
            )}
            {t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
