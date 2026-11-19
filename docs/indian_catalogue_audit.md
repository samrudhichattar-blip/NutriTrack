# NutriTrack Indian grocery catalogue audit

## What was inspected

The original `legacy/data/products_clean.csv` included in this project was inspected directly.

- Data rows (excluding header): **163**
- Categories: 10
- Records whose barcode begins with `890`: **108**
- Source field: Open Food Facts
- The cleaning report says 163 final products, 3 invalid nutrition rows removed, and 0 duplicates removed.
- The separate `dataset_report.txt` says 166 final records. This conflicts with the actual CSV row count and `cleaning_report.txt`; for import, the actual `products_clean.csv` file is authoritative and contains 163 rows.

## Category counts in the cleaned CSV

| Category | Rows |
|---|---:|
| Snacks | 21 |
| Cereals & Breakfast | 21 |
| Dairy | 21 |
| Beverages | 19 |
| Fruits | 15 |
| Vegetables | 15 |
| Bread & Bakery | 14 |
| Pulses & Legumes | 13 |
| Nuts & Seeds | 13 |
| Rice, Grains & Flour | 11 |
| **Total** | **163** |

## Examples of familiar Indian grocery products in the file

- Balaji Wafers, Lays, Aloo Bhujia, Parle-G and other snacks
- Saffola Oats, Quaker Oats, Kellogg's Chocos, Yoga Bar and Tata Soulfull products
- Moong Dal, Chana Dal, Roasted Chana, Unpolished Toor Dal and Nutrela Soya Chunks
- Dawat Pulav Basmati Rice
- Salted Peanuts, Haldiram's Salted Peanuts and Organic Peanuts

The `890` barcode prefix is reported as a barcode-prefix observation only; it is not proof that every product was manufactured in India.

## Nutrition and provenance caveats

- The CSV identifies Open Food Facts as its source. It is not an ICMR-NIN or government-certified dataset.
- The cleaned CSV has numeric values in all eight listed nutrition columns for all 163 rows. This does not independently prove the label data is correct or current.
- `generic_name` is blank in 121 rows, `brand` in 9 rows and `serving_size` in 47 rows. Pack `quantity` and `quantity_unit` are blank for all 163 rows.
- Imported nutrition facts remain `unverified` in PostgreSQL. The app must not label them government-verified.
- The importer converts `sodium_100g` from grams to milligrams when storing `sodium_mg`.
- IFCT import remains disabled until written permission is obtained. Do not copy IFCT tables into this project without the required permission.

## Catalogue display decision

The normal consumer catalogue endpoint defaults to the original curated legacy catalogue. This avoids showing hundreds of near-duplicate USDA search hits as separate everyday food cards. USDA records remain stored as supplementary reference data and can be queried through the API with `includeReference=true`.

Food preparation or salt variants must only be offered when a matching source-backed variant and nutrition record exist. Do not manufacture salted/unsalted nutrition values from a plain-peanut record.
