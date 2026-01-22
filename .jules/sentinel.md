## 2026-01-16 - Data Sanitization Helper
**Vulnerability:** UI components were displaying sensitive form data (passwords, OTPs) in cleartext via `showSubmittedData`.
**Learning:** Generic helpers that display data for debugging or confirmation must be aware of sensitive fields to prevent accidental exposure.
**Prevention:** Implemented a JSON replacer function in `showSubmittedData` to redact keys matching sensitive patterns while preserving data structures and preventing regression.

## 2026-01-24 - Insecure Cookie Storage
**Vulnerability:** Cookies were being set without `SameSite` or `Secure` attributes, exposing them to CSRF and network interception.
**Learning:** Custom cookie utilities often miss secure defaults that libraries like `js-cookie` might encourage or document more clearly.
**Prevention:** Enforce `SameSite=Lax` and conditional `Secure` attributes in all cookie setting logic.
