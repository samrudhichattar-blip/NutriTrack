import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth, type AuthRequest } from '../middleware/auth';
export const profileRouter = Router();
profileRouter.use(requireAuth);
const schema = z.object({
 dateOfBirth:z.iso.date().nullable().optional(),
 dietaryPreferences:z.array(z.string().trim().min(1).max(40)).max(20).optional(),
 allergies:z.array(z.string().trim().min(1).max(60)).max(40).optional(),
 heightCm:z.number().min(120).max(230).nullable().optional(),
 weightKg:z.number().min(30).max(300).nullable().optional(),
 targetWeightKg:z.number().min(30).max(300).nullable().optional(),
 activityLevel:z.enum(['sedentary','light','moderate','very_active']).nullable().optional(),
 goalType:z.enum(['lose','gain','muscle','maintain']).nullable().optional(),
 mealsPerDay:z.number().int().min(2).max(5).nullable().optional(),
 sexForEstimate:z.enum(['female','male','unspecified']).nullable().optional()
});
profileRouter.get('/',async(req:AuthRequest,res,next)=>{try{
 const r=await pool.query(`SELECT date_of_birth,dietary_preferences,allergies,height_cm,weight_kg,target_weight_kg,activity_level,goal_type,meals_per_day,sex_for_estimate FROM user_profiles WHERE user_id=$1`,[req.userId]);
 const p=r.rows[0];return res.json({profile:p?{dateOfBirth:p.date_of_birth,dietaryPreferences:p.dietary_preferences??[],allergies:p.allergies??[],heightCm:p.height_cm,weightKg:p.weight_kg,targetWeightKg:p.target_weight_kg,activityLevel:p.activity_level,goalType:p.goal_type,mealsPerDay:p.meals_per_day,sexForEstimate:p.sex_for_estimate}:null});
}catch(e){return next(e);}});
profileRouter.put('/',async(req:AuthRequest,res,next)=>{const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid profile details.'});try{
 const p=parsed.data;
 await pool.query(`INSERT INTO user_profiles(user_id,date_of_birth,dietary_preferences,allergies,height_cm,weight_kg,target_weight_kg,activity_level,goal_type,meals_per_day,sex_for_estimate)
 VALUES($1,$2,COALESCE($3::jsonb,'[]'::jsonb),COALESCE($4::jsonb,'[]'::jsonb),$5,$6,$7,$8,$9,$10,$11)
 ON CONFLICT(user_id) DO UPDATE SET date_of_birth=COALESCE($2,user_profiles.date_of_birth),dietary_preferences=COALESCE($3::jsonb,user_profiles.dietary_preferences),allergies=COALESCE($4::jsonb,user_profiles.allergies),height_cm=COALESCE($5,user_profiles.height_cm),weight_kg=COALESCE($6,user_profiles.weight_kg),target_weight_kg=COALESCE($7,user_profiles.target_weight_kg),activity_level=COALESCE($8,user_profiles.activity_level),goal_type=COALESCE($9,user_profiles.goal_type),meals_per_day=COALESCE($10,user_profiles.meals_per_day),sex_for_estimate=COALESCE($11,user_profiles.sex_for_estimate)`,
 [req.userId,p.dateOfBirth??null,p.dietaryPreferences===undefined?null:JSON.stringify(p.dietaryPreferences),p.allergies===undefined?null:JSON.stringify(p.allergies),p.heightCm??null,p.weightKg??null,p.targetWeightKg??null,p.activityLevel??null,p.goalType??null,p.mealsPerDay??null,p.sexForEstimate??null]);
 return res.json({ok:true,message:'Profile updated successfully.'});
}catch(e){return next(e);}});
