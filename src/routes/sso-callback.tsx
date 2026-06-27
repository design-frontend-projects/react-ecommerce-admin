import { AuthenticateWithRedirectCallback } from '@/hooks/use-auth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sso-callback')({
  component: SSOCallback,
})

function SSOCallback() {
  return <AuthenticateWithRedirectCallback />
}
