import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scheduleTask } from '@/services/crm/activityManager';
import { subDays, addDays } from 'date-fns';

const mockPrisma = vi.hoisted(() => ({
  crm_tasks: {
    create: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

describe('CRM Task Scheduling Bounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T12:00:00Z'));
  });

  it('should prevent scheduling tasks in the past', async () => {
    const pastDate = subDays(new Date(), 1);
    
    await expect(scheduleTask(1, 'Call customer', pastDate)).rejects.toThrow(
      'Cannot schedule tasks in the past'
    );
    expect(mockPrisma.crm_tasks.create).not.toHaveBeenCalled();
  });

  it('should allow scheduling tasks in the future', async () => {
    const futureDate = addDays(new Date(), 2);
    mockPrisma.crm_tasks.create.mockResolvedValueOnce({
      id: 1,
      customer_id: 1,
      title: 'Call customer',
      due_date: futureDate,
      status: 'pending'
    });
    
    const task = await scheduleTask(1, 'Call customer', futureDate);
    expect(mockPrisma.crm_tasks.create).toHaveBeenCalledWith({
      data: {
        customer_id: 1,
        title: 'Call customer',
        due_date: futureDate,
        status: 'pending'
      }
    });
    expect(task.status).toBe('pending');
  });
});
