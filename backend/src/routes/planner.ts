import { Router } from 'express';
import { pool } from '../db/pool';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const plannerRouter = Router();
plannerRouter.use(requireAuth);

const activityFactors: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, very_active: 1.725
};
const goalAdjustments: Record<string, number> = {
  lose: -250, gain: 200, muscle: 150, maintain: 0
};
const proteinFactors: Record<string, number> = {
  lose: 1.2, gain: 1.3, muscle: 1.6, maintain: 1.0
};

function ageOnDate(value: string | Date): number {
  const dob = new Date(value);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() ||
      (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  return age;
}

plannerRouter.post('/generate', async (req: AuthRequest, res, next) => {
  const input = z.object({
    heightCm: z.number().min(120).max(230),
    weightKg: z.number().min(30).max(300),
    targetWeightKg: z.number().min(30).max(300).nullable().optional(),
    goalType: z.enum(['lose', 'gain', 'muscle', 'maintain']),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very_active']),
    mealsPerDay: z.number().int().min(2).max(5),
    sexForEstimate: z.enum(['female', 'male', 'unspecified']),
    dietaryPreference: z.enum(['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Vegan']).nullable().optional(),
    allergies: z.array(z.string().trim().min(1).max(60)).max(40).default([])
  }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'Please provide valid planning details.' });

  try {
    const profileResult = await pool.query(
      `SELECT date_of_birth FROM user_profiles WHERE user_id = $1`,
      [req.userId]
    );
    const dob = profileResult.rows[0]?.date_of_birth;
    if (!dob) return res.status(400).json({ error: 'Add your date of birth in Settings before creating a personal plan.' });
    const age = ageOnDate(dob);
    if (age < 18) return res.status(403).json({ error: 'Personalised adult nutrition planning is available only to people aged 18 or above.' });

    const p = input.data;
    // Mifflin-St Jeor estimate. "Unspecified" uses the midpoint coefficient.
    const sexCoefficient = p.sexForEstimate === 'male' ? 5 : p.sexForEstimate === 'female' ? -161 : -78;
    const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * age + sexCoefficient;
    const maintenance = Math.round(bmr * activityFactors[p.activityLevel]);
    const calories = Math.round(maintenance + goalAdjustments[p.goalType]);
    const protein = Math.round(p.weightKg * proteinFactors[p.goalType]);

    await pool.query(
      `UPDATE user_profiles SET height_cm=$2, weight_kg=$3, target_weight_kg=$4,
         goal_type=$5, activity_level=$6, meals_per_day=$7, sex_for_estimate=$8,
         dietary_preferences=CASE WHEN $9::text IS NULL THEN dietary_preferences ELSE jsonb_build_array($9::text) END,
         allergies=$10::jsonb
       WHERE user_id=$1`,
      [req.userId, p.heightCm, p.weightKg, p.targetWeightKg ?? null, p.goalType,
       p.activityLevel, p.mealsPerDay, p.sexForEstimate, p.dietaryPreference ?? null,
       JSON.stringify(p.allergies)]
    );
    await pool.query(
      `INSERT INTO nutrition_goals(user_id,target_calories_kcal,target_protein_g,max_sugar_g,max_sodium_mg)
       VALUES($1,$2,$3,NULL,NULL)
       ON CONFLICT(user_id) DO UPDATE SET target_calories_kcal=EXCLUDED.target_calories_kcal,
         target_protein_g=EXCLUDED.target_protein_g, updated_at=NOW()`,
      [req.userId, calories, protein]
    );

    return res.json({
      plan: { age, bmr: Math.round(bmr), maintenanceCalories: maintenance, targetCalories: calories,
        targetProteinG: protein, goalType: p.goalType, activityLevel: p.activityLevel,
        mealsPerDay: p.mealsPerDay },
      warnings: calories < 1200
        ? ['The calculated energy estimate is unusually low. NutriTrack will not present it as a safe target; consult a registered dietitian or clinician before following a calorie-restricted plan.']
        : [],
      saved: true
    });
  } catch (error) { return next(error); }
});
