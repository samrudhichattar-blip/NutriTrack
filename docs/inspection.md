# NutriTrack source inspection

## Uploaded project structure
- `src/main.cpp`, `src/server.h`: C++ application entry point and Windows Winsock HTTP server.
- `src/product.h`: product structure with product ID/name/generic name/brand/category and nutrient values.
- `src/hashtable.h`: custom open-addressed hash table with linear probing.
- `src/basket.h`: singly linked list basket, keyed by product vector index.
- `src/stack.h`: linked stack for basket operations including replacement.
- `src/heap.h`: custom nutrition heap; preference modes rank calories, protein, sugar, fibre and sodium.
- `src/nutrition.h`: calculates basket totals from per-100g nutrition and gram quantity.
- `src/healthscore.h`: rule-based score using calorie, protein, sugar and sodium goals.
- `src/auth.h`: CSV user/goal storage and in-memory sessions. Its own comments state its password hash is not cryptographically secure.
- `web/`: HTML/CSS/JavaScript website, manifest and service worker.
- `data/`: CSV product/user/goal data and reports.

## Verified dataset facts
- `products_clean.csv` contains 163 data rows.
- Its columns include product ID, product name, generic name, brand, category, barcode, serving size, nutrition per 100g, source, source URL and last modified.
- Sampled source field is `Open Food Facts`.
- Existing source data does not have dedicated packaging or preparation columns. The migration must not infer those classifications from product names alone.
- Existing C++ nutrition calculation treats basket quantities as grams and nutrition values as per 100g.
- Existing code displays sodium in grams in one console summary; the unit convention should be checked and normalized before production calculations.

## Migration decisions
1. Preserve `legacy/` untouched as the reference implementation.
2. Use Node.js/Express/TypeScript for the new API, React/Vite/TypeScript for web and Expo/React Native/TypeScript for Android.
3. Use PostgreSQL as the shared relational store.
4. Store food identity separately from variant classification: packaging and preparation are independent dimensions.
5. Existing rows become imported baseline variants with unknown packaging and unspecified preparation until verified.
6. Store nutrition provenance and verification status with each fact.
7. Basket rows reference `variant_id`, not only the parent product.
8. User identity must come from verified authentication, never from a client-supplied user ID.
9. DSA implementations are custom TypeScript classes; PostgreSQL remains the persistence layer.

## Import normalization note
The legacy `sodium_100g` values are represented in the source CSV in grams per 100 g (for example, a value such as 0.81). The migration importer converts that field to milligrams (`0.81 g` → `810 mg`) for the new schema's `sodium_mg` column. This should be confirmed against the original source record before production use.
