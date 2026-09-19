'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  Loader2,
  User,
  ShieldCheck,
  MapPin,
  Lock,
  KeyRound,
  Info,
} from 'lucide-react'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { SelectDropdown } from '@/components/select-dropdown'
import { type User as UserType } from '../data/schema'
import { useRoles } from '../hooks/use-invitations'
import {
  useUpdateUserRole,
  useUpdateUserBranch,
} from '../hooks/use-roles-permissions'
import { useCreateUser } from '../hooks/use-users'
import { userFormSchema, type UserForm } from './users-action-dialog.schema'
import {
  TempPasswordDialog,
  type TempPasswordDetails,
} from './temp-password-dialog'

type UserActionDialogProps = {
  currentRow?: UserType
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
  const [revealed, setRevealed] = useState<TempPasswordDetails | null>(null)

  const { data: branches = [], isLoading: isBranchesLoading } = useQuery({
    queryKey: ['branches', 'active', 'user-dialog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, city_id')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data ?? []
    },
  })

  const { data: countries = [], isLoading: isCountriesLoading } = useQuery({
    queryKey: ['countries', 'active', 'user-dialog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data ?? []
    },
  })

  const form = useForm<UserForm>({
    resolver: zodResolver(userFormSchema) as any,
    defaultValues: isEdit
      ? {
          firstName: currentRow.firstName ?? '',
          lastName: currentRow.lastName ?? '',
          username: currentRow.username ?? '',
          email: currentRow.email ?? '',
          phoneNumber: currentRow.phoneNumber ?? '',
          idNumber: '',
          role: currentRow.role ?? '',
          primaryModule: 'inventory',
          modules: ['inventory'],
          isRestaurantUser: false,
          refundPinCode: '',
          isActive: !currentRow.isBlocked,
          branchId:
            (currentRow as UserType & { branchId?: string })?.branchId ?? '',
          countryId:
            (currentRow as UserType & { countryId?: string })?.countryId ?? '',
          cityId:
            (currentRow as UserType & { cityId?: string })?.cityId ?? '',
          storeId:
            (currentRow as UserType & { storeId?: string })?.storeId ?? '',
          warehouseId:
            (currentRow as UserType & { warehouseId?: string })?.warehouseId ?? '',
          channelId:
            (currentRow as UserType & { channelId?: string })?.channelId ?? '',
          isEdit,
        }
      : {
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          phoneNumber: '',
          idNumber: '',
          role: '',
          primaryModule: 'inventory',
          modules: ['inventory'],
          isRestaurantUser: false,
          refundPinCode: '',
          isActive: true,
          branchId: '',
          countryId: '',
          cityId: '',
          storeId: '',
          warehouseId: '',
          channelId: '',
          isEdit,
        },
  })

  const selectedCountryId = form.watch('countryId')

  const { data: cities = [], isLoading: isCitiesLoading } = useQuery({
    queryKey: ['cities', 'active', selectedCountryId],
    queryFn: async () => {
      let query = supabase.from('cities').select('id, name, country_id').order('name')
      if (selectedCountryId) {
        query = query.eq('country_id', selectedCountryId)
      }
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })

  const { data: stores = [], isLoading: isStoresLoading } = useQuery({
    queryKey: ['stores', 'active', 'user-dialog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('store_id, name')
        .order('name')

      if (error) throw error
      return data ?? []
    },
  })

  const { data: warehouses = [], isLoading: isWarehousesLoading } = useQuery({
    queryKey: ['warehouses', 'active', 'user-dialog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data ?? []
    },
  })

  const { data: channels = [], isLoading: isChannelsLoading } = useQuery({
    queryKey: ['channels', 'active', 'user-dialog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data ?? []
    },
  })

  const onSubmit = (values: UserForm) => {
    if (isEdit) {
      if (currentRow && values.role && values.role !== currentRow.role) {
        updateUserRole.mutate({ userId: currentRow.id, roleIds: [values.role] })
      }

      if (
        currentRow &&
        values.branchId !==
          (currentRow as UserType & { branchId?: string }).branchId
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

    const roleId =
      rolesData.find((r) => r.name.toLowerCase() === (values.role || '').toLowerCase())?.id ||
      values.role ||
      ''

    createUser.mutate(
      {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phoneNumber || undefined,
        idNumber: values.idNumber || undefined,
        roleIds: roleId ? [roleId] : [],
        primaryModule: values.primaryModule,
        modules: values.modules,
        isRestaurantUser: values.isRestaurantUser,
        refundPinCode: values.refundPinCode || undefined,
        isActive: values.isActive,
        branchId: values.branchId || undefined,
        countryId: values.countryId || undefined,
        cityId: values.cityId || undefined,
        storeId: values.storeId || undefined,
        warehouseId: values.warehouseId || undefined,
        channelId: values.channelId || undefined,
      },
      {
        onSuccess: (result) => {
          form.reset()
          onOpenChange(false)
          // Reveal the server-generated temp password once, with phone for WhatsApp
          if (result.temporaryPassword) {
            setRevealed({
              email: values.email,
              password: result.temporaryPassword,
              phone: values.phoneNumber,
              name: `${values.firstName} ${values.lastName}`.trim(),
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
          if (!state) form.reset()
          onOpenChange(state)
        }}
      >
        <DialogContent className='sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden'>
          <DialogHeader className='p-6 pb-4 border-b bg-card/60'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <User className='h-5 w-5' />
              </div>
              <div className='text-start'>
                <DialogTitle className='text-lg font-semibold'>
                  {isEdit
                    ? t('users.userActionDialog.editTitle')
                    : t('users.userActionDialog.addTitle')}
                </DialogTitle>
                <DialogDescription className='text-xs text-muted-foreground'>
                  {isEdit
                    ? t('users.userActionDialog.editDesc')
                    : t('users.userActionDialog.addDesc')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-6 space-y-6'>
            <Form {...form}>
              <form
                id='user-form'
                onSubmit={form.handleSubmit(onSubmit)}
                className='space-y-6'
              >
                {/* ── Section 1: Personal Information ────────────────── */}
                <div className='rounded-xl border border-border/70 bg-card/40 p-4 space-y-4'>
                  <div className='flex items-center gap-2 border-b border-border/50 pb-2'>
                    <User className='h-4 w-4 text-primary' />
                    <div>
                      <h4 className='text-sm font-semibold'>
                        {t('users.userActionDialog.personalInfo')}
                      </h4>
                      <p className='text-xs text-muted-foreground'>
                        {t('users.userActionDialog.personalInfoDesc')}
                      </p>
                    </div>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='firstName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.userActionDialog.firstName')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='e.g. John'
                              autoComplete='off'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='lastName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.userActionDialog.lastName')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='e.g. Doe'
                              autoComplete='off'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='email'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.userActionDialog.email')}</FormLabel>
                          <FormControl>
                            <Input
                              type='email'
                              placeholder='user@example.com'
                              autoComplete='off'
                              disabled={isEdit}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='phoneNumber'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.userActionDialog.phone')}</FormLabel>
                          <FormControl>
                            <Input
                              type='tel'
                              placeholder='+966 50 123 4567'
                              autoComplete='off'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='idNumber'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.userActionDialog.idNumber')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('users.userActionDialog.idNumberPlaceholder')}
                              autoComplete='off'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='username'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.userActionDialog.username')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='johndoe'
                              autoComplete='off'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* ── Section 2: Role & System Modules ───────────────── */}
                <div className='rounded-xl border border-border/70 bg-card/40 p-4 space-y-4'>
                  <div className='flex items-center gap-2 border-b border-border/50 pb-2'>
                    <ShieldCheck className='h-4 w-4 text-primary' />
                    <div>
                      <h4 className='text-sm font-semibold'>
                        {t('users.userActionDialog.roleAndAccess')}
                      </h4>
                      <p className='text-xs text-muted-foreground'>
                        {t('users.userActionDialog.roleAndAccessDesc')}
                      </p>
                    </div>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='role'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.userActionDialog.role')}</FormLabel>
                          <SelectDropdown
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                            placeholder={t('users.userActionDialog.selectRole')}
                            items={rolesData.map(({ name }) => ({
                              label: name,
                              value: name.toLowerCase(),
                            }))}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='primaryModule'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.userActionDialog.primaryModule')}</FormLabel>
                          <SelectDropdown
                            defaultValue={field.value}
                            onValueChange={(val) => {
                              field.onChange(val)
                              // Ensure primaryModule is included in modules array
                              const currentModules = form.getValues('modules') || []
                              if (!currentModules.includes(val as any)) {
                                form.setValue('modules', [...currentModules, val as any])
                              }
                            }}
                            placeholder={t('users.userActionDialog.selectPrimaryModule')}
                            items={[
                              { label: 'Inventory Management', value: 'inventory' },
                              { label: 'Restaurant POS', value: 'restaurant' },
                            ]}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='isRestaurantUser'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
                          <div className='space-y-0.5 pe-3'>
                            <FormLabel className='text-sm font-medium'>
                              {t('users.userActionDialog.isRestaurantUser')}
                            </FormLabel>
                            <FormDescription className='text-xs text-muted-foreground'>
                              {t('users.userActionDialog.isRestaurantUserDesc')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='refundPinCode'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='flex items-center gap-1.5'>
                            <KeyRound className='h-3.5 w-3.5 text-muted-foreground' />
                            {t('users.userActionDialog.refundPinCode')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type='password'
                              maxLength={8}
                              placeholder={t('users.userActionDialog.refundPinCodePlaceholder')}
                              autoComplete='new-password'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* ── Section 3: Location & Business Boundaries (ABAC) ─── */}
                <div className='rounded-xl border border-border/70 bg-card/40 p-4 space-y-4'>
                  <div className='flex items-center gap-2 border-b border-border/50 pb-2'>
                    <MapPin className='h-4 w-4 text-primary' />
                    <div>
                      <h4 className='text-sm font-semibold'>
                        {t('users.userActionDialog.locationAssignment')}
                      </h4>
                      <p className='text-xs text-muted-foreground'>
                        {t('users.userActionDialog.locationAssignmentDesc')}
                      </p>
                    </div>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                    <FormField
                      control={form.control}
                      name='countryId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='flex items-center gap-1'>
                            {t('users.userActionDialog.country')}
                            {isCountriesLoading && (
                              <Loader2 className='h-3 w-3 animate-spin' />
                            )}
                          </FormLabel>
                          <SelectDropdown
                            defaultValue={field.value ?? ''}
                            onValueChange={(val) => {
                              field.onChange(val)
                              form.setValue('cityId', '')
                            }}
                            placeholder={t('users.userActionDialog.selectCountry')}
                            items={(countries ?? []).map((c) => ({
                              label: c.name,
                              value: c.id,
                            }))}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='cityId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='flex items-center gap-1'>
                            {t('users.userActionDialog.city')}
                            {isCitiesLoading && (
                              <Loader2 className='h-3 w-3 animate-spin' />
                            )}
                          </FormLabel>
                          <SelectDropdown
                            defaultValue={field.value ?? ''}
                            onValueChange={field.onChange}
                            placeholder={t('users.userActionDialog.selectCity')}
                            items={(cities ?? []).map((c) => ({
                              label: c.name,
                              value: c.id,
                            }))}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='branchId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='flex items-center gap-1'>
                            {t('users.userActionDialog.branch')}
                            {isBranchesLoading && (
                              <Loader2 className='h-3 w-3 animate-spin' />
                            )}
                          </FormLabel>
                          <SelectDropdown
                            defaultValue={field.value ?? ''}
                            onValueChange={field.onChange}
                            placeholder={t('users.userActionDialog.selectBranch')}
                            items={(branches ?? []).map((b) => ({
                              label: b.name,
                              value: b.id,
                            }))}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='storeId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='flex items-center gap-1'>
                            {t('users.userActionDialog.store')}
                            {isStoresLoading && (
                              <Loader2 className='h-3 w-3 animate-spin' />
                            )}
                          </FormLabel>
                          <SelectDropdown
                            defaultValue={field.value ?? ''}
                            onValueChange={field.onChange}
                            placeholder={t('users.userActionDialog.selectStore')}
                            items={(stores ?? []).map((s) => ({
                              label: s.name || s.store_id,
                              value: s.store_id,
                            }))}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='warehouseId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='flex items-center gap-1'>
                            {t('users.userActionDialog.warehouse')}
                            {isWarehousesLoading && (
                              <Loader2 className='h-3 w-3 animate-spin' />
                            )}
                          </FormLabel>
                          <SelectDropdown
                            defaultValue={field.value ?? ''}
                            onValueChange={field.onChange}
                            placeholder={t('users.userActionDialog.selectWarehouse')}
                            items={(warehouses ?? []).map((w) => ({
                              label: w.name,
                              value: w.id,
                            }))}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='channelId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='flex items-center gap-1'>
                            {t('users.userActionDialog.channel')}
                            {isChannelsLoading && (
                              <Loader2 className='h-3 w-3 animate-spin' />
                            )}
                          </FormLabel>
                          <SelectDropdown
                            defaultValue={field.value ?? ''}
                            onValueChange={field.onChange}
                            placeholder={t('users.userActionDialog.selectChannel')}
                            items={(channels ?? []).map((ch) => ({
                              label: ch.name,
                              value: ch.id,
                            }))}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* ── Section 4: Security & Status Controls ──────────── */}
                <div className='rounded-xl border border-border/70 bg-card/40 p-4 space-y-4'>
                  <div className='flex items-center gap-2 border-b border-border/50 pb-2'>
                    <Lock className='h-4 w-4 text-primary' />
                    <div>
                      <h4 className='text-sm font-semibold'>
                        {t('users.userActionDialog.securityOptions')}
                      </h4>
                      <p className='text-xs text-muted-foreground'>
                        {t('users.userActionDialog.securityOptionsDesc')}
                      </p>
                    </div>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='isActive'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
                          <div className='space-y-0.5 pe-3'>
                            <FormLabel className='text-sm font-medium'>
                              {t('users.userActionDialog.isActive')}
                            </FormLabel>
                            <FormDescription className='text-xs text-muted-foreground'>
                              {t('users.userActionDialog.isActiveDesc')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {!isEdit && (
                      <div className='flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground'>
                        <Info className='h-4 w-4 shrink-0 text-primary mt-0.5' />
                        <p>{t('users.userActionDialog.autoPasswordNotice')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </div>

          <DialogFooter className='p-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              {t('users.userActionDialog.cancel')}
            </Button>
            <Button
              type='submit'
              form='user-form'
              disabled={createUser.isPending}
            >
              {createUser.isPending && (
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
