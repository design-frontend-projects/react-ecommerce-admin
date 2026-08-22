import prisma from '@/lib/prisma'

export async function promoteLeadToOpportunity(
  leadId: number | string,
  estimatedValue: number
) {
  return await prisma.$transaction(async (tx: any) => {
    const lead = await tx.crm_leads?.findUnique({
      where: { id: leadId },
    })

    if (!lead) {
      throw new Error(`Lead with id ${leadId} not found`)
    }

    // Convert to Customer Profile
    const customer = await tx.customers.create({
      data: {
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        tenant_id: lead.tenant_id,
      },
    })

    // Initialize a linked opportunity record
    const opportunity = await tx.crm_opportunities?.create({
      data: {
        customer_id: customer.id,
        stage: 'Proposal',
        value: estimatedValue,
        close_probability: 50,
      },
    })

    // Update lead status
    await tx.crm_leads?.update({
      where: { id: leadId },
      data: { status: 'Converted' },
    })

    return { customer, opportunity }
  })
}

export async function updateOpportunityStage(
  opportunityId: number | string,
  newStage: string
) {
  const db = prisma as any
  return await db.crm_opportunities?.update({
    where: { id: opportunityId },
    data: { stage: newStage },
  })
}
