/**
 * Imports a reviewed, normalized transcription of ICMR-NIN IFCT 2017 records.
 * Input: database/import_templates/ifct2017_foods.csv
 * The source book is a PDF, so this import intentionally requires human-reviewed
 * transcription into the template; it does not pretend an unverified scrape is official data.
 * Run: npm run import:ifct
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { pool } from "../db/pool";

type Row = Record<string, string>;
const num = (v?: string): number | null => !v || !v.trim() ? null : Number(v);

async function main() {
  if (process.env.IFCT_DATA_PERMISSION_CONFIRMED !== "true") {
    throw new Error("Do not import IFCT values into the app database until you have written permission from ICMR-NIN. Set IFCT_DATA_PERMISSION_CONFIRMED=true only after permission is obtained.");
  }
  const csvPath = path.resolve(__dirname, "../../../database/import_templates/ifct2017_foods.csv");
  const rows = parse(await readFile(csvPath, "utf8"), { columns: true, skip_empty_lines: true, bom: true }) as Row[];
  if (!rows.length) throw new Error(`No IFCT rows found. Fill the reviewed template first: ${csvPath}`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const source = await client.query(
      `INSERT INTO nutrition_sources(source_name,source_type,source_url,source_reference,licence_or_terms)
       VALUES('ICMR-NIN Indian Food Composition Tables 2017','ifct','https://nin.res.in/ebooks/IFCT2017.pdf','Longvah et al., IFCT 2017','Use subject to source publication terms; cite ICMR-NIN')
       ON CONFLICT(source_name) DO UPDATE SET source_url=EXCLUDED.source_url RETURNING id`
    );
    const sourceId = source.rows[0].id;
    for (const row of rows) {
      if (!row.ifct_food_code || !row.food_name) throw new Error("Each IFCT row requires ifct_food_code and food_name.");
      const product = await client.query(
        `INSERT INTO products(legacy_product_id,name,generic_name,category)
         VALUES($1,$2,$2,$3) ON CONFLICT(legacy_product_id) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
        [`IFCT2017:${row.ifct_food_code}`, row.food_name, row.food_group || null]
      );
      const productId = product.rows[0].id;
      const variant = await client.query(
        `INSERT INTO product_variants(product_id,variant_name,packaging_type,preparation_method,salt_status,external_source,external_record_id,source_description)
         VALUES($1,$2,'unknown','raw','unknown','ICMR_NIN_IFCT2017',$3,$4)
         ON CONFLICT(external_source,external_record_id) DO UPDATE SET source_description=EXCLUDED.source_description RETURNING id`,
        [productId, `${row.food_name} — IFCT 2017 raw food`, row.ifct_food_code, `${row.ifct_table_reference || "IFCT 2017"}; page ${row.page_number || "not recorded"}; ${row.notes || ""}`]
      );
      const energyKj = num(row.energy_kj);
      const calories = energyKj === null ? null : energyKj / 4.184;
      await client.query(
        `INSERT INTO nutrition_facts(variant_id,source_id,basis_quantity,basis_unit,energy_kj,calories_kcal,protein_g,carbohydrates_g,sugar_g,fat_g,saturated_fat_g,fibre_g,sodium_mg,verification_status)
         VALUES($1,$2,100,'g',$3,$4,$5,$6,$7,$8,$9,$10,$11,'unverified')
         ON CONFLICT(variant_id,source_id,basis_quantity,basis_unit) DO UPDATE SET
         energy_kj=EXCLUDED.energy_kj,calories_kcal=EXCLUDED.calories_kcal,protein_g=EXCLUDED.protein_g,
         carbohydrates_g=EXCLUDED.carbohydrates_g,sugar_g=EXCLUDED.sugar_g,fat_g=EXCLUDED.fat_g,
         saturated_fat_g=EXCLUDED.saturated_fat_g,fibre_g=EXCLUDED.fibre_g,sodium_mg=EXCLUDED.sodium_mg`,
        [variant.rows[0].id, sourceId, energyKj, calories, num(row.protein_g), num(row.carbohydrates_g), num(row.sugar_g), num(row.fat_g), num(row.saturated_fat_g), num(row.fibre_g), num(row.sodium_mg)]
      );
    }
    await client.query("COMMIT");
    console.log(`Imported ${rows.length} reviewed IFCT 2017 food rows. Verify each row against the cited IFCT table/page before changing status to verified.`);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await pool.end(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
