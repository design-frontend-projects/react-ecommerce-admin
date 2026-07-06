import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    // In a real app, this would call an API route that uses getCRMMetrics()
    // Mocking response here for the UI component
    setMetrics({
      totalLeads: 150,
      leadConversionRate: 25,
      opportunities: 40,
      winRate: 35,
      recentRevenue: 45000
    });
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalLeads}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.leadConversionRate.toFixed(1)}% conversion rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.opportunities}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.winRate.toFixed(1)}% win rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Revenue (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${metrics.recentRevenue.toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
