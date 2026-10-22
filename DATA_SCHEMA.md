# NutriTrack Product Schema

| Field | Meaning |
|---|---|
| product_id | Open Food Facts product code |
| product_name | Display name |
| generic_name | Generic product description |
| brand | Brand name |
| category | NutriTrack application category |
| barcode | Product barcode/code |
| serving_size | Source serving-size text |
| quantity | Pack quantity where available |
| quantity_unit | Pack quantity unit |
| calories_100g | kcal per 100g/100ml normalized value |
| protein_100g | g per 100g/100ml |
| carbohydrates_100g | g per 100g/100ml |
| sugar_100g | g per 100g/100ml |
| fat_100g | g per 100g/100ml |
| saturated_fat_100g | g per 100g/100ml |
| fiber_100g | g per 100g/100ml |
| sodium_100g | normalized sodium value |
| source | Source database |
| source_url | Product-level source |
| last_modified | Source modification timestamp |

## Minimum quality rule

A product must have:
- product code
- product name
- all core nutrition values
- numerically plausible values

Missing core values are not replaced by averages.
