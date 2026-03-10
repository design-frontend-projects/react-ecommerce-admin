import { createFileRoute } from '@tanstack/react-router';
import { SubscriptionsFeature } from '@/features/subscriptions';

export const Route = createFileRoute('/_authenticated/subscriptions')({
  component: SubscriptionsFeature,
});
