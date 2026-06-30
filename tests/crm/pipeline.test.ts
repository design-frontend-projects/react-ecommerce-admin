import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promoteLeadToOpportunity, updateOpportunityStage } from '@/services/crm/pipelineManager';

const mockPrisma = vi.hoisted(() => ({
  crm_leads: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  customers: {
    create: vi.fn(),
  },
  crm_opportunities: {
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(mockPrisma)),
}));

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

describe('CRM Pipeline Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promoteLeadToOpportunity creates a customer and an opportunity', async () => {
    mockPrisma.crm_leads.findUnique.mockResolvedValueOnce({
      id: 1,
      first_name: 'John',
      last_name: 'Lead',
      email: 'john.lead@example.com',
      status: 'Qualified',
    });

    mockPrisma.customers.create.mockResolvedValueOnce({
      customer_id: 10,
      first_name: 'John',
      last_name: 'Lead',
      email: 'john.lead@example.com',
    });

    mockPrisma.crm_opportunities.create.mockResolvedValueOnce({
      id: 100,
      customer_id: 10,
      stage: 'Proposal',
      value: 5000,
    });

    mockPrisma.crm_leads.update.mockResolvedValueOnce({
      id: 1,
      status: 'Converted',
    });

    const result = await promoteLeadToOpportunity(1, 5000);

    expect(mockPrisma.customers.create).toHaveBeenCalled();
    expect(mockPrisma.crm_opportunities.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customer_id: 10,
        value: 5000,
        stage: 'Proposal',
      }),
    });
    expect(mockPrisma.crm_leads.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'Converted' },
    });
    
    expect(result.opportunity.id).toBe(100);
  });
  
  it('updateOpportunityStage updates the stage of an opportunity', async () => {
    mockPrisma.crm_opportunities.update.mockResolvedValueOnce({
      id: 100,
      stage: 'Closed Won',
    });

    const result = await updateOpportunityStage(100, 'Closed Won');
    
    expect(mockPrisma.crm_opportunities.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: { stage: 'Closed Won' }
    });
    expect(result.stage).toBe('Closed Won');
  });
});
