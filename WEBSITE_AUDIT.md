# NutriTrack website and multi-user audit

Audit target: `NutriTrack_Nutrition_Engine_Milestone.zip` (latest consolidated website/backend milestone available in this conversation).

## What the source currently implements

- Signup and username/password login; passwords are hashed with bcrypt.
- Signed JWT sessions; protected profile, goals, planner and basket routes derive the account ID from the verified token (`sub`).
- Shared public food catalogue and variant lookup.
- Profile, nutrition goals and basket are persisted in PostgreSQL.
- Basket reads, item updates, deletes, replacement and swap lookup constrain the basket item through the authenticated user's basket.
- Planner reads the authenticated user's date of birth and writes profile/goals using the authenticated user ID.
- Same account on another device will load the same server-side data after signing in, provided both devices point to the same deployed API/database.

## Multi-user isolation review

The route-level SQL reviewed in this milestone scopes personal records by `req.userId` for:

- `GET/PUT /api/profile`
- `GET/PUT /api/goals`
- `POST /api/planner/generate`
- `GET /api/basket`
- `POST /api/basket/items`
- `PATCH/DELETE /api/basket/items/:id`
- `GET /api/basket/items/:id/swaps`
- `PATCH /api/basket/items/:id/replace`

The browser does not send a user ID for these operations; it sends a bearer token. The catalogue is intentionally shared.

**Conclusion:** the source has the core architecture needed for separate accounts on separate devices. This is a source-code review, not proof of live multi-user behavior. A live PostgreSQL/API integration run is still required before calling isolation verified.

## Fix applied in this audit

The website previously added `0` when a nutrient value was missing, even though the interface claimed missing values were not treated as zero. Basket and dashboard totals now sum only known values. An asterisk marks a partial total where one or more basket items lack that nutrient; an em dash means no values are available.

## Remaining items that are not verified / not complete

1. No automated backend integration test suite is present in this milestone.
2. A local TypeScript build could not be completed in this environment because dependency installation did not finish; `npm ci` timed out and left an incomplete `node_modules` tree. Do not treat this environment's failed typecheck as a source compile failure.
3. Browser/device testing against the user's local PostgreSQL database has not been performed.
4. Basket action history and a website Undo control are not exposed by the current React website/API milestone, even though the database has a `basket_action_history` table and the original legacy C++ app had undo behavior. Do not claim Undo is currently working in this website.
5. The nutrition planner returns catalogue food building blocks, not recipes or prescribed portions. Allergy matching is not complete; the UI correctly warns that ingredient labels must be checked.
6. Deployment is not included. Cross-device access requires a publicly reachable HTTPS backend and a shared hosted PostgreSQL database; `localhost` only works on the same computer.

## Run checks on Windows

From the extracted project folder, use two terminals:

Backend:

```powershell
cd "$HOME\Downloads\NutriTrack\backend"
npm ci
npm run typecheck
npm run build
npm run dev
```

Website:

```powershell
cd "$HOME\Downloads\NutriTrack\website"
npm ci
npm run build
npm run dev
```

The backend must have a valid local `backend/.env` and the PostgreSQL schema/migrations applied. Keep `.env` private and never include it in a ZIP or Git commit.

## Multi-user acceptance test

After both servers are running, create two separate accounts (A and B) in separate browser profiles, e.g. normal Chrome and Incognito. Add different foods to each basket, refresh, and sign out/in again. Account A must only see A's basket/profile/goals; B must only see B's. Sign into A on a second device using the same deployed API URL: A's saved data should appear there. A device using `localhost` cannot be reached by another device; use the computer's LAN IP for same-Wi-Fi testing or deploy the API for internet access.
