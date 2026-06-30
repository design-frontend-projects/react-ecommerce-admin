# Technical Research: POS CRM Module Integration

This document outlines the technical research, architectural decisions, and resolutions to all clarifying questions for the POS CRM module integration.

---

## 1. Resolution of Clarifications

### Research 1.1: Lead Conversion Target

*   **Decision**: **Option A** (Convert qualified leads to a unified `customers` profile and initialize a linked deal/`crm_opportunities` record).
*   **Rationale**: This ensures a clean separation of concerns. Contact details are maintained in a singular, normalized `customers` table, while the sales funnel pipeline tracking is managed in the `crm_opportunities` table.
*   **Alternatives Considered**: 
    *   *Option B (Immediately generate a draft POS order)*: Rejected because lead workflows often require multiple quotes, pricing discussions, or scheduling tasks before finalizing items. Pre-generating a POS order would clutter the sales checkout ledger.
    *   *Option C (Convert only to opportunity without linking customer)*: Rejected because it breaks historical tracking of interactions, tasks, and lifetime value.

---

### Research 1.2: Duplicate Resolution Policy at Checkout

*   **Decision**: **Option A** (Strict matching on both phone and email; flag discrepancy).
*   **Rationale**: If a POS order matches an existing email but has a different phone number, or vice versa, the transaction will link to the customer record, but the customer profile's status will update to `NEEDS_REVIEW`. A dashboard alert will prompt admins to verify or update the mismatch. This prevents silent database corruption when different individuals share an email or phone number.
*   **Alternatives Considered**:
    *   *Option B (Auto-merge based on either)*: Rejected because family members sharing a phone number would have their transaction histories merged, corrupting product affinity and CLV data.
    *   *Option C (Never auto-merge, always create new)*: Rejected because it creates excessive duplicate accounts, rendering segment-level reports useless.

---

### Research 1.3: Customer PII Data Retention Period

*   **Decision**: **Option A** (3 Years/36 Months of Inactivity).
*   **Rationale**: 3 years of inactivity triggers automatic anonymization. The contact fields (`first_name`, `last_name`, `email`, `phone`, `address`) are cleared or set to anonymized strings (e.g. `Anonymized Customer #1029`), while the sales statistics (`pos_sales` and `res_orders` relationships) remain intact for long-term cohort, demand, and financial analytics. This satisfies GDPR's minimization requirements while preserving business intelligence.
*   **Alternatives Considered**:
    *   *Option B (5 Years)*: Rejected as unnecessarily long for standard retail and restaurant sales cycles, increasing data liability.
    *   *Option C (Indefinite)*: Rejected due to privacy compliance risks.

---

## 2. Technical Architectural Decisions

### DB Migrations with Prisma 7

To integrate the new entities without locking the production `customers`, `pos_sales`, or `res_orders` tables during rollout:
- The new tables (`crm_leads`, `crm_opportunities`, `crm_tasks`, `crm_interactions`, `crm_audit_logs`) will be created as new tables.
- Foreign key relationships to `customers` will use indexes to guarantee query performance:
  ```prisma
  @@index([customer_id])
  ```
- All migration operations will execute in a PostgreSQL transaction blocks.

### State & Performance with Zustand

For the Kanban opportunity pipeline board, we use Zustand to handle client-side drag-and-drop operations efficiently:
- Maintain a local cache of opportunity card arrays organized by pipeline stage.
- Optimistically update card position locally when dragged, and fire the database update in the background with TanStack Query.
- Revert the state to previous cache if the API request fails (with Toast alert).

### Recharts Optimization

To prevent chart lag on the manager dashboard:
- Aggregate reporting data on the database side using Prisma `groupBy` queries.
- Limit initial dashboard load range to 30 days. Let managers request larger intervals (90 days, 12 months) via client-side filters.
