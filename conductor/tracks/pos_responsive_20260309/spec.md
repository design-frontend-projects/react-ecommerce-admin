# Specification: POS Screen Enhancements (pos_responsive_20260309)

## Overview
This track focuses on improving the responsiveness and feature set of the Point of Sale (POS) module (`src/features/pos`). The goal is to ensure a seamless experience across all device sizes (mobile, tablet, desktop/kiosk), optimize the search interaction on small screens, and introduce new functional options for scanning and basket management.

## Functional Requirements
- **Responsive POS Layout:**
  - **Mobile:** Refine the layout to be fully usable on small smartphone screens (portrait and landscape).
  - **Tablet:** Optimize for 7-10 inch tablets, ensuring touch targets are appropriately sized (min 44x44px per workflow).
  - **Desktop/Kiosk:** Polish the layout for large monitors and high-resolution kiosk displays.
- **Dynamic Search Field:**
  - On small screens, the search input should be hidden by default.
  - Clicking the search icon should trigger an **Inline Expansion**, where the input field expands to show the full search bar, potentially pushing other header elements.
- **Transparent/Minimized Scan Dialog:**
  - Implement a "Minimized Scan Mode" for the scan dialog. 
  - This mode should allow employees to see the items list behind the dialog while the scanner is active.
  - The UI should provide a clear toggle or setting to switch between standard and minimized/transparent views.
- **Toggled Basket (Slide-out Drawer):**
  - Implement the basket as a **Slide-out Drawer (Sheet)**.
  - Users can toggle the basket view to free up screen space for product browsing/selection.
  - The basket should be easily accessible via a persistent button or tab.

## Non-Functional Requirements
- **Accessibility:** Maintain high standards (ARIAL labels, focus management for the new drawer and search expansion).
- **Performance:** Ensure animations for the search expansion and basket drawer are smooth (zero CLS target).
- **Consistency:** Use existing ShadcnUI components (Sheet, Input, Button) and follow the project's styling guidelines (Tailwind CSS).

## Acceptance Criteria
- [ ] POS screen is fully responsive and usable on mobile (iPhone 13 size), tablet (iPad Air size), and desktop (1920x1080).
- [ ] Search field in the POS header expands inline when the icon is clicked on screens < 768px.
- [ ] Scan dialog has a "minimize" or "transparent" option that allows viewing the items list.
- [ ] Basket can be toggled via a slide-out drawer (Sheet) component.
- [ ] All new UI interactions are touch-friendly (44x44px targets).
- [ ] Automated tests (unit/integration) cover the new toggle states and responsive behavior.

## Out of Scope
- Major backend changes to the transaction logic.
- Adding new payment methods.
- Refactoring the entire dashboard layout outside the POS feature.