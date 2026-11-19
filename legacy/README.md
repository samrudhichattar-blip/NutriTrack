# NutriTrack — Smart Grocery & Nutrition Assistant

NutriTrack combines a C++ grocery/nutrition backend with a responsive web interface. This redesign keeps the existing C++ API, product dataset, authentication, basket operations, undo stack, recommendation heap, and explainable health-score calculation, while refreshing the frontend and adding a guided goal-first meal-planning flow.

## What's new

- A consistent forest-green, cream, and mint visual system across every page.
- Original inline leaf + checkmark NutriTrack mark used throughout the interface.
- Redesigned login and signup screens with responsive split-screen layouts and clearer validation.
- Guided onboarding: choose a goal, enter profile basics, estimate daily calories and protein, and choose meal frequency and dietary preferences.
- Flow is now **Login / Signup → Goal Setting → Meal Planner → Basket & Health Score**.
- Meal planner supports manual product search/filtering and an automatic shortlist ranked using saved goal, dietary preference, and available dataset nutrition fields.
- Basket page retains quantity adjustment, removal, undo, nutrition totals, health-score breakdown, and the existing healthier-alternative/what-if flow.
- Profile estimates and preferences are stored in browser local storage; the four nutrition targets are saved through the existing authenticated `/api/goal` endpoint.
- Calorie/protein figures are general planning estimates, not medical prescriptions. Nutrition values depend on the source dataset and selected basket quantities.

## Run on Windows

The server uses Windows Winsock and the bundled `src/NutriTrack.exe` is a Windows executable.

1. Extract the complete `NutriTrack` folder.
2. Open PowerShell or Command Prompt.
3. Change into the source directory:

   ```powershell
   cd NutriTrack\src
   ```

4. Start the app:

   ```powershell
   .\NutriTrack.exe
   ```

5. Keep the terminal open and open **http://localhost:8080** in your browser (if your existing build reports a different port, use that port).
6. Create an account, set your goals, then use the meal planner and basket pages.

Run from `src` so the existing relative paths to `../data/products_clean.csv` and `../web/` resolve correctly. The web server runs in the background while the C++ terminal menu remains active.

## Rebuild the C++ backend (optional)

If you have a MinGW-w64 compiler configured for Windows:

```powershell
cd NutriTrack\src
g++ -std=c++11 main.cpp -o NutriTrack.exe -lws2_32
```

This redesign changes the web files only; the existing backend routes and binary do not need rebuilding for the UI changes.

## Main pages

- `/login.html` — sign in
- `/signup.html` — create account
- `/goal.html` — guided nutrition setup
- `/dashboard.html` — search foods and receive suggestions
- `/cart.html` — basket, nutrition totals, score, and swaps

## Nutrition estimate notes

The calorie estimate uses a standard resting-energy equation adjusted by a selected activity factor, then applies a modest goal adjustment. It is a rough starting point and should not be treated as a diagnosis or treatment plan. The product recommendations are heuristic rankings over the existing dataset, not clinical advice or claims that any food is universally healthy/unhealthy.

## Dataset

The application reads `data/products_clean.csv`. See `DATA_SCHEMA.md` and the dataset report for data details. Do not invent missing nutrient values.
