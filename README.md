# NutriTrack

NutriTrack is a grocery and nutrition companion with a React website, an Expo React Native app, a Node.js/Express TypeScript API, PostgreSQL storage, and retained legacy C++ DSA coursework code.

## Project layout

```text
NutriTrack/
  backend/       Express + TypeScript API, auth, products, basket, goals
  website/       React + Vite website
  mobile/        Expo + React Native app
  database/      PostgreSQL schema and additive migrations
  legacy/        Original C++ project and curated product CSV files
  docs/          Data audit and setup notes
  setup.ps1      Windows dependency + legacy catalogue setup
```

## Existing database

This project expects a PostgreSQL database named `nutritrack`. The authentication/profile migration is additive and safe to rerun:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nutritrack -f ".\database\migration_auth_profile.sql"
```

The base schema is in `database/schema.sql`. Do not drop or recreate your existing database.

## Configure secrets

Keep your existing `backend/.env` file. If this is a fresh setup, copy `backend/.env.example` to `backend/.env` and set:

- `DATABASE_URL`
- `JWT_SECRET` (random secret of at least 32 characters)
- `USDA_FDC_API_KEY` if using USDA imports
- Keep `IFCT_DATA_PERMISSION_CONFIRMED=false` until written permission is obtained.

Never share `.env`, include it in ZIP files, commit it, or paste API keys/passwords into chat. If a ZIP containing `.env` was shared, rotate the database password, JWT secret and any API keys.

## One-time Windows setup

From PowerShell at the project root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```

The script installs backend, website and mobile dependencies, typechecks the backend, and imports the original 163-row curated CSV using an upsert importer. It does not delete USDA records or overwrite your `.env`.

## Run the backend

Terminal 1:

```powershell
cd "$HOME\Downloads\NutriTrack\backend"
npm run dev
```

Health check: http://localhost:4000/api/health

## Run the website

Terminal 2:

```powershell
cd "$HOME\Downloads\NutriTrack\website"
npm run dev
```

Open the Vite URL shown in the terminal (normally http://localhost:5173).

## Run the Android app

Terminal 3:

```powershell
cd "$HOME\Downloads\NutriTrack\mobile"
npx expo start
```

For an Android emulator, `EXPO_PUBLIC_API_URL` defaults to `http://10.0.2.2:4000/api`. For a physical phone, create `mobile/.env` from `.env.example` and set the computer's LAN IPv4 address, e.g. `http://192.168.1.5:4000/api`. The phone and computer must be on the same network and Windows Firewall must allow the backend port.

## APIs

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `PUT /api/profile` (Bearer token)
- `GET /api/goals` and `PUT /api/goals` (Bearer token)
- `GET /api/basket`, `POST /api/basket/items`, `PATCH /api/basket/items/:id`, `DELETE /api/basket/items/:id` (Bearer token)
- `GET /api/products?q=dal&limit=200` (curated catalogue by default)
- `GET /api/products?includeReference=true` (includes supplementary USDA reference records)
- `GET /api/products/:id/variants`

## Product-data facts

The original cleaned catalogue contains 163 rows across 10 categories. 108 product barcodes begin with `890`. It includes familiar products such as Balaji Wafers, Saffola/Quaker oats, Moong Dal, Chana Dal, Roasted Chana, Toor Dal, Nutrela Soya Chunks and Dawat Basmati Rice. See `docs/indian_catalogue_audit.md` for the audit and caveats.

The catalogue groups selected matching Indian food families (including peanuts, almonds, cashews, chana/chickpeas, makhana, oats and rice) into a single search card while preserving each underlying source-backed product variant. This grouping is a navigation convenience, not a claim that all variants are nutritionally identical. The catalogue's nutrition source is Open Food Facts, not a government certification. Records are imported as `unverified`. USDA FoodData Central records are supplementary. IFCT import remains disabled pending permission. The app never invents missing nutrition values.

## Security and limitations

- Passwords are hashed with bcryptjs and API access uses signed JWTs.
- User profile, goals and basket routes scope records to the authenticated user ID from the JWT.
- This is a development build. Before public deployment, review rate limiting, email verification, secure token storage, CORS allow-listing, password reset, audit logging and privacy/legal requirements.
- Website uses browser localStorage for the development JWT flow. Mobile uses AsyncStorage; consider platform secure storage before production.
- Allergen declarations are stored in profiles, but automatic ingredient/allergen matching is not yet implemented.
- Age is collected as date of birth for onboarding; the app avoids pre-filling adult targets for minors. This is not a medical assessment.
- Legacy C++ files and DSA concepts are retained in `legacy/`; the active API is TypeScript.

## Dependency security

Backend uses `csv-parse` 7.x and Zod 4.x to address the reported audit advisories. Run `npm audit` after installation and review any newly disclosed advisories. Do not use `npm audit fix --force` blindly.


## November 2026 account and guided-plan update

- Website and Android sign-in now use **username + password**. Email remains collected at signup for account contact/identity, not for routine login.
- Existing users receive a username based on their display name when the migration runs; duplicate display names receive a short suffix. New users choose their own username.
- Date of birth is editable in Settings. If the saved date indicates an age below 18, the account is retained and the user is sent to an editable age-details screen; adult personalised planning remains unavailable until the account meets the 18+ requirement.
- The former manual Nutrition Goals page is replaced by **My plan**: goal choice, height, current/optional target weight, activity, meal frequency, and dietary preference. NutriTrack estimates calories and protein; users do not enter calorie, protein, sugar or sodium targets manually.
- Goal and activity estimates are general planning estimates only. They are not medical advice or suitable for clinical nutrition needs. Skipping My plan is allowed; the dashboard remains available without personalised targets.
- Visual refresh takes cues from the original NutriTrack web screens: forest-green/cream palette, split-screen auth, larger Manrope headings, clearer step cards and selectable goal tiles.

## Apply the database migration

For an existing PostgreSQL database, run this once from PowerShell:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nutritrack -f "C:\Users\dell\Downloads\NutriTrack\database\migrations\004_username_and_personal_plan.sql"
```

Do not drop or recreate the database. This migration adds usernames and personal-plan profile columns while retaining existing users, baskets, and nutrition data.


## Website navigation and visual polish
- Sidebar order is now Overview → My plan → Explore foods → My basket → Settings.
- The avocado illustration has been moved above/right of the sign-in headline so it no longer covers the word “choices”.
- Refined typography, spacing, hover states, card shadows and responsive layout while keeping the forest-green/cream identity.
