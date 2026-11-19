# NutriTrack Website (React + Vite + TypeScript)

## Run locally

1. Open a terminal in this `website` folder.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` (optional; default API is `http://localhost:4000`).
4. Start the backend separately from `backend/` with `npm run dev`.
5. Start the website: `npm run dev`
6. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Current implemented website slice

- Responsive NutriTrack shell and navigation.
- Overview dashboard using live product count from the API.
- Product catalogue search and category filtering.
- Product variant detail modal with nutrition per 100 g and verification status.
- Session-only basket with editable gram quantities and calculated available nutrition totals.
- Empty, loading and API-offline states.

## Important current limitations

- Basket is currently held in browser memory and is not yet persisted per user.
- Authentication and profile/goal APIs are not implemented yet.
- The UI never treats missing nutrient values as zero in product details; basket totals only sum values that are present, so totals are estimates when source fields are missing.
- Nutrition verification status is displayed as returned by the API; imported USDA data remains unverified until reviewed.
