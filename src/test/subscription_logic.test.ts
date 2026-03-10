import { expect, test, describe } from 'vitest';
import { addMonths } from 'date-fns';
import { calculateEndDate, isSubscriptionActive } from '../lib/subscription_utils';

describe('Subscription Logic', () => {
  test('calculateEndDate correctly adds months', () => {
    const startDate = new Date('2026-03-10');
    expect(calculateEndDate(startDate, 1)).toEqual(addMonths(startDate, 1));
    expect(calculateEndDate(startDate, 3)).toEqual(addMonths(startDate, 3));
    expect(calculateEndDate(startDate, 6)).toEqual(addMonths(startDate, 6));
    expect(calculateEndDate(startDate, 12)).toEqual(addMonths(startDate, 12));
  });

  test('calculateEndDate handles leap years correctly', () => {
    const startDate = new Date('2024-02-29'); // Leap year
    const endDate = calculateEndDate(startDate, 12);
    expect(endDate.getFullYear()).toBe(2025);
    expect(endDate.getMonth()).toBe(1); // February
    expect(endDate.getDate()).toBe(28); // Not a leap year next year
  });

  test('isSubscriptionActive correctly determines if a subscription is valid', () => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const yesterday = new Date(today.getTime() - 86400000);

    expect(isSubscriptionActive('paid', tomorrow)).toBe(true);
    expect(isSubscriptionActive('new', tomorrow)).toBe(false);
    expect(isSubscriptionActive('canceled', tomorrow)).toBe(false);
    expect(isSubscriptionActive('paid', yesterday)).toBe(false);
    expect(isSubscriptionActive('paid', null)).toBe(false);
  });
});
