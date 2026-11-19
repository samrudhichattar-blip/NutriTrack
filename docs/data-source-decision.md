# NutriTrack 3.0 — decision on official nutrition data

**There is no single official website/database that provides complete Indian loose-food composition, every preparation method, and every Indian branded packaged SKU together.** The data strategy must combine sources and preserve provenance.

| Need | Source | What it provides | Important limitation |
|---|---|---|---|
| Indian raw ingredients | ICMR-NIN IFCT 2017 | 528 key foods; except eggs, food-component data are raw-form | Written permission is required before storing/reproducing IFCT content electronically in a product |
| Generic food samples / preparation variants | USDA FoodData Central Foundation Foods | Analytical data for commodity/minimally processed foods | US/international source, not an Indian official reference; classification only when explicit |
| Branded packaged foods | USDA FoodData Central Branded Foods | Brand and label-derived nutrition records | Not a complete India SKU catalogue; submitted label data, not a government nutrient analysis |
| Indian packaged-label rules | FSSAI Labelling and Display Regulations | Regulatory requirements for packaged-food labelling | Regulation, not a searchable nutrient dataset for each SKU |

## Current implementation status

- PostgreSQL schema supports source-specific product variants, separate packaging/preparation/salt fields, raw nutrient JSON and provenance.
- `importFoodDataCentral.ts` is implemented for a focused first import of Foundation and Branded records via official FDC API. It requires a free API key.
- `importIfctCsv.ts` is implemented but intentionally refuses to run unless written IFCT permission is confirmed. Do not bypass this guard.
- No claim is made that the external dataset has already been downloaded or imported. The import is run on the user's machine after credentials and permission checks.

## First seed batch

The USDA importer searches peanuts, rice, chickpeas, lentils, almonds, cashew nuts, oats, potato chips, roasted gram and milk, separately against Foundation and Branded data types. It retains FDC record IDs and source nutrient payloads. All imported facts remain `unverified` pending a source-record review. It does not mark generic Foundation records as loose or infer preparation from a generic product name.

## Useful official links

- ICMR-NIN IFCT 2017 PDF: https://nin.res.in/ebooks/IFCT2017.pdf
- USDA FoodData Central: https://fdc.nal.usda.gov/
- USDA API guide: https://fdc.nal.usda.gov/api-guide/
- USDA API key signup: https://fdc.nal.usda.gov/api-key-signup.html
- FSSAI labelling amendments: https://fssai.gov.in/food-law/regulations/amendments/labelling-display
- FSSAI product standards: https://fssai.gov.in/standards/product-standards
