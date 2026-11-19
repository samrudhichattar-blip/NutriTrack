# NutriTrack Nutrition Engine Milestone

## Added
- Authenticated `POST /api/planner/generate` endpoint.
- Server-side 18+ check based on saved date of birth.
- Server-side BMR and maintenance-energy estimate using Mifflin-St Jeor and selected activity multiplier.
- Goal adjustments: gradual illustrative offsets for lose/gain/muscle/maintain; protein estimate based on goal-specific grams per kg.
- Persists profile planning inputs and calorie/protein targets in existing PostgreSQL tables.
- Generates meal-slot food options from the existing curated catalogue only, using available nutrition facts and source/verification metadata.
- Meal slot count follows the user's 2/3/4/5 meal preference.
- Conservative name-based dietary filtering; this is not ingredient verification.
- If allergies are recorded, the response explicitly warns that catalogue ingredient/allergen coverage is incomplete and options cannot be confirmed safe.
- Frontend plan result now displays calorie/protein estimates and food options for each selected meal slot.

## Important limitations
- This is a first working nutrition-planning milestone, not a validated diet prescription or a complete recipe generator.
- Food options are catalogue building blocks; values are per 100 g where available. The app does not invent portion sizes or combine products into recipes.
- The catalogue does not yet provide complete ingredient/allergen data. Do not present suggestions as allergy-safe.
- The formula is a general adult estimate. It is not suitable for pregnancy, eating-disorder treatment, kidney disease, or other clinical nutrition needs.
- No clinical validation has been performed. Unusually low calculated energy estimates are flagged for professional review rather than presented as safe targets.
- Existing database schema is reused; no new migration is required beyond migration 004 from the prior refresh.

## Run
Backend and website commands remain unchanged:
`npm run dev` in `backend`, and `npm run dev` in `website`.
