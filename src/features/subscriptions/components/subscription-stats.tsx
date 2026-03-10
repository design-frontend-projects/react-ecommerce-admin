import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscriptionAnalytics } from '../queries';
import { Activity, DollarSign, AlertTriangle, UserPlus } from 'lucide-react';

export function SubscriptionStats() {
  const { data: stats, isLoading } = useSubscriptionAnalytics();

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {[1, 2, 3, 4].map(i => <Card key={i} className="animate-pulse h-32" />)}
  </div>;

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Total Active</CardTitle>
          <Activity className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{stats?.totalActive}</div>
          <p className='text-xs text-muted-foreground'>Currently active paid plans</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Total Revenue</CardTitle>
          <DollarSign className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>${stats?.totalRevenue.toFixed(2)}</div>
          <p className='text-xs text-muted-foreground'>Total from paid records</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>Upcoming Expiry</CardTitle>
          <AlertTriangle className='h-4 w-4 text-destructive' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{stats?.upcomingExpirations}</div>
          <p className='text-xs text-muted-foreground'>Ending in next 30 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>New This Month</CardTitle>
          <UserPlus className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{stats?.newSubscriptions}</div>
          <p className='text-xs text-muted-foreground'>Signups in current period</p>
        </CardContent>
      </Card>
    </div>
  );
}
