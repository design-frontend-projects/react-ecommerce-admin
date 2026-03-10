import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@clerk/clerk-react';

export const Route = createFileRoute('/subscription-required')({
  component: SubscriptionRequired,
});

function SubscriptionRequired() {
  const { signOut } = useAuth();

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Subscription Required</CardTitle>
          <CardDescription>
            Your account does not have an active subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            To access the features of this application, you must have a paid subscription plan.
            Please contact your administrator or support to activate your account.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button variant="outline" className="w-full" onClick={() => signOut()}>
            Sign Out
          </Button>
          <Button asChild className="w-full">
            <Link to="/">Go Back</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
