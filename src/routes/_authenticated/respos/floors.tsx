import { createFileRoute } from '@tanstack/react-router'
import { FloorsAndTables } from '@/features/respos/pages/floors-tables'

export const Route = createFileRoute('/_authenticated/respos/floors')({
  component: FloorsAndTables,
})
