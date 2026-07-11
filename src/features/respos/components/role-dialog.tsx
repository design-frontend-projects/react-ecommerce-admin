import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PERMISSIONS,
  ROLE_NAMES,
  roleFormSchema,
  type RoleFormValues,
} from '../schemas/role.schema'
import type { ResRole } from '../types'

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: ResRole | null
  onSubmit: (values: RoleFormValues) => void
}

export function RoleDialog({
  open,
  onOpenChange,
  role,
  onSubmit,
}: RoleDialogProps) {
  const { t } = useTranslation()
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: 'cashier',
      display_name: '',
      permissions: [],
    },
  })

  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        display_name: role.display_name,
        permissions: role.permissions,
      })
    } else {
      form.reset({
        name: 'cashier',
        display_name: '',
        permissions: [],
      })
    }
  }, [role, form])

  const handleSubmit = (values: RoleFormValues) => {
    onSubmit(values)
  }

  const permissionLabels: Record<string, string> = {
    dashboard: t('respos.role.permissions.dashboard'),
    pos: t('respos.role.permissions.pos'),
    orders: t('respos.role.permissions.orders'),
    menu: t('respos.role.permissions.menu'),
    floors: t('respos.role.permissions.floors'),
    reservations: t('respos.role.permissions.reservations'),
    reservations_view: t('respos.role.permissions.reservationsView'),
    analytics: t('respos.role.permissions.analytics'),
    shifts: t('respos.role.permissions.shifts'),
    settings: t('respos.role.permissions.settings'),
    payments: t('respos.role.permissions.payments'),
    void_approve: t('respos.role.permissions.voidApprove'),
    void_request: t('respos.role.permissions.voidRequest'),
    kitchen: t('respos.role.permissions.kitchen'),
    notifications: t('respos.role.permissions.notifications'),
    '*': t('respos.role.permissions.all'),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>{role ? t('respos.role.edit') : t('respos.role.add')}</DialogTitle>
          <DialogDescription>
            {role
              ? t('respos.role.editDesc')
              : t('respos.role.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.role.roleName')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('respos.role.selectRoleName')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_NAMES.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='display_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.role.displayName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('respos.role.displayNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='permissions'
              render={() => (
                <FormItem>
                  <FormLabel>{t('respos.role.permissionsLabel')}</FormLabel>
                  <div className='grid grid-cols-2 gap-2 rounded-md border p-3'>
                    {PERMISSIONS.map((permission) => (
                      <FormField
                        key={permission}
                        control={form.control}
                        name='permissions'
                        render={({ field }) => (
                          <FormItem className='flex items-center gap-2 space-y-0'>
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(permission)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, permission])
                                  } else {
                                    field.onChange(
                                      field.value?.filter(
                                        (v) => v !== permission
                                      )
                                    )
                                  }
                                }}
                              />
                            </FormControl>
                            <Badge variant='outline' className='cursor-pointer'>
                              {permissionLabels[permission] || permission}
                            </Badge>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                {t('respos.role.cancel')}
              </Button>
              <Button type='submit'>{role ? t('respos.role.update') : t('respos.role.create')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
