# Data Model: Tax Rates Dropdown and Form Cleanup

## Entities

### TaxRate (Existing, Updated)
- `tax_rate_id`: Int
- `tax_type`: String (VAT, Sales Tax, etc.)
- `rate`: Decimal/Float (Tax percentage)
- `country_code`: String (ISO 2-letter code)
- `state_province`: (Removed from form, kept as nullable in DB if it still exists)
- `is_active`: Boolean
- `effective_from`: Date
- `effective_to`: Date (Nullable)

### Country (Existing)
- `id`: String/Int
- `name`: String
- `code`: String (ISO 2-letter, e.g. "US", "UK")

## State Transitions
- **Create**: User selects a country from the dropdown. UI saves the 2-letter `code`.
- **Edit**: UI fetches existing 2-letter `code` and matches it in the dropdown list.
