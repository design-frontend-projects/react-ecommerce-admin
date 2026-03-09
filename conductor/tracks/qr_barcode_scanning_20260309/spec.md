# Specification: QR/Barcode Scanning and Generation Track

## 1. Overview
This track involves integrating QR/Barcode scanning capabilities using `@yudiel/react-qr-scanner` and automated barcode image generation using `@syncfusion/ej2-react-barcode-generator`. The primary goals are to enhance the POS workflow with fast product lookup and automate the generation of barcodes for the products catalog.

## 2. Functional Requirements
### 2.1 QR/Barcode Scanning
- **Scanner UI (POS):** A dedicated button to open a scanner modal in `src/features/pos/index.ts`.
- **Scanner UI (Products):** Integration within the product add/edit form to fill the `barcode` field by scanning an existing label.
- **Continuous Mode:** Support for continuous scanning in the POS interface to allow multiple items to be scanned in sequence.
- **POS Action:** When a code is successfully scanned in the POS page, the system should automatically find the matching product in the database and add it to the current cart/order.
- **Formats:** Support for both 1D (Barcodes) and 2D (QR Codes) scanning and identification.

### 2.2 Barcode Generation
- **Real-time Generation:** In `src/features/products/index.tsx` (product form), the barcode image should be generated and displayed in real-time as the user types or after a field change.
- **Formats:** Support generating both standard 1D barcodes and 2D QR codes based on the product data.
- **Library:** Utilize `@syncfusion/ej2-react-barcode-generator` for the rendering component.

## 3. Non-Functional Requirements
- **Performance:** Scanner initialization and recognition should be fast (under 500ms).
- **Usability:** The scanner UI must be intuitive and provide clear visual feedback (e.g., a "scan success" sound or visual cue).
- **Responsiveness:** Ensure the scanner works correctly on mobile devices with camera access.

## 4. Acceptance Criteria
- [ ] Users can open a scanner modal in the POS page and successfully scan a product.
- [ ] Scanned products are automatically added to the POS cart if a match is found.
- [ ] Users can scan a barcode into the "barcode" field when creating or editing a product.
- [ ] A barcode image is correctly displayed in the product form as soon as a value is entered.
- [ ] Both 1D and QR codes are correctly identified and generated.

## 5. Out of Scope
- Printing barcodes (this may be a separate track).
- Hardware scanner integration (this track focuses on camera-based scanning).
- Batch generation of barcodes for existing products (initial implementation focuses on the product form).
