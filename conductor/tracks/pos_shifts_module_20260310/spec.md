# Specification: POS & Inventory Shifts Module

## 1. Overview
The **Shifts Module** is designed to track and manage employee work sessions within the POS and Inventory applications. It ensures cash accountability by logging opening and closing cash amounts, shift duration, and associated transactions.

## 2. Functional Requirements
### 2.1 Shift Initialization
- **Open Shift:** Employees can open a new shift. The system will suggest the `closing_cash` from the most recent closed shift as the `opening_cash`, which the employee can manually override if necessary.
- **Validation:** Only one shift can be "open" per employee at any given time (or per station, depending on business logic).

### 2.2 Shift Management
- **Closing Shift:** Employees can close their own active shifts by entering the final `closing_cash`.
- **Manager Override:** Authorized managers have the permission to close any active shift in the system.
- **Persistence:** All shift data is stored in the `public.res_shifts` table in Supabase.

### 2.3 UI & Experience
- **Dedicated Navigation:** A new "Shifts" page will be added to the main application sidebar.
- **Responsive Design:** The UI will be built using Next.js and Shadcn UI, optimized for both desktop and mobile devices.

### 2.4 Analytics & Reporting
- **Shifts Analytics:** A dedicated tab or dialog will provide insights into:
    - **Cash Variance:** Difference between expected cash (based on transactions) and actual `closing_cash`.
    - **Transaction History:** A detailed list of all sales and refunds processed during the shift.
    - **Payment Summary:** A breakdown of totals grouped by payment method (Cash, Card, etc.).

## 3. Data Schema (`public.res_shifts`)
- `id` (uuid, primary key)
- `opened_by` (uuid, fk to `res_employees`)
- `closed_by` (uuid, fk to `res_employees`)
- `opening_cash` (numeric)
- `closing_cash` (numeric)
- `status` ('open', 'closed')
- `opened_at` (timestamptz)
- `closed_at` (timestamptz)
- `notes` (text)

## 4. Acceptance Criteria
- [ ] Shift can be opened with a suggested/manual cash amount.
- [ ] Shift can be closed by the owner or a manager.
- [ ] `res_shifts` table updates correctly on all actions.
- [ ] Analytics display accurate variance and transaction summaries.
- [ ] UI is responsive and follows existing design patterns.

## 5. Out of Scope
- Employee scheduling and shift rosters.
- Integration with external payroll systems.
