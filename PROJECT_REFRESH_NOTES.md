# NutriTrack Refresh Notes

## Implemented in this update
- Website and mobile login now use username + password. Signup still collects email and asks the user to choose a username.
- Existing usernames are backfilled from display names by migration 004; duplicate display names get a short suffix.
- Date of birth remains editable. Under-18 or missing-DOB accounts are routed to an editable age screen without deleting the account.
- Replaced the manual numeric Nutrition Goals screen with a guided My Plan flow: goal, height, current/optional target weight, activity level, meal frequency, dietary preference and optional allergies.
- Calories and protein are estimated from the profile inputs; the user does not manually enter nutrient targets.
- My Plan can be skipped; dashboard and grocery browsing remain available without a saved personal plan.
- Typography and guided cards are refreshed using the original NutriTrack web project's forest-green/cream direction and split-screen visual language.
- Existing smart basket score and replacement flow from the previous update are retained.

## Before running
1. Back up the PostgreSQL database.
2. Run `database/migrations/004_username_and_personal_plan.sql` once on the existing `nutritrack` database.
3. Start the backend and website as usual.

## Validation limits
- Source-level TypeScript parsing was checked. Full dependency-backed build and live PostgreSQL integration tests were not possible in this packaging environment.
- This update does not verify a person's legal age; it enforces the date-of-birth eligibility rule entered in the account.
- Calorie/protein values are rough adult wellness estimates, not medical recommendations.
