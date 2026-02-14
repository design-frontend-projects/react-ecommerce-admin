import { z } from 'zod'

export const reservationSchema = z.object({
  table_id: z.string().optional(),
  customer_name: z.string().min(1, 'Name is required'),
  customer_phone: z.string().optional(),
  customer_email: z
    .string()
    .email('Invalid email')
    .optional()
    .or(z.literal('')),
  party_size: z.coerce.number().min(1, 'Party size must be at least 1'),
  reservation_date: z.date(),
  reservation_time: z.string().min(1, 'Time is required'),
  duration_minutes: z.coerce.number().min(15).default(90),
  notes: z.string().optional(),
  status: z
    .enum(['pending', 'confirmed', 'cancelled', 'completed'])
    .default('pending'),
})

export type ReservationFormValues = z.infer<typeof reservationSchema>
