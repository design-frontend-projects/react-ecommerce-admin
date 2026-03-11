import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSystemOwner } from '@/features/auth/hooks/use-system-owner'

const SystemManagementPage = () => {
  const { profile } = useSystemOwner()

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">System Management</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Across the platform</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Registered profiles</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Configuration</CardTitle>
          <CardDescription>
            Manage platform-wide settings and administrative actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Welcome, {profile?.full_name || profile?.email || 'System Administrator'}.</p>
            <p className="text-sm text-muted-foreground italic">
              This dashboard is only visible to system owners.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/_system/system-management')({
  component: SystemManagementPage,
})
