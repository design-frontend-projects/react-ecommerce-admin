import prisma from '@/lib/prisma';

export async function promoteLeadToOpportunity(leadId: number, estimatedValue: number) {
  return await prisma.$transaction(async (tx) => {
    const lead = await tx.crm_leads.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead with id ${leadId} not found`);
    }

    // Convert to Customer Profile
    const customer = await tx.customers.create({
      data: {
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        crm_status: 'active',
      },
    });

    // Initialize a linked opportunity record
    const opportunity = await tx.crm_opportunities.create({
      data: {
        customer_id: customer.customer_id,
        stage: 'Proposal',
        value: estimatedValue,
        close_probability: 50,
      },
    });

    // Update lead status
    await tx.crm_leads.update({
      where: { id: leadId },
      data: { status: 'Converted' },
    });

    return { customer, opportunity };
  });
}

export async function updateOpportunityStage(opportunityId: number, newStage: string) {
  return await prisma.crm_opportunities.update({
    where: { id: opportunityId },
    data: { stage: newStage },
  });
}
