# NutriTrack project update — authentication + app flow

This patch adds the first end-to-end account and user workspace foundation to the existing `NutriTrack/` project.

## Files included
- Backend auth APIs: signup, login, current user (`/api/auth`).
- Protected profile APIs: date of birth, dietary preferences and allergies (`/api/profile`).
- Protected nutrition-goal APIs (`/api/goals`).
- Protected per-user basket APIs (`/api/basket`).
- Grouped product catalogue and product-variant endpoint (`/api/products`).
- Website login/signup, onboarding, dashboard, explore, basket, goals and settings screens.
- Additive SQL migration for the profile allergies field.

## Apply the patch
Extract this ZIP into the existing `C:\Users\dell\Downloads\NutriTrack` folder and allow files to merge/replace. Do not extract into a nested `NutriTrack_3_0` directory.

## 1. Apply the additive SQL migration
In PowerShell from the project root:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nutritrack -f ".\database\migration_auth_profile.sql"
```

## 2. Configure backend secret
Open `backend/.env` and add a long random value:

```env
JWT_SECRET=replace_this_with_a_long_random_secret_at_least_32_characters
```

Keep DATABASE_URL, PORT and USDA_FDC_API_KEY already configured. Never share `.env` or commit it.

## 3. Install backend dependencies
Open a terminal:

```powershell
cd "$HOME\Downloads\NutriTrack\backend"
npm install
npm run typecheck
```

## 4. Import the original curated NutriTrack catalogue
This restores the existing Indian grocery dataset as the first consumer-facing catalogue. It is safe to rerun because rows are upserted using the legacy product ID and variant uniqueness constraint:

```powershell
npm run import:legacy
```

This does not delete USDA records. Legacy nutrition is retained as unverified until reviewed.

## 5. Start backend

```powershell
npm run dev
```

Keep this terminal open. Health check: `http://localhost:4000/api/health`.

## 6. Start website in a second terminal

```powershell
cd "$HOME\Downloads\NutriTrack\website"
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Important current scope
- Passwords are hashed with bcryptjs; API sessions use signed JWTs.
- Basket and profile queries are scoped to the authenticated user ID from the JWT.
- Website auth token is stored in localStorage for this development milestone. Before public production release, consider secure cookie/session hardening and a reviewed threat model.
- Profile allergies are stored, but automated allergen-to-ingredient matching is not implemented in this milestone.
- Nutrition values remain labelled unverified in the database. The UI avoids treating missing nutrient values as zero.
- The product catalogue groups variants by parent product. It does not yet perform human-curated merging of synonymous food identities.
