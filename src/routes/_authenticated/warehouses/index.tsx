import { createFileRoute } from '@tanstack/react-router'
import { Warehouses } from '@/features/warehouses'

export const Route = createFileRoute('/_authenticated/warehouses/')({
  component: Warehouses,
})
