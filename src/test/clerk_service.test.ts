import { expect, test, describe, vi } from 'vitest';
import { listClerkUsers, findClerkUserByEmail } from '../lib/clerk_service';

// Mock clerkClient
vi.mock('@clerk/backend', () => {
  return {
    createClerkClient: () => ({
      users: {
        getUserList: vi.fn().mockResolvedValue([
          {
            id: 'user_1',
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            emailAddresses: [{ emailAddress: 'john@example.com' }],
            phoneNumbers: [{ phoneNumber: '+1234567890' }],
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
          }
        ]),
        getCount: vi.fn().mockResolvedValue(1),
      }
    })
  };
});

describe('Clerk User Service', () => {
  test('listClerkUsers correctly maps and returns users', async () => {
    const users = await listClerkUsers();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      id: 'user_1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      status: 'active', // mapped status
    });
  });

  test('findClerkUserByEmail returns correct user', async () => {
    const user = await findClerkUserByEmail('john@example.com');
    expect(user?.email).toBe('john@example.com');
  });
});
