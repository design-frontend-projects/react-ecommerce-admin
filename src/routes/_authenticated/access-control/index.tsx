import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/access-control/')({
  beforeLoad: () => {
    throw redirect({ to: '/access-control/screens' })
  },
})
