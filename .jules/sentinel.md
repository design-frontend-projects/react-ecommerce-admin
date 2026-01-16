## 2026-01-16 - Data Sanitization Helper
**Vulnerability:** UI components were displaying sensitive form data (passwords, OTPs) in cleartext via `showSubmittedData`.
**Learning:** Generic helpers that display data for debugging or confirmation must be aware of sensitive fields to prevent accidental exposure.
**Prevention:** Implemented a JSON replacer function in `showSubmittedData` to redact keys matching sensitive patterns while preserving data structures and preventing regression.
