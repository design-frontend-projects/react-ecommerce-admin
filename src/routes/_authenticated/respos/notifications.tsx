import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/respos/notifications')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/respos/notifications"!</div>
}
