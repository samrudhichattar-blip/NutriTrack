import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';

export const productsRouter = Router();

const listSchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().max(80).optional().default(''),
  limit: z.coerce.number().int().min(1).max(200).optional().default(200),
  includeReference: z.enum(['true', 'false']).optional().default('false')
});

// Default catalogue prioritises the original curated NutriTrack catalogue.
// USDA search-result records remain available as reference data via includeReference=true.
productsRouter.get('/', async (req, res, next) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid catalogue filters.' });
  }

  try {
    const { q, category, limit, includeReference } = parsed.data;
    const includeAll = includeReference === 'true';

    // Group only well-known food families. Other products remain individual cards.
    // Each returned card keeps a real product UUID so the existing variants endpoint works.
    const familySql = `CASE
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(peanut|groundnut)' THEN 'Peanuts'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(almond|badam)' THEN 'Almonds'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(cashew|kaju)' THEN 'Cashews'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(chana|chickpea|gram)' THEN 'Chana & Chickpeas'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(makhana|fox nut)' THEN 'Makhana'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(oat|oats)' THEN 'Oats'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(^| )(rice|basmati)( |$)' THEN 'Rice'
      ELSE 'product:' || p.id::text
    END`;

    const result = await pool.query(
      `WITH matched AS (
         SELECT p.id, p.name, p.generic_name, p.brand, p.category, p.barcode,
                v.id AS variant_id, v.is_imported_legacy,
                ${familySql} AS food_group
         FROM products p
         JOIN product_variants v ON v.product_id = p.id
         WHERE
           ($1 = '' OR p.name ILIKE '%' || $1 || '%'
             OR COALESCE(p.generic_name, '') ILIKE '%' || $1 || '%'
             OR COALESCE(p.brand, '') ILIKE '%' || $1 || '%')
           AND ($2 = '' OR COALESCE(p.category, '') = $2)
           AND ($3::boolean OR v.is_imported_legacy = TRUE)
       )
       SELECT
         (array_agg(id ORDER BY (barcode LIKE '890%') DESC NULLS LAST, id))[1] AS id,
         CASE WHEN food_group LIKE 'product:%' THEN MIN(name) ELSE food_group END AS name,
         CASE WHEN food_group LIKE 'product:%' THEN MIN(generic_name) ELSE food_group END AS generic_name,
         CASE WHEN COUNT(DISTINCT brand) = 1 THEN MIN(brand) ELSE NULL END AS brand,
         MIN(category) AS category,
         NULL::text AS barcode,
         COUNT(DISTINCT variant_id)::int AS variant_count,
         COUNT(DISTINCT id)::int AS product_count,
         BOOL_OR(is_imported_legacy) AS has_legacy_record,
         food_group
       FROM matched
       GROUP BY food_group
       ORDER BY
         CASE WHEN BOOL_OR(is_imported_legacy) THEN 0 ELSE 1 END,
         name ASC
       LIMIT $4`,
      [q, category, includeAll, limit]
    );

    return res.json({
      items: result.rows,
      count: result.rows.length,
      catalogue: includeAll ? 'all_sources' : 'curated_legacy'
    });
  } catch (error) {
    return next(error);
  }
});

productsRouter.get('/:id/variants', async (req, res, next) => {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

  try {
    const familySql = `CASE
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(peanut|groundnut)' THEN 'Peanuts'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(almond|badam)' THEN 'Almonds'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(cashew|kaju)' THEN 'Cashews'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(chana|chickpea|gram)' THEN 'Chana & Chickpeas'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(makhana|fox nut)' THEN 'Makhana'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(oat|oats)' THEN 'Oats'
      WHEN lower(concat_ws(' ', p.name, p.generic_name)) ~ '(^| )(rice|basmati)( |$)' THEN 'Rice'
      ELSE 'product:' || p.id::text
    END`;

    const result = await pool.query(
      `WITH selected_group AS (
         SELECT ${familySql} AS food_group FROM products p WHERE p.id = $1
       )
       SELECT
         v.id AS variant_id,
         v.variant_name,
         v.packaging_type,
         v.preparation_method,
         v.salt_status,
         v.brand,
         v.serving_size_text,
         v.external_source,
         p.name AS product_name,
         p.barcode,
         nf.basis_quantity,
         nf.basis_unit,
         nf.calories_kcal,
         nf.protein_g,
         nf.carbohydrates_g,
         nf.sugar_g,
         nf.fat_g,
         nf.fibre_g,
         nf.sodium_mg,
         nf.verification_status,
         ns.source_name,
         ns.source_url
       FROM products p
       JOIN product_variants v ON v.product_id = p.id
       LEFT JOIN LATERAL (
         SELECT *
         FROM nutrition_facts
         WHERE variant_id = v.id
         ORDER BY (verification_status = 'verified') DESC, created_at DESC
         LIMIT 1
       ) nf ON TRUE
       LEFT JOIN nutrition_sources ns ON ns.id = nf.source_id
       WHERE ${familySql} = (SELECT food_group FROM selected_group)
         AND v.is_imported_legacy = TRUE
       ORDER BY p.name, v.variant_name`,
      [id.data]
    );

    return res.json({ items: result.rows });
  } catch (error) {
    return next(error);
  }
});
