# Implementation Plan: POS Screen Enhancements (pos_responsive_20260309)

## Phase 1: Foundation & Setup
- [ ] Task: Research existing POS structure in `src/features/pos` to identify breakpoints and key components.
- [ ] Task: Update `respos-store.ts` (if needed) to manage state for the new basket toggle and scan mode options.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Setup' (Protocol in workflow.md)

## Phase 2: Responsive POS Layout & Basket Drawer
- [ ] Task: Refactor the main POS layout to support a responsive grid/flex system for mobile, tablet, and desktop.
- [ ] Task: Write failing tests (Red Phase) for the basket drawer toggle functionality.
- [ ] Task: Implement the basket as a **Slide-out Drawer (Sheet)** using ShadcnUI components. (Green Phase)
- [ ] Task: Verify the basket drawer correctly handles state and item display across screen sizes.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Responsive POS Layout & Basket Drawer' (Protocol in workflow.md)

## Phase 3: Dynamic Search Field
- [ ] Task: Write failing tests (Red Phase) for the inline expansion of the search field on small screens.
- [ ] Task: Refactor the POS header to conditionally hide the search input and show an icon for screens < 768px.
- [ ] Task: Implement the **Inline Expansion** logic for the search field when the icon is clicked. (Green Phase)
- [ ] Task: Polish animations and ensure focus management is correct when expanding/collapsing the search bar.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Dynamic Search Field' (Protocol in workflow.md)

## Phase 4: Minimized Scan Dialog
- [ ] Task: Write failing tests (Red Phase) for the "Minimized Scan Mode" toggle in the scan dialog.
- [ ] Task: Update the scan dialog UI to include an option for **Minimized Scan Mode**.
- [ ] Task: Implement the minimized UI, ensuring employees can see the items list while scanning. (Green Phase)
- [ ] Task: Refactor and polish the scan dialog interactions for clarity and ease of use.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Minimized Scan Dialog' (Protocol in workflow.md)

## Phase 5: Final Polish & Verification
- [ ] Task: Perform a comprehensive audit of touch targets (min 44x44px) across all POS interactions.
- [ ] Task: Run full regression tests for the POS module, ensuring no regressions in transaction logic.
- [ ] Task: Verify the POS experience on an actual iPhone or Safari developer tools (mobile simulator).
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Polish & Verification' (Protocol in workflow.md)
