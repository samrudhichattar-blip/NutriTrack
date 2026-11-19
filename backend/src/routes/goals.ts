import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, type AuthRequest } from '../middleware/auth';

export const goalsRouter = Router();
goalsRouter.use(requireAuth);

goalsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const result = await pool.query(
      `SELECT target_calories_kcal, target_protein_g, max_sugar_g, max_sodium_mg
       FROM nutrition_goals WHERE user_id = $1`,
      [req.userId]
    );
    return res.json({ goals: result.rows[0] || null });
  } catch (error) {
    return next(error);
  }
});

goalsRouter.put('/', async (req: AuthRequest, res, next) => {
  const schema = z.object({
    calories: z.number().positive().max(10000).nullable(),
    protein: z.number().nonnegative().max(1000).nullable(),
    sugar: z.number().nonnegative().max(1000).nullable(),
    sodium: z.number().nonnegative().max(100000).nullable()
  });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter valid nutrition goal values.' });
  }

  try {
    const goals = parsed.data;
    await pool.query(
      `INSERT INTO nutrition_goals(
         user_id, target_calories_kcal, target_protein_g, max_sugar_g, max_sodium_mg
       ) VALUES($1, $2, $3, $4, $5)
       ON CONFLICT(user_id) DO UPDATE SET
         target_calories_kcal = EXCLUDED.target_calories_kcal,
         target_protein_g = EXCLUDED.target_protein_g,
         max_sugar_g = EXCLUDED.max_sugar_g,
         max_sodium_mg = EXCLUDED.max_sodium_mg,
         updated_at = NOW()`,
      [req.userId, goals.calories, goals.protein, goals.sugar, goals.sodium]
    );

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});
