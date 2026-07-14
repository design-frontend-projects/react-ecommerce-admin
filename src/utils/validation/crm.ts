import { z } from 'zod'

export const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  company: z.string().max(150).optional().nullable(),
  email: z
    .string()
    .email('Invalid email address')
    .max(200)
    .optional()
    .nullable(),
  phone: z.string().max(50).optional().nullable(),
  source: z.enum(['web', 'referral', 'pos_referral', 'in-person']),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified']),
  assigned_to_user_id: z.string().max(100).optional().nullable(),
})

export const opportunitySchema = z.object({
  lead_id: z.number().int().optional().nullable(),
  customer_id: z.number().int().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200),
  value: z.number().positive('Value must be a positive number'),
  probability: z.number().int().min(0).max(100),
  stage: z.enum([
    'qualification',
    'proposal',
    'negotiation',
    'closed_won',
    'closed_lost',
  ]),
  expected_close_date: z.date().optional().nullable(),
  assigned_to_user_id: z.string().max(100).optional().nullable(),
})

export const taskSchema = z.object({
  customer_id: z.number().int().optional().nullable(),
  title: z.string().min(1, 'Task title is required').max(250),
  description: z.string().optional().nullable(),
  due_date: z.date({ message: 'Due date is required' }),
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']),
  priority: z.enum(['low', 'medium', 'high']),
  assigned_to_user_id: z.string().max(100).optional().nullable(),
})
