import { create } from 'zustand'

// Basic types for the CRM state (will be expanded or replaced by Prisma types in actual usage)
export interface Opportunity {
  opportunity_id: number
  title: string
  value: number
  stage: string
  probability: number
  customer_id?: number | null
  lead_id?: number | null
}

export interface Lead {
  lead_id: number
  first_name: string
  last_name: string
  company?: string | null
  status: string
}

interface CRMState {
  leads: Lead[]
  opportunities: Opportunity[]
  setLeads: (leads: Lead[]) => void
  setOpportunities: (opportunities: Opportunity[]) => void
  updateOpportunityStage: (opportunity_id: number, newStage: string) => void
}

export const useCRMStore = create<CRMState>((set) => ({
  leads: [],
  opportunities: [],
  setLeads: (leads) => set({ leads }),
  setOpportunities: (opportunities) => set({ opportunities }),
  updateOpportunityStage: (opportunity_id, newStage) =>
    set((state) => ({
      opportunities: state.opportunities.map((opp) =>
        opp.opportunity_id === opportunity_id
          ? { ...opp, stage: newStage }
          : opp
      ),
    })),
}))

// Selectors for customer segmentation
export const selectVIPCustomers = (state: CRMState) =>
  state.leads.filter((lead) => lead.status === 'VIP')

export const selectFrequentCustomers = (state: CRMState) =>
  state.leads.filter((lead) => lead.status === 'frequent')

export const selectInactiveCustomers = (state: CRMState) =>
  state.leads.filter((lead) => lead.status === 'inactive')

export const selectNewCustomers = (state: CRMState) =>
  state.leads.filter((lead) => lead.status === 'new')
