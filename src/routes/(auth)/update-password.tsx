import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { UpdatePasswordForm } from '@/features/auth/update-password/components/update-password-form'

export const Route = createFileRoute('/(auth)/update-password')({
  component: UpdatePasswordRoute,
})

function UpdatePasswordRoute() {
  return (
    <div className='flex min-h-[80vh] items-center justify-center py-10'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1 text-center'>
          <CardTitle className='text-2xl'>Update Password</CardTitle>
          <CardDescription>
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
