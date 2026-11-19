/**
 * One-time importer for legacy/data/products_clean.csv.
 * Run only after DATABASE_URL is configured and schema.sql has been applied.
 * Existing CSV rows are NOT assumed to be loose/raw/roasted: classification
 * stays unknown/unspecified until supported by a reliable source.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { pool } from "../db/pool";

type LegacyRow = Record<string, string>;
async function main() {
  const csvPath = path.resolve(__dirname, "../../../legacy/data/products_clean.csv");
  const csv = await readFile(csvPath, "utf8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true, bom: true }) as LegacyRow[];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const source = await client.query(
      `INSERT INTO nutrition_sources(source_name, source_type)
       VALUES ('Open Food Facts', 'open_food_facts')
       ON CONFLICT DO NOTHING RETURNING id`
    );
    let sourceId = source.rows[0]?.id;
    if (!sourceId) {
      const existing = await client.query("SELECT id FROM nutrition_sources WHERE source_name='Open Food Facts' LIMIT 1");
      sourceId = existing.rows[0].id;
    }

    for (const row of rows) {
      const product = await client.query(
        `INSERT INTO products(legacy_product_id,name,generic_name,brand,category,barcode)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(legacy_product_id) DO UPDATE SET
           name=EXCLUDED.name, generic_name=EXCLUDED.generic_name,
           brand=EXCLUDED.brand, category=EXCLUDED.category, barcode=EXCLUDED.barcode
         RETURNING id`,
        [row.product_id, row.product_name, row.generic_name || null, row.brand || null, row.category || null, row.barcode || null]
      );
      const productId = product.rows[0].id;
      const variantName = row.product_name || "Imported variant";
      const variant = await client.query(
        `INSERT INTO product_variants(product_id,variant_name,packaging_type,preparation_method,salt_status,brand,serving_size_text,is_imported_legacy)
         VALUES($1,$2,'unknown','unspecified','unknown',$3,$4,TRUE)
         ON CONFLICT(product_id,variant_name,packaging_type,preparation_method,salt_status)
         DO UPDATE SET serving_size_text=EXCLUDED.serving_size_text
         RETURNING id`,
        [productId, variantName, row.brand || null, row.serving_size || null]
      );
      const n = (key: string) => row[key] === "" || row[key] === "NA" ? null : Number(row[key]);
      const sodiumMg = n("sodium_100g") === null ? null : Number(n("sodium_100g")) * 1000;
      await client.query(
        `INSERT INTO nutrition_facts(
          variant_id,source_id,basis_quantity,basis_unit,calories_kcal,protein_g,carbohydrates_g,
          sugar_g,fat_g,saturated_fat_g,fibre_g,sodium_mg,verification_status
         ) VALUES($1,$2,100,'g',$3,$4,$5,$6,$7,$8,$9,$10,'unverified')
         ON CONFLICT(variant_id,source_id,basis_quantity,basis_unit) DO UPDATE SET
           calories_kcal=EXCLUDED.calories_kcal, protein_g=EXCLUDED.protein_g,
           carbohydrates_g=EXCLUDED.carbohydrates_g, sugar_g=EXCLUDED.sugar_g,
           fat_g=EXCLUDED.fat_g, saturated_fat_g=EXCLUDED.saturated_fat_g,
           fibre_g=EXCLUDED.fibre_g, sodium_mg=EXCLUDED.sodium_mg,
           verification_status='unverified'`,
        [variant.rows[0].id, sourceId, n("calories_100g"), n("protein_100g"), n("carbohydrates_100g"),
         n("sugar_100g"), n("fat_100g"), n("saturated_fat_100g"), n("fiber_100g"), sodiumMg]
      );
    }
    await client.query("COMMIT");
    console.log(`Imported ${rows.length} legacy product rows as unverified baseline variants.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((error) => { console.error(error); process.exit(1); });
