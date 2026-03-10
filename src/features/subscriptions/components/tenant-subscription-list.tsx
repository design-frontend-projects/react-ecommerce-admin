import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTenantSubscriptions } from '../queries';
import { format } from 'date-fns';

export function TenantSubscriptionList() {
  const { data: subscriptions, isLoading } = useTenantSubscriptions();

  if (isLoading) return <p>Loading subscriptions...</p>;

  return (
    <div className='rounded-md border overflow-hidden'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions?.map((sub: any) => (
            <TableRow key={sub.id}>
              <TableCell className='font-medium'>{sub.email}</TableCell>
              <TableCell>{sub.subscriptions?.name}</TableCell>
              <TableCell>
                <Badge variant={sub.status === 'paid' ? 'default' : 'secondary'}>
                  {sub.status}
                </Badge>
              </TableCell>
              <TableCell>
                {sub.start_date ? format(new Date(sub.start_date), 'PPP') : '-'}
              </TableCell>
              <TableCell>
                {sub.end_date ? format(new Date(sub.end_date), 'PPP') : '-'}
              </TableCell>
            </TableRow>
          ))}
          {subscriptions?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className='h-24 text-center'>
                No subscriptions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
