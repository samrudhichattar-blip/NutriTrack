# NutriTrack project review (19 Nov 2026)

## What is already present
- Express + TypeScript API with signup/login/JWT, profile, goals, products and basket routes.
- PostgreSQL schema for users, profiles, nutrition goals, products, variants, nutrition sources/facts and basket.
- Curated 163-row Open Food Facts CSV importer and supplementary USDA/IFCT importers.
- React + Vite website with auth, onboarding, dashboard, catalogue search, variant dialog, basket, goals and settings.
- Expo React Native app with auth, catalogue search and basket starter flow.
- Legacy DSA TypeScript structures and original coursework assets.

## Changes in this update
- Catalogue search now groups selected known food families into a single card: peanuts, almonds, cashews, chana/chickpeas, makhana, oats and rice.
- Opening one of those family cards returns the underlying curated legacy product variants, preserving each source product, brand, packaging/preparation/salt metadata and nutrition provenance.
- Other products remain separate cards; brands are not merged into a false single branded product.
- Website variant dialog now lets the user choose the quantity in grams before adding the selected real variant to the basket.
- README clarifies that family grouping is for navigation and does not mean variants have identical nutrition.

## Validation
- Backend TypeScript production build passed against the dependencies bundled in the supplied ZIP.
- Website TypeScript project build (`tsc -b`) passed. Vite bundling could not be completed in this Linux review environment because the uploaded `node_modules` lacked the platform-specific Rolldown native optional binding. Reinstall dependencies on Windows with `npm install` in `website` if Vite reports that binding error.
- No live PostgreSQL integration test was possible from the uploaded archive alone. Existing user's live backend API tests from the conversation already verified auth, profile, goals and basket GET.
- The new SQL family-grouping query still needs to be exercised against the user's local PostgreSQL database after copying this update.

## Safe update instructions
1. Extract this ZIP over the existing `NutriTrack` folder.
2. Do NOT delete or replace your existing `backend/.env`; this update intentionally excludes all `.env` files.
3. In backend terminal run `npm run build`, then restart `npm run dev`.
4. In website terminal run `npm install` only if dependencies are missing or Vite reports a missing native binding, then `npm run dev`.
5. Search `peanuts`, `almond`, `cashew`, `chana`, `makhana`, `oats`, and `rice`. Open a family card to see the actual imported records. If a family has only one record, that is all the current source dataset supports.
6. Do not run `DROP DATABASE`, delete existing rows, or rerun unrelated USDA/IFCT importers as part of this update.

## Security
The ZIP supplied for review contained `backend/.env`. This update excludes it. Rotate the database password, JWT secret and USDA key if the supplied archive was shared or stored anywhere untrusted. Keep `.env` local and never upload it.
