import { describe, test, expect, vi } from 'vitest';
import { isSubscriptionActive } from '../lib/subscription_utils';

describe('Subscription Guard Logic', () => {
  test('should allow access for paid subscription that is not expired', () => {
    const status = 'paid';
    const endDate = new Date(Date.now() + 86400000); // tomorrow
    expect(isSubscriptionActive(status, endDate)).toBe(true);
  });

  test('should deny access for new status', () => {
    const status = 'new';
    const endDate = new Date(Date.now() + 86400000);
    expect(isSubscriptionActive(status, endDate)).toBe(false);
  });

  test('should deny access for expired subscription', () => {
    const status = 'paid';
    const endDate = new Date(Date.now() - 86400000); // yesterday
    expect(isSubscriptionActive(status, endDate)).toBe(false);
  });

  test('should deny access for canceled status', () => {
    const status = 'canceled';
    const endDate = new Date(Date.now() + 86400000);
    expect(isSubscriptionActive(status, endDate)).toBe(false);
  });
});
