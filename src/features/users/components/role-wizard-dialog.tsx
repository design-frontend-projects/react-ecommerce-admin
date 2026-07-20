import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useScreens } from '@/features/access-control/hooks/use-screens'
import type { Permission } from '../data/schema'

type WizardStep = 'details' | 'permissions' | 'review'

const STEP_ORDER: WizardStep[] = ['details', 'permissions', 'review']

const STEP_TITLES: Record<WizardStep, string> = {
  details: 'Name the role',
  permissions: 'Choose what it can do',
  review: 'Review and create',
}

interface RoleWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  permissions: Permission[]
  isSubmitting?: boolean
  /**
   * Creates the role then assigns the selected permissions. Resolves once
   * both steps succeed so the wizard can close.
   */
  onSubmit: (input: {
    name: string
    description?: string
    permissionIds: string[]
  }) => Promise<void>
}

/**
 * Guided role creation: details -> permissions grouped by module/screen ->
 * review. Grouping comes from the access-control catalog (app_modules /
 * app_screens / screen_permissions); permissions the catalog does not map to
 * any screen are collected under "Other" so nothing is hidden.
 */
export function RoleWizardDialog({
  open,
  onOpenChange,
  permissions,
  isSubmitting = false,
  onSubmit,
}: RoleWizardDialogProps) {
  const screensQuery = useScreens(open)

  const [step, setStep] = useState<WizardStep>('details')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Reset when the dialog transitions closed -> open.
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep('details')
      setName('')
      setDescription('')
      setSelected(new Set())
    }
  }

  const permissionById = new Map(permissions.map((p) => [p.id, p]))
  const permissionByName = new Map(permissions.map((p) => [p.name, p]))

  // Group permissions by module -> screen using the catalog.
  const groups: Array<{
    moduleName: string
    screens: Array<{ screenName: string; permissionIds: string[] }>
  }> = []
  const claimed = new Set<string>()

  for (const module of screensQuery.data?.modules ?? []) {
    const screens: Array<{ screenName: string; permissionIds: string[] }> = []

    for (const screen of module.screens) {
      const ids = [
        ...screen.permissionIds,
        ...screen.buttons.map(
          (button) => permissionByName.get(button.permissionName)?.id
        ),
      ].filter((id): id is string => !!id && permissionById.has(id))

      const unique = [...new Set(ids)]
      if (unique.length === 0) continue
      unique.forEach((id) => claimed.add(id))
      screens.push({ screenName: screen.name, permissionIds: unique })
    }

    if (screens.length > 0) {
      groups.push({ moduleName: module.name, screens })
    }
  }

  const unclaimed = permissions
    .filter((permission) => !claimed.has(permission.id))
    .map((permission) => permission.id)
  if (unclaimed.length > 0) {
    groups.push({
      moduleName: 'Other',
      screens: [{ screenName: 'Ungrouped permissions', permissionIds: unclaimed }],
    })
  }

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleMany = (ids: string[], checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const trimmedName = name.trim()
  const canAdvance =
    step === 'details' ? trimmedName.length > 0 : step === 'permissions'

  const stepIndex = STEP_ORDER.indexOf(step)

  const handleNext = () => {
    const next = STEP_ORDER[stepIndex + 1]
    if (next) setStep(next)
  }

  const handleBack = () => {
    const previous = STEP_ORDER[stepIndex - 1]
    if (previous) setStep(previous)
  }

  const handleCreate = async () => {
    await onSubmit({
      name: trimmedName,
      description: description.trim() || undefined,
      permissionIds: [...selected],
    })
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => !isSubmitting && onOpenChange(value)}
    >
      <DialogContent className='max-h-[85vh] overflow-hidden sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {STEP_TITLES[step]}{' '}
            <span className='text-sm font-normal text-muted-foreground'>
              (step {stepIndex + 1} of {STEP_ORDER.length})
            </span>
          </DialogTitle>
          <DialogDescription>
            {step === 'details'
              ? 'Roles group permissions. Members can hold several roles at once.'
              : step === 'permissions'
                ? 'Pick the screens and actions this role unlocks.'
                : 'Confirm the role before creating it.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'details' && (
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='role-wizard-name'>Role name</Label>
              <Input
                id='role-wizard-name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder='e.g. shift_supervisor'
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='role-wizard-description'>
                Description <span className='text-muted-foreground'>(optional)</span>
              </Label>
              <Input
                id='role-wizard-description'
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder='What is this role for?'
              />
            </div>
          </div>
        )}

        {step === 'permissions' && (
          <ScrollArea className='h-[50vh] pr-3'>
            <div className='flex flex-col gap-5'>
              {groups.map((group) => (
                <div key={group.moduleName} className='flex flex-col gap-3'>
                  <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
                    {group.moduleName}
                  </p>
                  {group.screens.map((screen) => {
                    const allChecked = screen.permissionIds.every((id) =>
                      selected.has(id)
                    )
                    return (
                      <div
                        key={`${group.moduleName}-${screen.screenName}`}
                        className='rounded-md border p-3'
                      >
                        <div className='mb-2 flex items-center justify-between gap-2'>
                          <span className='text-sm font-medium'>
                            {screen.screenName}
                          </span>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              toggleMany(screen.permissionIds, !allChecked)
                            }
                          >
                            {allChecked ? 'Clear' : 'Select all'}
                          </Button>
                        </div>
                        <div className='flex flex-col gap-2'>
                          {screen.permissionIds.map((id) => {
                            const permission = permissionById.get(id)
                            if (!permission) return null
                            const inputId = `role-wizard-${id}`
                            return (
                              <div key={id} className='flex items-start gap-2'>
                                <Checkbox
                                  id={inputId}
                                  checked={selected.has(id)}
                                  onCheckedChange={(checked) =>
                                    toggle(id, checked === true)
                                  }
                                />
                                <Label
                                  htmlFor={inputId}
                                  className='cursor-pointer text-sm font-normal'
                                >
                                  {permission.name}
                                </Label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              {groups.length === 0 && (
                <p className='text-sm text-muted-foreground'>
                  {screensQuery.isLoading
                    ? 'Loading the screen catalog…'
                    : 'No permissions available.'}
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        {step === 'review' && (
          <div className='flex flex-col gap-4'>
            <div>
              <p className='text-sm font-medium'>{trimmedName}</p>
              {description.trim() ? (
                <p className='text-sm text-muted-foreground'>
                  {description.trim()}
                </p>
              ) : null}
            </div>
            <Separator />
            <div className='flex items-center gap-2'>
              <Badge>{selected.size}</Badge>
              <span className='text-sm text-muted-foreground'>
                permission{selected.size === 1 ? '' : 's'} granted
              </span>
            </div>
            <ScrollArea className='h-48 rounded-md border p-3'>
              <div className='flex flex-wrap gap-1.5'>
                {[...selected].map((id) => (
                  <Badge key={id} variant='secondary'>
                    {permissionById.get(id)?.name ?? id}
                  </Badge>
                ))}
                {selected.size === 0 && (
                  <p className='text-sm text-muted-foreground'>
                    No permissions selected — the role will start with no
                    access and can be edited later.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className='gap-2 sm:justify-between'>
          <Button
            variant='outline'
            onClick={step === 'details' ? () => onOpenChange(false) : handleBack}
            disabled={isSubmitting}
          >
            {step === 'details' ? 'Cancel' : 'Back'}
          </Button>
          {step === 'review' ? (
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create role'}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canAdvance}>
              Next
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
