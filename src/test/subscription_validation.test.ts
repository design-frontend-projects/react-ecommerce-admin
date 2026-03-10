import { expect, test, describe } from 'vitest';
import { z } from 'zod';

// Zod schemas matching the Prisma models to validate structure
const SubscriptionSchema = z.object({
  name: z.string().min(1),
  duration_months: z.number().int().positive(),
  price: z.number().positive(),
});

const TenantSubscriptionSchema = z.object({
  clerk_user_id: z.string().min(1),
  email: z.string().email(),
  subscription_id: z.number().int().positive(),
  status: z.enum(['new', 'paid', 'canceled']),
});

describe('Subscription Model Validation (Structure)', () => {
  test('Subscription model structure is valid', () => {
    const validSub = {
      name: '1 Month',
      duration_months: 1,
      price: 10.00,
    };
    expect(SubscriptionSchema.parse(validSub)).toEqual(validSub);
  });

  test('Subscription model validation fails with invalid data', () => {
    const invalidSub = {
      name: '',
      duration_months: -1,
      price: 0,
    };
    expect(() => SubscriptionSchema.parse(invalidSub)).toThrow();
  });

  test('TenantSubscription model structure is valid', () => {
    const validTenantSub = {
      clerk_user_id: 'user_123',
      email: 'test@example.com',
      subscription_id: 1,
      status: 'new' as const,
    };
    expect(TenantSubscriptionSchema.parse(validTenantSub)).toEqual(validTenantSub);
  });

  test('TenantSubscription model validation fails with invalid email', () => {
    const invalidTenantSub = {
      clerk_user_id: 'user_123',
      email: 'not-an-email',
      subscription_id: 1,
      status: 'new' as const,
    };
    expect(() => TenantSubscriptionSchema.parse(invalidTenantSub)).toThrow();
  });
});
