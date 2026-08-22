import prisma from '@/lib/prisma'

export async function getCRMMetrics() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const db = prisma as any
  const [totalLeads, convertedLeads, opportunities, wonOpportunities] =
    await Promise.all([
      db.crm_leads?.count ? db.crm_leads.count() : 0,
      db.crm_leads?.count ? db.crm_leads.count({ where: { status: 'Converted' } }) : 0,
      db.crm_opportunities?.count ? db.crm_opportunities.count() : 0,
      db.crm_opportunities?.count ? db.crm_opportunities.count({ where: { stage: 'Closed Won' } }) : 0,
    ])

  const recentWonOpportunities = db.crm_opportunities?.findMany
    ? await db.crm_opportunities.findMany({
        where: {
          stage: 'Closed Won',
          created_at: { gte: thirtyDaysAgo },
        },
      })
    : []

  const recentRevenue = recentWonOpportunities.reduce(
    (sum: number, opp: any) => sum + Number(opp.value || 0),
    0
  )

  const leadConversionRate =
    totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
  const winRate =
    opportunities > 0 ? (wonOpportunities / opportunities) * 100 : 0

  return {
    totalLeads,
    convertedLeads,
    leadConversionRate,
    opportunities,
    wonOpportunities,
    winRate,
    recentRevenue,
  }
}
