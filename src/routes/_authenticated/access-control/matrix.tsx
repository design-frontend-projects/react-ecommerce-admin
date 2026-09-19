import { createFileRoute } from '@tanstack/react-router'
import { PermissionMatrixPage } from '@/features/access-control/pages/permission-matrix-page'

export const Route = createFileRoute('/_authenticated/access-control/matrix')({
  component: PermissionMatrixPage,
})
