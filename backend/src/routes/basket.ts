import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, type AuthRequest } from '../middleware/auth';

export const basketRouter = Router();
basketRouter.use(requireAuth);

const uuidSchema = z.string().uuid();
const quantitySchema = z.object({
  quantityG: z.number().positive().max(100000)
});

basketRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         bi.id,
         bi.variant_id,
         bi.quantity_g,
         p.name AS name,
         v.variant_name,
         v.brand,
         nf.calories_kcal,
         nf.protein_g,
         nf.carbohydrates_g,
         nf.sugar_g,
         nf.fat_g,
         nf.saturated_fat_g,
         nf.fibre_g,
         nf.sodium_mg,
         nf.verification_status
       FROM baskets b
       JOIN basket_items bi ON bi.basket_id = b.id
       JOIN product_variants v ON v.id = bi.variant_id
       JOIN products p ON p.id = v.product_id
       LEFT JOIN LATERAL (
         SELECT *
         FROM nutrition_facts
         WHERE variant_id = v.id
         ORDER BY (verification_status = 'verified') DESC, created_at DESC
         LIMIT 1
       ) nf ON TRUE
       WHERE b.user_id = $1
       ORDER BY bi.added_at DESC`,
      [req.userId]
    );

    return res.json({ items: result.rows, count: result.rows.length });
  } catch (error) {
    return next(error);
  }
});



// Transparent, heuristic food-balance score. It uses only nutrients actually
// present in the source record; it is not a medical or regulatory rating.
function foodScore(row: Record<string, unknown>): number | null {
  const parts: number[] = [];
  const n = (key: string) => row[key] == null ? null : Number(row[key]);
  const protein = n('protein_g');
  const fibre = n('fibre_g');
  const sugar = n('sugar_g');
  const sodium = n('sodium_mg');
  const satFat = n('saturated_fat_g');
  if (protein !== null && Number.isFinite(protein)) parts.push(Math.min(100, protein / 20 * 100));
  if (fibre !== null && Number.isFinite(fibre)) parts.push(Math.min(100, fibre / 10 * 100));
  if (sugar !== null && Number.isFinite(sugar)) parts.push(Math.max(0, 100 - sugar / 20 * 100));
  if (sodium !== null && Number.isFinite(sodium)) parts.push(Math.max(0, 100 - sodium / 600 * 100));
  if (satFat !== null && Number.isFinite(satFat)) parts.push(Math.max(0, 100 - satFat / 5 * 100));
  if (!parts.length) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

basketRouter.get('/items/:id/swaps', async (req: AuthRequest, res, next) => {
  const id = uuidSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Invalid basket item ID.' });
  try {
    const current = await pool.query(
      `SELECT bi.id, bi.variant_id, bi.quantity_g, p.name,
              nf.calories_kcal, nf.protein_g, nf.carbohydrates_g, nf.sugar_g,
              nf.fat_g, nf.saturated_fat_g, nf.fibre_g, nf.sodium_mg
       FROM basket_items bi
       JOIN baskets b ON b.id = bi.basket_id
       JOIN product_variants v ON v.id = bi.variant_id
       JOIN products p ON p.id = v.product_id
       LEFT JOIN LATERAL (SELECT * FROM nutrition_facts WHERE variant_id=v.id
         ORDER BY (verification_status='verified') DESC, created_at DESC LIMIT 1) nf ON TRUE
       WHERE bi.id=$1 AND b.user_id=$2`, [id.data, req.userId]);
    if (!current.rowCount) return res.status(404).json({ error: 'Basket item not found.' });
    const item = current.rows[0];
    const currentScore = foodScore(item);
    const candidates = await pool.query(
      `SELECT v.id AS variant_id, v.variant_name, v.preparation_method, v.salt_status,
              v.brand, p.name AS product_name, p.category,
              nf.calories_kcal, nf.protein_g, nf.carbohydrates_g, nf.sugar_g,
              nf.fat_g, nf.saturated_fat_g, nf.fibre_g, nf.sodium_mg,
              nf.verification_status, ns.source_name
       FROM product_variants v JOIN products p ON p.id=v.product_id
       JOIN LATERAL (SELECT * FROM nutrition_facts WHERE variant_id=v.id
         ORDER BY (verification_status='verified') DESC, created_at DESC LIMIT 1) nf ON TRUE
       LEFT JOIN nutrition_sources ns ON ns.id=nf.source_id
       WHERE v.is_imported_legacy=TRUE AND v.id<>$1
         AND nf.calories_kcal IS NOT NULL
       ORDER BY (nf.verification_status='verified') DESC, p.name, v.variant_name
       LIMIT 250`, [item.variant_id]);
    const swaps = candidates.rows.map((row: Record<string, unknown>) => ({
      ...row, score: foodScore(row)
    })).filter((row: any) => row.score !== null && (currentScore === null || row.score >= currentScore + 5))
      .sort((a: any, b: any) => b.score - a.score).slice(0, 5);
    return res.json({ current: { ...item, score: currentScore }, swaps,
      score_note: 'Heuristic comparison using available protein, fibre, sugar, sodium and saturated-fat data. Not medical advice.' });
  } catch (error) { return next(error); }
});

basketRouter.patch('/items/:id/replace', async (req: AuthRequest, res, next) => {
  const id = uuidSchema.safeParse(req.params.id);
  const body = z.object({ variantId: uuidSchema }).safeParse(req.body);
  if (!id.success || !body.success) return res.status(400).json({ error: 'Choose a valid replacement.' });
  try {
    const result = await pool.query(
      `UPDATE basket_items bi SET variant_id=$1
       FROM baskets b
       WHERE bi.id=$2 AND bi.basket_id=b.id AND b.user_id=$3
       RETURNING bi.id, bi.variant_id, bi.quantity_g`,
      [body.data.variantId, id.data, req.userId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Basket item not found.' });
    return res.json({ ok: true, item: result.rows[0] });
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ error: 'That food is already in your basket. Change its quantity instead.' });
    return next(error);
  }
});

basketRouter.post('/items', async (req: AuthRequest, res, next) => {
  const schema = z.object({
    variantId: uuidSchema,
    quantityG: z.number().positive().max(100000)
  });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Choose a valid food and quantity.' });
  }

  try {
    const basket = await pool.query(
      'SELECT id FROM baskets WHERE user_id = $1',
      [req.userId]
    );

    if (basket.rowCount === 0) {
      return res.status(404).json({ error: 'Basket not found.' });
    }

    const result = await pool.query(
      `INSERT INTO basket_items(basket_id, variant_id, quantity_g)
       VALUES($1, $2, $3)
       ON CONFLICT(basket_id, variant_id)
       DO UPDATE SET quantity_g = basket_items.quantity_g + EXCLUDED.quantity_g
       RETURNING id, variant_id, quantity_g`,
      [basket.rows[0].id, parsed.data.variantId, parsed.data.quantityG]
    );

    return res.status(201).json({ ok: true, item: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

basketRouter.patch('/items/:id', async (req: AuthRequest, res, next) => {
  const id = uuidSchema.safeParse(req.params.id);
  const parsed = quantitySchema.safeParse(req.body);

  if (!id.success || !parsed.success) {
    return res.status(400).json({ error: 'Provide a valid basket item ID and quantity.' });
  }

  try {
    const result = await pool.query(
      `UPDATE basket_items bi
       SET quantity_g = $1
       FROM baskets b
       WHERE bi.id = $2
         AND bi.basket_id = b.id
         AND b.user_id = $3
       RETURNING bi.id, bi.variant_id, bi.quantity_g`,
      [parsed.data.quantityG, id.data, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Basket item not found.' });
    }

    return res.json({ ok: true, item: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

basketRouter.delete('/items/:id', async (req: AuthRequest, res, next) => {
  const id = uuidSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'Invalid basket item ID.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM basket_items bi
       USING baskets b
       WHERE bi.id = $1
         AND bi.basket_id = b.id
         AND b.user_id = $2
       RETURNING bi.id`,
      [id.data, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Basket item not found.' });
    }

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});
