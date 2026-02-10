import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/respos/invoice/$orderId')(
  {
    component: RouteComponent,
  },
)

function RouteComponent() {
  return <div>Hello "/_authenticated/respos/invoice/$orderId"!</div>
}
