import { Temporal } from '@js-temporal/polyfill'
import prisma from '@/lib/prisma'

export async function getCRMMetrics() {
  const oneMonthAgoInstant = Temporal.Now.instant().subtract({ days: 30 })
  const thirtyDaysAgo = new Date(oneMonthAgoInstant.epochMilliseconds)

  const [totalLeads, convertedLeads, opportunities, wonOpportunities] =
    await Promise.all([
      prisma.crm_leads.count(),
      prisma.crm_leads.count({ where: { status: 'Converted' } }),
      prisma.crm_opportunities.count(),
      prisma.crm_opportunities.count({ where: { stage: 'Closed Won' } }),
    ])

  const recentWonOpportunities = await prisma.crm_opportunities.findMany({
    where: {
      stage: 'Closed Won',
      created_at: { gte: thirtyDaysAgo },
    },
  })

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
