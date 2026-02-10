// ResPOS Floors & Tables Zod Schemas
import { z } from 'zod'

// ============ Floor Schemas ============

export const floorFormSchema = z.object({
  name: z.string().min(1, 'Floor name is required').max(100),
  description: z.string().max(500).optional(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
})

export type FloorForm = z.infer<typeof floorFormSchema>

// ============ Table Schemas ============

export const tableShapeSchema = z.enum(['square', 'round', 'rectangle'])

export const tableFormSchema = z.object({
  floor_id: z.string().uuid('Please select a floor'),
  table_number: z.string().min(1, 'Table number is required').max(20),
  seats: z.number().int().min(1, 'Minimum 1 seat').max(50),
  position_x: z.number().int().min(0),
  position_y: z.number().int().min(0),
  shape: tableShapeSchema,
  is_active: z.boolean(),
})

export type TableForm = z.infer<typeof tableFormSchema>
export type TableShape = z.infer<typeof tableShapeSchema>
