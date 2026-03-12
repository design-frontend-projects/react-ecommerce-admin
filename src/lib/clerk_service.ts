import { createClerkClient } from '@clerk/backend';
import { type User, type UserStatus } from '@/features/users/data/schema';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Lists all users from Clerk and maps them to the application's User schema.
 */
export async function listClerkUsers(): Promise<User[]> {
  const clerkUsersResponse = await clerkClient.users.getUserList();
  const clerkUsers = clerkUsersResponse.data;
  
  return clerkUsers.map((user) => ({
    id: user.id,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    username: user.username ?? user.emailAddresses[0]?.emailAddress?.split('@')[0] ?? '',
    email: user.emailAddresses[0]?.emailAddress ?? '',
    phoneNumber: user.phoneNumbers[0]?.phoneNumber ?? '',
    status: 'active' as UserStatus, // Clerk users are generally active unless deleted
    role: 'manager', // Default role for now, should be fetched from metadata if available
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  }));
}

/**
 * Finds a Clerk user by their email address.
 */
export async function findClerkUserByEmail(email: string): Promise<User | null> {
  const usersResponse = await clerkClient.users.getUserList({
    emailAddress: [email],
  });
  
  const user = usersResponse.data[0];
  if (!user) return null;

  return {
    id: user.id,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    username: user.username ?? user.emailAddresses[0]?.emailAddress?.split('@')[0] ?? '',
    email: user.emailAddresses[0]?.emailAddress ?? '',
    phoneNumber: user.phoneNumbers[0]?.phoneNumber ?? '',
    status: 'active' as UserStatus,
    role: 'manager',
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

/**
 * Finds a Clerk user by their Clerk ID.
 */
export async function findClerkUserById(clerkId: string): Promise<User | null> {
  try {
    const user = await clerkClient.users.getUser(clerkId);
    if (!user) return null;

    return {
      id: user.id,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      username: user.username ?? user.emailAddresses[0]?.emailAddress?.split('@')[0] ?? '',
      email: user.emailAddresses[0]?.emailAddress ?? '',
      phoneNumber: user.phoneNumbers[0]?.phoneNumber ?? '',
      status: 'active' as UserStatus,
      role: 'manager',
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  } catch (_error) {
    return null;
  }
}
