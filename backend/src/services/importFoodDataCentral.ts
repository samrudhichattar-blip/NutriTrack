/**
 * Imports targeted food records from the official USDA FoodData Central API.
 * This is a supplementary international source, not an Indian-government source.
 * Branded records are treated as packaged label records. Foundation records retain
 * unknown packaging and preparation unless the source description explicitly says otherwise.
 *
 * Required env: USDA_FDC_API_KEY, DATABASE_URL
 * Run: npm run import:usda
 */
import "dotenv/config";
import { pool } from "../db/pool";

type Nutrient = { nutrientId?: number; nutrientNumber?: string; name?: string; amount?: number; unitName?: string };
type Food = {
  fdcId: number; description: string; dataType?: string; brandOwner?: string; brandName?: string;
  gtinUpc?: string; servingSize?: number; servingSizeUnit?: string; foodNutrients?: Nutrient[];
  ingredients?: string; publicationDate?: string;
};

const API_KEY = process.env.USDA_FDC_API_KEY;
const BASE = "https://api.nal.usda.gov/fdc/v1";
const SEARCH_TERMS = ["peanuts", "rice", "chickpeas", "lentils", "almonds", "cashew nuts", "oats", "potato chips", "roasted gram", "milk"];
const NUTRIENT_IDS = { energy: 1008, protein: 1003, carbs: 1005, sugar: 2000, fat: 1004, satFat: 1258, fibre: 1079, sodium: 1093 };

function nutrientValue(food: Food, id: number): number | null {
  const match = food.foodNutrients?.find((n) => n.nutrientId === id);
  return typeof match?.amount === "number" ? match.amount : null;
}
function classifyPreparation(description: string): string {
  const d = description.toLowerCase();
  // Conservative keyword mapping only. Do not infer a preparation from a generic name.
  if (/dry.?roast|dry.?roasted/.test(d)) return "dry_roasted";
  if (/oil.?roast|oil.?roasted/.test(d)) return "oil_roasted";
  if (/fried|deep.?fried/.test(d)) return "fried";
  if (/boiled/.test(d)) return "boiled";
  if (/steamed/.test(d)) return "steamed";
  if (/baked/.test(d)) return "baked";
  if (/raw|unroasted/.test(d)) return "raw";
  return "unspecified";
}
function classifySalt(description: string): string {
  const d = description.toLowerCase();
  if (/unsalted|no salt/.test(d)) return "unsalted";
  if (/salted|salted\s/.test(d)) return "salted";
  return "unknown";
}

async function search(term: string, dataType: "Foundation" | "Branded"): Promise<Food[]> {
  const url = new URL(`${BASE}/foods/search`);
  url.searchParams.set("api_key", API_KEY!);
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: term, dataType: [dataType], pageSize: 30, pageNumber: 1 }),
  });
  if (!response.ok) throw new Error(`FDC ${dataType} search failed (${response.status}) for ${term}`);
  const json = await response.json() as { foods?: Food[] };
  return json.foods ?? [];
}

async function main() {
  if (!API_KEY) throw new Error("Set USDA_FDC_API_KEY in backend/.env. Get a free key from FoodData Central.");
  const client = await pool.connect();
  let imported = 0;
  try {
    await client.query("BEGIN");
    const sources = new Map<string, string>();
    for (const [name, type] of [["USDA FoodData Central — Foundation Foods", "usda_foundation"], ["USDA FoodData Central — Branded Foods", "usda_branded"]] as const) {
      const result = await client.query(
        `INSERT INTO nutrition_sources(source_name,source_type,source_url,licence_or_terms)
         VALUES($1,$2,'https://fdc.nal.usda.gov/','USDA FoodData Central data are CC0 1.0; attribution requested')
         ON CONFLICT(source_name) DO UPDATE SET source_type=EXCLUDED.source_type
         RETURNING id`, [name, type]
      );
      sources.set(type, result.rows[0].id);
    }

    for (const dataType of ["Foundation", "Branded"] as const) {
      const sourceType = dataType === "Foundation" ? "usda_foundation" : "usda_branded";
      for (const term of SEARCH_TERMS) {
        const foods = await search(term, dataType);
        for (const food of foods) {
          const desc = food.description?.trim();
          if (!desc) continue;
          const brand = food.brandOwner || food.brandName || null;
          const product = await client.query(
            `INSERT INTO products(name,generic_name,brand,category,barcode)
             VALUES($1,$2,$3,$4,$5)
             ON CONFLICT DO NOTHING RETURNING id`,
            [desc, desc, brand, null, food.gtinUpc || null]
          );
          let productId = product.rows[0]?.id;
          if (!productId) {
            const existing = await client.query(`SELECT id FROM products WHERE name=$1 AND COALESCE(brand,'')=COALESCE($2,'') LIMIT 1`, [desc, brand]);
            productId = existing.rows[0]?.id;
          }
          if (!productId) continue;
          const packaging = dataType === "Branded" ? "packaged" : "unknown";
          const prep = classifyPreparation(desc);
          const salt = classifySalt(desc);
          const variant = await client.query(
            `INSERT INTO product_variants(product_id,variant_name,packaging_type,preparation_method,salt_status,brand,external_source,external_record_id,source_description)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT(external_source,external_record_id) DO UPDATE SET source_description=EXCLUDED.source_description
             RETURNING id`,
            [productId, desc, packaging, prep, salt, brand, "USDA_FDC", String(food.fdcId), desc]
          );
          const variantId = variant.rows[0].id;
          const facts = {
            energy: nutrientValue(food, NUTRIENT_IDS.energy), protein: nutrientValue(food, NUTRIENT_IDS.protein),
            carbs: nutrientValue(food, NUTRIENT_IDS.carbs), sugar: nutrientValue(food, NUTRIENT_IDS.sugar),
            fat: nutrientValue(food, NUTRIENT_IDS.fat), satFat: nutrientValue(food, NUTRIENT_IDS.satFat),
            fibre: nutrientValue(food, NUTRIENT_IDS.fibre), sodium: nutrientValue(food, NUTRIENT_IDS.sodium),
          };
          await client.query(
            `INSERT INTO nutrition_facts(variant_id,source_id,basis_quantity,basis_unit,calories_kcal,protein_g,carbohydrates_g,sugar_g,fat_g,saturated_fat_g,fibre_g,sodium_mg,verification_status,raw_nutrients)
             VALUES($1,$2,100,'g',$3,$4,$5,$6,$7,$8,$9,$10,'unverified',$11::jsonb)
             ON CONFLICT(variant_id,source_id,basis_quantity,basis_unit) DO UPDATE SET
             calories_kcal=EXCLUDED.calories_kcal,protein_g=EXCLUDED.protein_g,carbohydrates_g=EXCLUDED.carbohydrates_g,
             sugar_g=EXCLUDED.sugar_g,fat_g=EXCLUDED.fat_g,saturated_fat_g=EXCLUDED.saturated_fat_g,
             fibre_g=EXCLUDED.fibre_g,sodium_mg=EXCLUDED.sodium_mg,raw_nutrients=EXCLUDED.raw_nutrients`,
            [variantId, sources.get(sourceType), facts.energy, facts.protein, facts.carbs, facts.sugar, facts.fat, facts.satFat, facts.fibre, facts.sodium, JSON.stringify(food.foodNutrients ?? [])]
          );
          imported++;
        }
      }
    }
    await client.query("COMMIT");
    console.log(`Imported/updated ${imported} USDA FoodData Central variants. All are marked unverified pending review.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); await pool.end(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
