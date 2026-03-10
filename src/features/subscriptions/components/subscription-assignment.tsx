import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSubscriptionPlans, useAssignSubscription } from '../queries';
import { useSearchClerkUsers } from '../data/users_query';
import { calculateEndDate } from '@/lib/subscription_utils';

const assignmentSchema = z.object({
  clerk_user_id: z.string().min(1, 'Please select a user'),
  email: z.string().email('Please enter a valid email'),
  subscription_id: z.string().min(1, 'Please select a plan'),
  status: z.enum(['new', 'paid', 'canceled']),
});

type AssignmentForm = z.infer<typeof assignmentSchema>;

export function SubscriptionAssignment() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: plans } = useSubscriptionPlans();
  const { data: users, isLoading: usersLoading } = useSearchClerkUsers(searchQuery);
  const assignMutation = useAssignSubscription();

  const form = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      clerk_user_id: '',
      email: '',
      subscription_id: '',
      status: 'paid',
    },
  });

  const onSubmit = async (values: AssignmentForm) => {
    const selectedPlan = plans?.find(p => p.id.toString() === values.subscription_id);
    if (!selectedPlan) return;

    const startDate = new Date();
    const endDate = calculateEndDate(startDate, selectedPlan.duration_months);

    try {
      await assignMutation.mutateAsync({
        ...values,
        subscription_id: parseInt(values.subscription_id),
        start_date: startDate,
        end_date: endDate,
      });
      toast.success('Subscription assigned successfully');
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to assign subscription');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          Assign Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Assign Subscription</DialogTitle>
          <DialogDescription>
            Search for a user and assign them a subscription plan.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='space-y-2'>
              <FormLabel>Search User (Email or Name)</FormLabel>
              <Input 
                placeholder='Search...' 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {usersLoading && <p className='text-xs text-muted-foreground'>Searching...</p>}
              {users && users.length > 0 && (
                <div className='max-h-32 overflow-y-auto border rounded-md p-1'>
                  {users.map((user) => (
                    <div 
                      key={user.clerk_user_id}
                      className='p-2 hover:bg-accent rounded-sm cursor-pointer text-sm'
                      onClick={() => {
                        form.setValue('clerk_user_id', user.clerk_user_id);
                        form.setValue('email', user.email);
                        setSearchQuery(user.email);
                      }}
                    >
                      {user.first_name} {user.last_name} ({user.email})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Email</FormLabel>
                  <FormControl>
                    <Input readOnly {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='subscription_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a plan' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plans?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {plan.name} - ${plan.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select status' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='paid'>Paid</SelectItem>
                      <SelectItem value='new'>New</SelectItem>
                      <SelectItem value='canceled'>Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type='submit' disabled={assignMutation.isPending}>
                {assignMutation.isPending ? 'Assigning...' : 'Assign'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
