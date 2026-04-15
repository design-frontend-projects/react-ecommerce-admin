# Feature Specification: POS Shipment Integration

**Feature Branch**: `018-pos-shipment`  
**Created**: 2026-04-15  
**Status**: Draft  
**Input**: User description: "Enhance POS with Shipment feature and final invoice updates"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an Order with Shipment (Priority: P1)

As a cashier, I want to be able to mark an order for shipment and enter the delivery details so that the restaurant can manage the delivery process correctly.

**Why this priority**: Essential for expanding the POS utility to handle delivery orders, which is a core requirement for modern restaurants.

**Independent Test**: Can be fully tested by selecting items in POS, clicking Checkout, enabling Shipment, filling details, and verifying the `res_shipments` table in the database contains the correct link to the order and the employee ID.

**Acceptance Scenarios**:

1. **Given** I am in the POS screen with items in the cart, **When** I click "Checkout", **Then** I should see a "Shipment" toggle or option.
2. **Given** the "Shipment" toggle is enabled, **When** I click "Process Payment" without filling address details, **Then** I should see validation errors for required shipment fields.
3. **Given** valid shipment details are provided, **When** I process the payment, **Then** the order should be saved and a corresponding shipment record should be created with the current `clerk_user_id`.

---

### User Story 2 - Shipment Details on Invoice (Priority: P2)

As a customer or delivery driver, I want the invoice to display the shipment details and the unique Order ID so that the delivery can be executed accurately.

**Why this priority**: Necessary for the operational success of the shipment feature; without details on the receipt, the driver won't know where to go.

**Independent Test**: Can be tested by completing a shipment order and verifying the generated invoice UI/PDF contains the Recipient Name, Address, Phone, and the Order ID.

**Acceptance Scenarios**:

1. **Given** a shipment order was just processed, **When** the invoice is generated, **Then** it MUST display the recipient's name, phone, and full delivery address.
2. **Given** any POS order (shipment or not), **When** the invoice is generated, **Then** it MUST clearly display the unique Order ID (e.g., #ORD-1234).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Shipment" toggle/switch in the Checkout Dialog.
- **FR-002**: System MUST conditionalize the visibility of shipment fields (Recipient Name, Phone, Address, City, Notes) based on the "Shipment" toggle.
- **FR-003**: System MUST require `recipient_name`, `recipient_phone`, and `delivery_address` if the order is marked for shipment.
- **FR-004**: System MUST automatically associate the `clerk_user_id` of the logged-in employee with the shipment record.
- **FR-005**: System MUST create a record in `res_shipments` table linked to the current `res_orders` record upon successful payment.
- **FR-006**: System MUST update the invoice component to fetch and display shipment details if they exist for the order.
- **FR-007**: System MUST display the Order ID prominently on all invoices.

### Key Entities

- **res_shipments**:
    - `id` (UUID, PK)
    - `order_id` (UUID, FK, Unique) - Link to `res_orders`
    - `clerk_user_id` (String) - The employee who created the shipment (Required)
    - `recipient_name` (String)
    - `recipient_phone` (String)
    - `delivery_address` (Text)
    - `city`, `state`, `postal_code` (Optional Strings)
    - `status` (Enum/String: pending, shipped, delivered, cancelled)
    - `tracking_number`, `carrier` (Optional Strings)
    - `shipped_at`, `delivered_at` (Timestamps)
    - `notes` (Text)
    - `created_at`, `updated_at` (Timestamps)

- **res_orders**:
    - Update relationship to include `res_shipments` (One-to-One).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cashiers can add shipment details in under 30 seconds during the checkout flow.
- **SC-002**: 100% of shipment orders have a corresponding record in the `res_shipments` table with valid `clerk_user_id`.
- **SC-003**: The invoice generated after a shipment order displays all 4 required shipment fields (ID, Name, Phone, Address).

## Assumptions

- The `res_orders` table is the primary source of truth for POS orders.
- Authentication (Clerk) is already configured and `clerk_user_id` is available in the current context.
- The POS system uses a shared database where RLS (Row Level Security) might need adjustment for the new table.
- Print/Invoice logic is client-side or accessible for modification in the frontend features directory.
