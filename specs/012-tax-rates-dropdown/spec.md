# Feature Specification: Tax Rates Dropdown and Form Cleanup

**Feature Branch**: `012-tax-rates-dropdown`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "alter tax_rates form @[src/features/tax-rates] and remove country_code, state_province and use country_code and creat dropdown for it remove unused field and use the new one"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select Country from List (Priority: P1)

Admins often make mistakes when typing 2-letter country codes. Replacing the text input with a formatted dropdown list of countries will improve data quality and user experience.

**Why this priority**: Correct country codes are essential for tax calculations. This is the core functionality requested.

**Independent Test**: Can be fully tested by opening the Tax Rate dialog, opening the country dropdown, and selecting a valid country.

**Acceptance Scenarios**:

1. **Given** I am on the Tax Rates page, **When** I click "Create Tax Rate", **Then** I should see a dropdown for "Country Code" instead of a text field.
2. **Given** the country dropdown is open, **When** I select "United States", **Then** the value "US" should be recorded for the tax rate.

---

### User Story 2 - Simplified National Tax Rates (Priority: P2)

The `state_province` field is currently redundant for the user's business model (which handles taxes at a national level). Removing it simplifies the interface.

**Why this priority**: Cleaner UI and less work for the admin.

**Independent Test**: Can be fully tested by verifying the absence of the "State/Province" field in the dialog.

**Acceptance Scenarios**:

1. **Given** the Tax Rate dialog is open, **When** I view the form fields, **Then** I should NOT see an input for "State/Province".

---

### Edge Cases

- **Handling existing data**: When editing an existing tax rate that had a `state_province`, the field will be ignored/removed upon save.
- **Empty selection**: If a country is not selected, the form validation should prevent submission.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the `country_code` text input with a searchable Select component.
- **FR-002**: System MUST remove the `state_province` field from both the creation and edit forms in the Tax Rate management module.
- **FR-003**: System MUST provide a standardized list of countries with their ISO codes.
- **FR-004**: System MUST successfully save the selected country code to the underlying data store.

### Key Entities

- **Tax Rate**: Represents a specific tax percentage for a geographic region (Country).
  - Attributes: Tax Type, Rate, Country Code (ISO 3166-1 alpha-2), Description, Effective Dates, Status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created tax rates use valid ISO country codes from the predefined list.
- **SC-002**: Admin users can select a country in the dropdown in under 5 seconds.
- **SC-003**: Zero visual defects related to field removal on the tax rate dialog.

## Assumptions

- A comprehensive list of countries is readily available in the frontend codebase or from a backend service.
- The backend `tax_rates` table supports nullable or empty `state_province` values (as it's being removed from the form but might still exist in DB).
- Performance impact of loading a country list is negligible for the dialog.
