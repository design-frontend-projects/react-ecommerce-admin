import { createClerkClient } from '@clerk/backend'
import { type User, type UserStatus } from '@/features/users/data/schema'

export const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

/**
 * Invites a user via email and attaches initial tenant metadata.
 */
export async function inviteUserMetadata(email: string, role: string, tenantId: string) {
  return await clerkClient.invitations.createInvitation({
    emailAddress: email,
    publicMetadata: { role, tenantId },
  })
}

/**
 * Lists all users from Clerk and maps them to the application's User schema.
 */
export async function listClerkUsers(): Promise<User[]> {
  const clerkUsersResponse = await clerkClient.users.getUserList()
  const clerkUsers = clerkUsersResponse.data

  return clerkUsers.map((user) => ({
    id: user.id,
    clerkUserId: user.id,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    username: user.username ?? user.emailAddresses[0]?.emailAddress?.split('@')[0] ?? '',
    email: user.emailAddresses[0]?.emailAddress ?? '',
    phoneNumber: user.phoneNumbers[0]?.phoneNumber ?? '',
    role: 'manager',
    roleNames: ['manager'],
    roleIds: [],
    status: 'active' as UserStatus,
    createdAt: new Date(user.createdAt).toISOString(),
    updatedAt: new Date(user.updatedAt).toISOString(),
  }))
}

/**
 * Finds a Clerk user by their email address.
 */
export async function findClerkUserByEmail(email: string): Promise<User | null> {
  const usersResponse = await clerkClient.users.getUserList({
    emailAddress: [email],
  })

  const user = usersResponse.data[0]
  if (!user) return null;

  return {
    id: user.id,
    clerkUserId: user.id,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    username: user.username ?? user.emailAddresses[0]?.emailAddress?.split('@')[0] ?? '',
    email: user.emailAddresses[0]?.emailAddress ?? '',
    phoneNumber: user.phoneNumbers[0]?.phoneNumber ?? '',
    status: 'active' as UserStatus,
    role: 'manager',
    roleNames: ['manager'],
    roleIds: [],
    createdAt: new Date(user.createdAt).toISOString(),
    updatedAt: new Date(user.updatedAt).toISOString(),
  }
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
      clerkUserId: user.id,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      username: user.username ?? user.emailAddresses[0]?.emailAddress?.split('@')[0] ?? '',
      email: user.emailAddresses[0]?.emailAddress ?? '',
      phoneNumber: user.phoneNumbers[0]?.phoneNumber ?? '',
      status: 'active' as UserStatus,
      role: 'manager',
      roleNames: ['manager'],
      roleIds: [],
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: new Date(user.updatedAt).toISOString(),
    }
  } catch (_error) {
    return null
  }
}
