# Official food-data sources and import policy

## Important finding: no single official source covers every requested case

NutriTrack needs both Indian generic food composition (for example raw loose peanuts) and branded packaged-food label records (for example a named salted peanut snack). These are different evidence types. We should not pretend that one government table contains every brand and preparation variant.

## Source 1 — ICMR–National Institute of Nutrition (India)

- Publication: *Indian Food Composition Tables 2017* (IFCT 2017), Longvah et al.
- Official PDF: https://nin.res.in/ebooks/IFCT2017.pdf
- The IFCT 2017 reference set covers 528 key foods. Its preface says that, except for eggs, the food-component data are for foods in raw form.
- **Critical reuse restriction:** the IFCT PDF states that no part may be stored or reproduced in electronic format for creating a product without prior written permission from the National Institute of Nutrition. We must not import IFCT values into NutriTrack production storage unless we obtain that written permission.
- IFCT is a published PDF, not a supported public structured API. The supplied CSV template is therefore a controlled transcription template only; the importer is deliberately blocked unless `IFCT_DATA_PERMISSION_CONFIRMED=true` is set after written permission is obtained.
- IFCT raw-food records do not provide all branded packaged snack label values. Do not label a generic IFCT record as a branded product.

Template: `database/import_templates/ifct2017_foods.csv`
Import command only after permission and reviewed transcription: set `IFCT_DATA_PERMISSION_CONFIRMED=true`, then run `npm run import:ifct`.

## Source 2 — USDA FoodData Central (official US government database)

- Official data portal: https://fdc.nal.usda.gov/
- Official API guide: https://fdc.nal.usda.gov/api-guide/
- API key signup: https://fdc.nal.usda.gov/api-key-signup.html
- Foundation Foods contains analytical data for commodity/minimally processed foods; Branded Foods contains data submitted from commercial food labels. These are useful to add explicitly identified raw/processed and branded records when the description and nutrient record match.
- This is an international supplementary source, not an Indian-government source. A US branded record must not be presented as an Indian market product merely because its name is similar.
- FoodData Central states its data are CC0 1.0 and requests attribution.

The importer searches a focused starter list of food terms, imports Foundation and Branded results separately, retains FDC IDs and raw nutrient records, and keeps imported facts `unverified` until reviewed. Branded records are marked packaged; Foundation records keep packaging unknown. Preparation and salt classification is keyword-based and conservative; unmatched terms remain unspecified/unknown.

Set `USDA_FDC_API_KEY` in `backend/.env`, then run `npm run import:usda`.

## Source 3 — FSSAI (India)

- Labelling and Display Regulations: https://fssai.gov.in/food-law/regulations/amendments/labelling-display
- Product standards: https://fssai.gov.in/standards/product-standards

FSSAI is the regulatory source for applicable packaged-food labelling and product standards. It is not a general nutrient-composition database/API. Use it to define label requirements and compliance context, not to invent nutrition values for individual SKUs.

## Data confidence rules

1. Every nutrient fact retains a source and a 100 g basis where supplied that way.
2. Keep energy in kJ if that is the source unit; kcal conversion is `kJ / 4.184` and both values are retained.
3. Do not convert sodium to salt or salt to sodium without an explicit documented conversion rule.
4. Unknown preparation, packaging, salt status, or nutrients stay unknown/null. No inference from a generic product name.
5. A source import is not automatically a verification. The importers set `verification_status='unverified'` deliberately.
6. A product variant's classification must be supported by its source description, label or reviewed evidence.
7. Never use FSSAI regulatory text as a substitute for measured/declared nutrient values.

## Suggested evidence hierarchy in the application

- Indian generic raw ingredient: exact matching ICMR-NIN IFCT 2017 record.
- Packaged SKU: exact product label / manufacturer data, retaining label date and serving basis; FSSAI regulations govern how relevant declarations are presented.
- Additional international generic or branded record: USDA FDC, clearly labelled with its source and country context.
- No matching evidence: show unavailable/unverified, not a guessed number.
