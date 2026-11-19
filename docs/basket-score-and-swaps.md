# NutriTrack basket score and smart swaps

## What the score means
The current Basket Score is a transparent, heuristic comparison aid (0-100), not a medical rating, regulatory label, or personalised health assessment. It averages whichever of these per-100g nutrients are available for an item:

- Protein: higher values contribute positively (reference cap at 20 g/100 g).
- Fibre: higher values contribute positively (reference cap at 10 g/100 g).
- Sugar: lower values contribute positively (reference ceiling at 20 g/100 g).
- Sodium: lower values contribute positively (reference ceiling at 600 mg/100 g).
- Saturated fat: lower values contribute positively (reference ceiling at 5 g/100 g).

The basket score is the quantity-weighted average of item scores. Missing nutrients are excluded rather than silently treated as zero. If no item has enough available data, the UI displays “Not enough data”. The score is intended for relative comparison only; the thresholds are product heuristics and should be reviewed by a qualified nutrition professional before being presented as a validated health score.

## Smart swaps
The API finds up to five imported catalogue variants with sufficient nutrition data and a higher heuristic food score than the current item. The UI previews the estimated basket score before and after the swap. Replacing an item preserves its basket quantity. It does not overwrite the source food record or invent missing nutrient values.

Suggestions are not allergy-safe guarantees. Users must review ingredient and allergen information on the actual package.
