# Implementation Tasks: POS Shipment Integration

## 📋 Task Breakdown

### Phase 1: Setup
- [ ] T001 Initialize branch `018-pos-shipment` and verify project base

### Phase 2: Foundational
- [ ] T002 Update `prisma/schema.prisma` to create `res_shipments` model and add one-to-one relationship to `res_orders`
- [ ] T003 Generate Prisma client with `npx prisma generate`
- [ ] T004 [P] Define TypeScript types for `ResShipment` in `src/features/pos/types.ts` (or appropriate shared type file)

### Phase 3: [US1] Create an Order with Shipment
**Story Goal**: Cashier can mark an order for shipment and enter delivery details.
- [ ] T005 [P] [US1] Add "Shipment" toggle state to `src/features/pos/components/checkout-modal.tsx`
- [ ] T006 [P] [US1] Create shipment form fields (recipient_name, recipient_phone, delivery_address, city, state, postal_code, notes) in `src/features/pos/components/checkout-modal.tsx`
- [ ] T007 [US1] Conditionalize visibility and validation of shipment form fields based on toggle in `src/features/pos/components/checkout-modal.tsx`
- [ ] T008 [US1] Update `src/features/pos/services/CheckoutService.ts` to associate `clerk_user_id` and save shipment details when processing payment

### Phase 4: [US2] Shipment Details on Invoice
**Story Goal**: Invoice displays shipment details and unique Order ID.
- [ ] T009 [P] [US2] Update order fetching query in `src/features/sales/api/get-invoices.ts` to include `res_shipments` details
- [ ] T010 [US2] Update frontend invoice component UI in `src/features/sales/components/InvoiceDetailView.tsx` to display recipient's name, phone, and full delivery address if shipment exists
- [ ] T011 [US2] Update invoice UI in `src/features/sales/components/InvoiceDetailView.tsx` to prominently display the unique Order ID (e.g., #ORD-1234)

### Phase 5: Polish & Final Integrations
- [ ] T012 Verify independent test scenarios for US1 (checkout with shipment creates valid record)
- [ ] T013 Verify independent test scenarios for US2 (invoice UI displays all necessary details)
- [ ] T014 Run linter, formatting, and verify build succeeds

## Dependencies

- Phase 2 Must be completed before Phase 3 and Phase 4.
- Phase 3 & 4 can be worked on concurrently by different team members once the schema is updated.

## Parallel Execution Opportunities

- After T002 & T003, one backend developer can implement T008 and T009.
- A frontend developer can implement T005, T006, T007, T010, and T011.

## Implementation Strategy

We will deliver US1 first as the MVP (checkout dialog and backend saving). Once the backend correctly creates records, we will proceed to US2 which displays this new information on generated invoices.
