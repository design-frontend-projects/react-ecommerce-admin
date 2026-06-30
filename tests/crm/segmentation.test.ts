import { describe, it, expect, vi, beforeEach } from 'vitest';
import { determineSegment } from '@/services/crm/segmenter';
import { subDays, subMonths } from 'date-fns';

describe('CRM Segmentation Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T12:00:00Z'));
  });

  it('should classify as VIP if spend is > $500 in last 30 days', () => {
    const customer = {
      customer_id: 1,
      created_at: subMonths(new Date(), 2),
      last_active_at: new Date(),
    };
    const sales = [
      { sale_date: subDays(new Date(), 10), total_amount: 300 },
      { sale_date: subDays(new Date(), 20), total_amount: 250 },
    ];
    
    expect(determineSegment(customer, sales)).toBe('VIP');
  });

  it('should classify as frequent if >= 3 orders in last 30 days but spend <= $500', () => {
    const customer = {
      customer_id: 2,
      created_at: subMonths(new Date(), 2),
      last_active_at: new Date(),
    };
    const sales = [
      { sale_date: subDays(new Date(), 10), total_amount: 50 },
      { sale_date: subDays(new Date(), 15), total_amount: 50 },
      { sale_date: subDays(new Date(), 20), total_amount: 50 },
    ];
    
    expect(determineSegment(customer, sales)).toBe('frequent');
  });

  it('should classify as new if created in last 30 days without hitting VIP/frequent thresholds', () => {
    const customer = {
      customer_id: 3,
      created_at: subDays(new Date(), 10),
      last_active_at: new Date(),
    };
    const sales = [
      { sale_date: subDays(new Date(), 5), total_amount: 100 },
    ];
    
    expect(determineSegment(customer, sales)).toBe('new');
  });

  it('should classify as inactive if last_active_at is older than 6 months', () => {
    const customer = {
      customer_id: 4,
      created_at: subMonths(new Date(), 12),
      last_active_at: subMonths(new Date(), 7),
    };
    const sales = [
      { sale_date: subMonths(new Date(), 8), total_amount: 1000 },
    ];
    
    expect(determineSegment(customer, sales)).toBe('inactive');
  });

  it('should fallback to active for regular customers', () => {
    const customer = {
      customer_id: 5,
      created_at: subMonths(new Date(), 3),
      last_active_at: subDays(new Date(), 2),
    };
    const sales = [
      { sale_date: subDays(new Date(), 2), total_amount: 50 },
    ];
    
    expect(determineSegment(customer, sales)).toBe('active');
  });
});
