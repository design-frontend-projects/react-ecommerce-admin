import { useEffect } from 'react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateReservation, useUpdateReservation, useDeleteReservation } from '../api/mutations'
import { useTables } from '../api/queries'
import {
  reservationSchema,
  type ReservationFormValues,
} from '../lib/validators'
import type { ResReservation } from '../types'

interface ReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation?: ResReservation | null
  initialDate?: Date
}

export function ReservationDialog({
  open,
  onOpenChange,
  reservation,
  initialDate,
}: ReservationDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!reservation
  const createReservationMutation = useCreateReservation()
  const updateReservationMutation = useUpdateReservation()
  const deleteReservationMutation = useDeleteReservation()
  const { data: tables } = useTables()

  const form = useForm<ReservationFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(reservationSchema) as any,
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      party_size: 2,
      reservation_date: initialDate || new Date(),
      reservation_time: '19:00',
      duration_minutes: 90,
      table_id: '',
      notes: '',
      status: 'pending',
    },
  })

  // Reset form when reservation changes
  useEffect(() => {
    if (reservation) {
      form.reset({
        customer_name: reservation.customer_name,
        customer_phone: reservation.customer_phone || '',
        customer_email: reservation.customer_email || '',
        party_size: reservation.party_size,
        reservation_date: new Date(reservation.reservation_date),
        reservation_time: reservation.reservation_time,
        duration_minutes: reservation.duration_minutes,
        table_id: reservation.table_id || '',
        notes: reservation.notes || '',
        status: reservation.status,
      })
    } else {
      form.reset({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        party_size: 2,
        reservation_date: initialDate || new Date(),
        reservation_time: '19:00',
        duration_minutes: 90,
        table_id: '',
        notes: '',
        status: 'pending',
      })
    }
  }, [reservation, initialDate, form, open])

  const onSubmit = async (values: ReservationFormValues) => {
    try {
      if (isEditing && reservation) {
        await updateReservationMutation.mutateAsync({
          id: reservation.id,
          customerName: values.customer_name,
          customerPhone: values.customer_phone,
          customerEmail: values.customer_email || undefined,
          partySize: values.party_size,
          reservationDate: format(values.reservation_date, 'yyyy-MM-dd'),
          reservationTime: values.reservation_time,
          durationMinutes: values.duration_minutes,
          tableId: values.table_id || undefined,
          notes: values.notes,
          status: values.status,
        })
        toast.success(t('respos.reservation.success.updated'))
      } else {
        await createReservationMutation.mutateAsync({
          customerName: values.customer_name,
          customerPhone: values.customer_phone,
          customerEmail: values.customer_email || undefined,
          partySize: values.party_size,
          reservationDate: format(values.reservation_date, 'yyyy-MM-dd'),
          reservationTime: values.reservation_time,
          durationMinutes: values.duration_minutes,
          tableId: values.table_id || undefined,
          notes: values.notes,
        })
        toast.success(t('respos.reservation.success.created'))
      }
      onOpenChange(false)
    } catch {
      toast.error(t('respos.reservation.error.save'))
    }
  }

  const isPending =
    createReservationMutation.isPending || updateReservationMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('respos.reservation.edit') : t('respos.reservation.add')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('respos.reservation.editDesc')
              : t('respos.reservation.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <FormField
                control={form.control}
                name='customer_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.reservation.customerName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('respos.reservation.customerNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='customer_phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.reservation.phone')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('respos.reservation.phonePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='customer_email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.reservation.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder={t('respos.reservation.emailPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='party_size'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.reservation.partySize')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='reservation_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.reservation.date')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>{t('respos.reservation.pickDate')}</span>
                            )}
                            <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='reservation_time'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.reservation.time')}</FormLabel>
                    <FormControl>
                      <Input type='time' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='duration_minutes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.reservation.duration')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step={15}
                        min={15}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='table_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.reservation.table')}</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? '' : value)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('respos.reservation.tablePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='__none__'>
                          {t('respos.reservation.noTable')}
                        </SelectItem>
                        {tables?.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            {t('respos.reservation.tableNumber', { number: table.table_number })} ({table.seats} {t('respos.reservation.seats')})
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
                name='status'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('respos.reservation.status')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('respos.reservation.statusPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='pending'>{t('respos.reservation.statusOptions.pending')}</SelectItem>
                        <SelectItem value='confirmed'>{t('respos.reservation.statusOptions.confirmed')}</SelectItem>
                        <SelectItem value='completed'>{t('respos.reservation.statusOptions.completed')}</SelectItem>
                        <SelectItem value='cancelled'>{t('respos.reservation.statusOptions.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='notes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('respos.reservation.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('respos.reservation.notesPlaceholder')}
                      className='resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='sm:justify-between'>
              {isEditing ? (
                <Button
                  type='button'
                  variant='destructive'
                  disabled={deleteReservationMutation.isPending || isPending}
                  onClick={async () => {
                    const isConfirmed = window.confirm(
                      t('respos.reservation.deleteConfirm')
                    )
                    if (!isConfirmed) return
                    try {
                      await deleteReservationMutation.mutateAsync(reservation!.id)
                      toast.success(t('respos.reservation.success.deleted'))
                      onOpenChange(false)
                    } catch {
                      toast.error(t('respos.reservation.error.delete'))
                    }
                  }}
                >
                  {deleteReservationMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  {t('respos.reservation.delete')}
                </Button>
              ) : (
                <div />
              )}
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                >
                  {t('respos.reservation.cancel')}
                </Button>
                <Button type='submit' disabled={isPending || deleteReservationMutation.isPending}>
                  {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  {isEditing ? t('respos.reservation.update') : t('respos.reservation.create')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
