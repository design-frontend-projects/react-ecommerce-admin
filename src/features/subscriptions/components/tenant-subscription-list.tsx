import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTenantSubscriptions, useUpdateSubscriptionStatus } from '../queries';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'sonner';

export function TenantSubscriptionList() {
  const { data: subscriptions, isLoading } = useTenantSubscriptions();
  const { user } = useUser();
  const updateStatus = useUpdateSubscriptionStatus();

  const isSuperAdmin = user?.publicMetadata?.role === 'super_admin';

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus as any });
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) return <p>Loading subscriptions...</p>;

  return (
    <div className='rounded-md border overflow-hidden bg-card'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            {isSuperAdmin && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions?.map((sub: any) => (
            <TableRow key={sub.id}>
              <TableCell className='font-medium'>{sub.email}</TableCell>
              <TableCell>{sub.subscriptions?.name}</TableCell>
              <TableCell>
                {isSuperAdmin ? (
                  <Select 
                    defaultValue={sub.status} 
                    onValueChange={(val) => handleStatusChange(sub.id, val)}
                  >
                    <SelectTrigger className="w-[110px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={sub.status === 'paid' ? 'default' : 'secondary'}>
                    {sub.status}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {sub.start_date ? format(new Date(sub.start_date), 'PPP') : '-'}
              </TableCell>
              <TableCell>
                {sub.end_date ? format(new Date(sub.end_date), 'PPP') : '-'}
              </TableCell>
              {isSuperAdmin && (
                <TableCell>
                  {/* Future actions like manual renewal */}
                </TableCell>
              )}
            </TableRow>
          ))}
          {subscriptions?.length === 0 && (
            <TableRow>
              <TableCell colSpan={isSuperAdmin ? 6 : 5} className='h-24 text-center'>
                No subscriptions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
