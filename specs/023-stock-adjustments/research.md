# Research Notes: Stock Adjustments

This document resolves the design and technical clarifications identified in the feature specification.

## Clarification 1: Approval Workflow for Stock Adjustments

- **Decision**: **Option A (Immediate Application)**. Authorized roles (e.g., Managers, Admins) apply adjustments directly; the stock is updated instantly.
- **Rationale**: Immediate stock correction is critical for active POS operations. Implementing a pending/approval state for simple stock corrections introduces operational friction. Access is restricted using role-based permissions (RBAC) so only Managers/Admins can perform these actions.
- **Alternatives Considered**: 
  - *Option B (Simple Dual-Authorization)*: Submit as pending. Rejected because it slows down floor operations.
  - *Option C (Value-Based Threshold)*: Auto-approve small adjustments, require approval for large ones. Rejected to keep the MVP simple.

## Clarification 2: Stocktaking Sales Freeze

- **Decision**: **Option A (No Freeze - Dynamic Delta)**. Sales continue during the count. The system captures system stock at count initiation and applies only the discrepancy delta to current live stock.
- **Rationale**: Locking the store or blocking POS checkouts causes revenue loss and operational downtime. Using the discrepancy delta (Physical Count - System Snapshot) ensures that sales made *during* the count are not lost or incorrectly adjusted.
- **Alternatives Considered**: 
  - *Option C (Full Store Freeze)*: Block all transactions. Rejected due to business impact.
  - *Option B (Variant-Specific Freeze)*: Block checkout of counted items. Rejected due to complex routing/POS integration requirements.

## Clarification 3: Damaged Goods Cost Override

- **Decision**: **Option A (Strict Average Cost)**. The system strictly uses the product variant's current `avg_cost` from `stock_balances` to calculate cost loss.
- **Rationale**: Sticking to the system-calculated average cost preserves financial consistency and prevents manual data entry errors or manipulation of shrinkage values.
- **Alternatives Considered**: 
  - *Option B (Optional User Override)*: Allow users to edit unit cost. Rejected to preserve audit and accounting integrity.
