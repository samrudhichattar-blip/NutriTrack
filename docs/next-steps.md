# Next implementation steps

1. Install PostgreSQL locally and apply `database/schema.sql`.
2. Build a one-time importer for the 163 existing cleaned CSV rows. Keep imported facts linked to Open Food Facts provenance and mark them unverified unless independently checked.
3. Add authenticated registration/login using a production password hashing library and short-lived access tokens/refresh strategy.
4. Add user-scoped basket persistence and transaction-safe operations.
5. Add variant creation/management. Do not create guessed nutrition facts for loose/raw/roasted/fried variants; add them only when source evidence exists.
6. Connect website and Expo app to the same API base URL.
7. Add tests and only then configure EAS production builds.
