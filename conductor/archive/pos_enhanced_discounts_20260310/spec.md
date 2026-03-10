# Specification: POS Enhanced Discounts, Payments & Customer Capture

## Overview
Enhance the POS module by implementing manual discounts (max 10%) and promo code validation via Supabase/Prisma tables, and an updated checkout workflow in the side basket view. This includes capturing customer mobile numbers, handling multiple payment methods, and calculating change for cash transactions.

## Functional Requirements

### 1. Enhanced Discount Logic
- **Manual Discount:**
  - Interface for entry: Percentage or Fixed Amount.
  - **Validation:** Must not exceed 10% of the current subtotal.
- **Promo Codes:**
  - Input field for promo codes.
  - Validation against the `promotions` table (active status, start/end dates, usage limits, minimum purchase).
  - Support for applying both manual and promo discounts simultaneously (Additive).

### 2. Side Basket (In-Basket View) Updates
- **Displays:**
  - **Subtotal:** Clear display of the total before any discounts.
  - **Discounts:** Breakdown of manual and promo discount amounts.
- **Inputs:**
  - **Mobile Number:** Text field for customer contact (for future ads).
  - **Payment Method:** Single-choice selection (Visa, NFC, QR Code, Cash).
  - **Received Amount:** Only visible if 'Cash' is selected.
  - **Change Display:** Live calculation of `Received - Total`.

### 3. Data Persistence (Prisma/PostgreSQL)
- **Tables Updated/Created:**
  - `promotions`: Store code, discount type/value, limits, and validity.
  - `promotion_usage`: Record each application of a promo code.
  - `transactions`: Primary record for the sale. Add fields for `mobile_number`, `promotion_id`, `received_amount`, and `change_amount`.
  - `transaction_details`: (Optional/Reference) Store per-item details including applicable discounts.

## Acceptance Criteria
- [ ] Manual discount is capped at 10% of subtotal.
- [ ] Promo codes correctly validate against database rules (expiry, usage limits).
- [ ] Cash payment workflow correctly shows change due.
- [ ] Successful transactions record both manual and promo discount values.
- [ ] `promotion_usage` is incremented upon transaction completion.
- [ ] Mobile number is persisted in the `transactions` table.

## Out of Scope
- Split payments (e.g., half cash, half card).
- Loyalty point integration (beyond recording mobile number).
- Multiple concurrent promo codes.
