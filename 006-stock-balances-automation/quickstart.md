# Quickstart: Stock Balances & Inventory Automation

## Setup

1. **Database Migration**:
   - Run `npx prisma migrate dev` to ensure `stock_balances` and `inventory_movements` are in sync.
   - Deploy Supabase triggers/functions in `supabase/migrations/20260402000000_stock_automation.sql`.

2. **Frontend Dependencies**:
   - `pnpm install` (using TanStack Query, React Hook Form, and Zod).

## Implementation Flow

1. **Stock Overview**: Navigate to `/inventory/stock-balances` to view active levels.
2. **Manual Adjustment**: Click "Adjust" on any row to update stock manually.
3. **PO Automation**:
   - Create a Purchase Order.
   - Convert to a Purchase Invoice.
   - Mark Invoice as "Posted".
   - Check Stock Balances for the increase.
4. **Refund Automation**:
   - Find a Sale.
   - Create a Refund.
   - Process the Refund.
   - Check Stock Balances for the increase.

## Verification

- `npm run test:inventory` (to be created) for integration testing.
- Check Supabase Logs for trigger execution errors.
