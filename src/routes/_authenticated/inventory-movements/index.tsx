import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { InventoryMovements } from '@/features/inventory-movements'

const movementsSearchSchema = z.object({
  page: z.coerce.number().min(1).catch(1),
  pageSize: z.coerce.number().min(1).catch(20),
  search: z.string().optional().catch(''),
  movementType: z.string().optional().catch(''),
  locationId: z.string().optional().catch(''),
  dateFrom: z.string().optional().catch(''),
  dateTo: z.string().optional().catch(''),
  sortBy: z.string().optional().catch('movement_date'),
  sortOrder: z.enum(['asc', 'desc']).optional().catch('desc'),
})

export const Route = createFileRoute('/_authenticated/inventory-movements/')({
  component: InventoryMovements,
  validateSearch: movementsSearchSchema,
})
