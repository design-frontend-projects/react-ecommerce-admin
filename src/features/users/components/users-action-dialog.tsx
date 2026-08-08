'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { type User } from '../data/schema'
import { useRoles } from '../hooks/use-invitations'
import {
  useUpdateUserRole,
  useUpdateUserBranch,
} from '../hooks/use-roles-permissions'
import { useCreateUser, useCreateTenant } from '../hooks/use-users'
import { userFormSchema, type UserForm } from './users-action-dialog.schema'
import {
  TempPasswordDialog,
  type TempPasswordDetails,
} from './temp-password-dialog'

type UserActionDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const { t } = useTranslation()
  const isEdit = !!currentRow
  const { data: rolesData = [] } = useRoles()
  const updateUserRole = useUpdateUserRole()
  const updateUserBranch = useUpdateUserBranch()
  const createUser = useCreateUser()
  const createTenant = useCreateTenant()
  const [revealed, setRevealed] = useState<TempPasswordDetails | null>(null)

  const { data: branches, isLoading: isBranchesLoading } = useQuery({
    queryKey: ['branches', 'active', 'user-dialog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data
    },
  })

  const form = useForm<UserForm>({
    resolver: zodResolver(userFormSchema),
    defaultValues: isEdit
      ? {
          ...currentRow,
          branchId:
            (currentRow as User & { branchId?: string })?.branchId ?? '',
          isEdit,
          isTenant: false,
        }
      : {
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          role: '',
          branchId: '',
          phoneNumber: '',
          isEdit,
          isTenant: false,
        },
  })

  const isTenant = form.watch('isTenant')

  const onSubmit = (values: UserForm) => {
    if (isEdit) {
      if (currentRow && values.role !== currentRow.role) {
        updateUserRole.mutate({ userId: currentRow.id, role: values.role })
      }

      if (
        currentRow &&
        values.branchId !==
          (currentRow as User & { branchId?: string }).branchId
      ) {
        updateUserBranch.mutate({
          userId: currentRow.authUserId,
          branchId: values.branchId || null,
        })
      }

      form.reset()
      onOpenChange(false)
      return
    }

    if (values.isTenant) {
      createTenant.mutate(
        {
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phoneNumber,
        },
        {
          onSuccess: (result) => {
            form.reset()
            onOpenChange(false)
            if (result.temporaryPassword) {
              setRevealed({
                email: values.email,
                password: result.temporaryPassword,
              })
            }
          },
        }
      )
      return
    }

    const roleId =
      rolesData.find((r) => r.name.toLowerCase() === values.role)?.id ||
      values.role

    createUser.mutate(
      {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phoneNumber,
        roleIds: [roleId],
        branchId: values.branchId,
      },
      {
        onSuccess: (result) => {
          form.reset()
          onOpenChange(false)
          // Reveal the server-generated temp password once, if present.
          if (result.temporaryPassword) {
            setRevealed({
              email: values.email,
              password: result.temporaryPassword,
            })
          }
        },
      }
    )
  }

  return (
    <>
      <TempPasswordDialog
        details={revealed}
        onClose={() => setRevealed(null)}
      />
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? t('users.userActionDialog.editTitle') : t('users.userActionDialog.addTitle')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('users.userActionDialog.editDesc') : t('users.userActionDialog.addDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className='h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='user-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 px-0.5'
            >
              {!isEdit && (
                <div className='flex items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-0.5'>
                    <Label htmlFor='tenant-switch' className='text-sm font-medium'>
                      {t('users.userActionDialog.createAsTenant')}
                    </Label>
                    <p className='text-xs text-muted-foreground'>
                      {t('users.userActionDialog.tenantNotice')}
                    </p>
                  </div>
                  <Switch
                    id='tenant-switch'
                    checked={isTenant}
                    onCheckedChange={(checked) => {
                      form.setValue('isTenant', checked)
                      if (checked) {
                        form.setValue('role', '')
                        form.setValue('branchId', '')
                        form.setValue('username', '')
                      }
                    }}
                  />
                </div>
              )}
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('users.userActionDialog.firstName')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='John'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('users.userActionDialog.lastName')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Doe'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {!isTenant && (
                <FormField
                  control={form.control}
                  name='username'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        {t('users.userActionDialog.username')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='john_doe'
                          className='col-span-4'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>{t('users.userActionDialog.email')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='john.doe@gmail.com'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='phoneNumber'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('users.userActionDialog.phone')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='+123456789'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {!isTenant && (
                <>
                  <FormField
                    control={form.control}
                    name='role'
                    render={({ field }) => (
                      <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 text-end'>{t('users.userActionDialog.role')}</FormLabel>
                        <SelectDropdown
                          defaultValue={field.value}
                          onValueChange={field.onChange}
                          placeholder={t('users.userActionDialog.selectRole')}
                          className='col-span-4'
                          items={rolesData.map(({ name }) => ({
                            label: name,
                            value: name.toLowerCase(),
                          }))}
                        />
                        <FormMessage className='col-span-4 col-start-3' />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='branchId'
                    render={({ field }) => (
                      <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 flex items-center justify-end gap-1'>
                          {t('users.userActionDialog.branch')}
                          {isBranchesLoading && (
                            <Loader2 className='h-3 w-3 animate-spin' />
                          )}
                        </FormLabel>
                        <SelectDropdown
                          defaultValue={field.value ?? ''}
                          onValueChange={field.onChange}
                          placeholder={t('users.userActionDialog.selectBranch')}
                          className='col-span-4'
                          items={(branches ?? []).map((b) => ({
                            label: b.name,
                            value: b.id,
                          }))}
                        />
                        <FormMessage className='col-span-4 col-start-3' />
                      </FormItem>
                    )}
                  />
                </>
              )}
              {!isEdit && (
                <p className='px-1 text-xs text-muted-foreground'>
                  {t('users.userActionDialog.autoPasswordNotice')}
                </p>
              )}
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button
            type='submit'
            form='user-form'
            disabled={createUser.isPending || createTenant.isPending}
          >
            {(createUser.isPending || createTenant.isPending) && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            {t('users.userActionDialog.saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
