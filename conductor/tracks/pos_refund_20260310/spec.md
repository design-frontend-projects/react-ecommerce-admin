# Specification: POS Refund Module

## Overview
Implement a robust refund system within the POS module (`src/features/pos/`). This module will allow employees to process both full and partial refunds for previous sales. It will integrate with the existing `refunds` table, update product stock levels based on item condition, and require manager approval for security.

## Functional Requirements
- **Refund Processing**:
    - Support both **Full Refunds** (refunding an entire transaction) and **Partial Refunds** (refunding specific items/quantities).
    - Allow employees to search for previous sales by Sale ID or Transaction Number.
- **Approval Workflow**:
    - **Manager Approval Required**: Refunds cannot be processed without a manager's PIN or explicit authorization.
- **Inventory Integration (Conditional Restock)**:
    - For each refunded item, the employee must specify if the item should be **returned to stock** (restockable) or **not** (damaged/discarded).
    - If restockable, the system will automatically increment the `inventory.quantity` for the associated product.
- **Financial Tracking**:
    - **Manual Selection of Refund Method**: Support various refund methods (Cash, Card, Store Credit, etc.).
    - Create a record in the `refunds` table for every transaction, including notes, reason, and the processing employee ID.
- **Database Logic**:
    - Implement a Supabase RPC or database function to ensure atomic updates across `refunds`, `inventory`, and (if applicable) `pos_sales` tables.
- **UI/UX**:
    - Create a dedicated, responsive **Refund Tab** in the POS module.
    - User-friendly interface for selecting items and quantities to refund.
    - Clear status feedback and error handling.

## Non-Functional Requirements
- **Security**: Strict access control for the refund functionality.
- **Performance**: Efficient lookup of historical sales.
- **Responsiveness**: The UI must work seamlessly on desktop, tablet, and mobile devices.

## Acceptance Criteria
- [ ] Users can find a past sale and initiate a refund.
- [ ] Users can select specific items and quantities for a partial refund.
- [ ] Refunds require manager approval before finalizing.
- [ ] Inventory stock is correctly updated (incremented) only for restockable items.
- [ ] A new entry is created in the `refunds` table with all relevant details.
- [ ] The UI is responsive and provides clear visual feedback.

## Out of Scope
- Automated payment gateway reversals (to be handled as a separate enhancement).
- Complex store credit management systems beyond simple logging.