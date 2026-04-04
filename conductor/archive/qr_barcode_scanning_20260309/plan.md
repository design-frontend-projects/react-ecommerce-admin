# Implementation Plan: QR/Barcode Scanning and Generation Track

## Phase 1: Dependencies and Library Setup
- [ ] Task: Install required dependencies (`@yudiel/react-qr-scanner`, `react-barcode`)
    - [ ] Add packages using pnpm
    - [ ] Verify imports and basic configuration for both libraries
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Dependencies and Library Setup' (Protocol in workflow.md)

## Phase 2: Product Page - Real-time Barcode Generation
- [ ] Task: Implement barcode image component in the product form
    - [ ] Create a reusable `BarcodeDisplay` component using `react-barcode`
    - [ ] Update `src/features/products/index.tsx` (or related form components) to include this display
    - [ ] Ensure real-time update when the barcode field changes
- [ ] Task: Write Tests: Verify barcode generation logic and UI updates
    - [ ] Write unit tests for `BarcodeDisplay`
    - [ ] Write integration tests for the product form integration
- [ ] Task: Implement: Pass tests and refine UI/UX for barcode display
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Product Page - Real-time Barcode Generation' (Protocol in workflow.md)

## Phase 3: Core Scanner Component Integration
- [ ] Task: Develop a reusable `QRCodeScanner` component
    - [ ] Create a modal wrapper for `@yudiel/react-qr-scanner`
    - [ ] Add basic controls: start/stop scanning, switch camera, and flashlight (if supported)
    - [ ] Implement audio/visual feedback for successful scans
- [ ] Task: Write Tests: Verify scanner lifecycle and callback handling
    - [ ] Mock the scanner library to test successful and failed scan callbacks
    - [ ] Test the modal open/close states
- [ ] Task: Implement: Complete the `QRCodeScanner` with proper error handling and layout
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Core Scanner Component Integration' (Protocol in workflow.md)

## Phase 4: Product Form - Scanner Integration
- [ ] Task: Add scanner trigger to the product form's barcode field
    - [ ] Add a scan icon/button next to the barcode input in the form
    - [ ] Integrate the `QRCodeScanner` to fill the input field upon successful scan
- [ ] Task: Write Tests: Verify form field auto-filling via scanner
    - [ ] Write integration test to ensure the form field value updates correctly after a scan
- [ ] Task: Implement: Pass tests and ensure smooth UX between scanner and form
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Product Form - Scanner Integration' (Protocol in workflow.md)

## Phase 5: POS Page - Scanner Integration (Auto-add to Cart)
- [ ] Task: Integrate scanner into the POS interface
    - [ ] Add the scanner trigger button to `src/features/pos/index.ts` (or relevant sub-components)
    - [ ] Implement the logic to lookup products by barcode and add them to the cart
    - [ ] Enable continuous scanning support for POS
- [ ] Task: Write Tests: Verify POS product lookup and cart addition
    - [ ] Mock scanning and verify the cart state updates correctly
    - [ ] Test edge cases (e.g., product not found, multiple items)
- [ ] Task: Implement: Pass tests and optimize scanning performance in POS
- [ ] Task: Conductor - User Manual Verification 'Phase 5: POS Page - Scanner Integration (Auto-add to Cart)' (Protocol in workflow.md)
