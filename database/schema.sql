CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  dietary_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
  allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
  height_cm NUMERIC(6,2),
  weight_kg NUMERIC(6,2),
  target_weight_kg NUMERIC(6,2),
  activity_level TEXT,
  goal_type TEXT,
  meals_per_day INTEGER,
  sex_for_estimate TEXT
);

CREATE TABLE IF NOT EXISTS nutrition_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL UNIQUE,
  source_reference TEXT,
  source_url TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('ifct','usda_foundation','usda_branded','manufacturer_label','open_food_facts','other')),
  licence_or_terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_product_id TEXT UNIQUE,
  name TEXT NOT NULL,
  generic_name TEXT,
  brand TEXT,
  category TEXT,
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING GIN (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  packaging_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (packaging_type IN ('loose','packaged','unknown')),
  preparation_method TEXT NOT NULL DEFAULT 'unspecified'
    CHECK (preparation_method IN ('raw','dry_roasted','oil_roasted','fried','boiled','steamed','baked','fermented','other','unspecified')),
  salt_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (salt_status IN ('salted','unsalted','unknown')),
  brand TEXT,
  serving_size_text TEXT,
  external_source TEXT,
  external_record_id TEXT,
  source_description TEXT,
  is_imported_legacy BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(external_source, external_record_id),
  UNIQUE(product_id, variant_name, packaging_type, preparation_method, salt_status)
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_classification ON product_variants(packaging_type, preparation_method, salt_status);

CREATE TABLE IF NOT EXISTS nutrition_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  source_id UUID REFERENCES nutrition_sources(id) ON DELETE SET NULL,
  basis_quantity NUMERIC(10,2) NOT NULL DEFAULT 100 CHECK (basis_quantity > 0),
  basis_unit TEXT NOT NULL DEFAULT 'g',
  energy_kj NUMERIC(10,3),
  calories_kcal NUMERIC(10,3),
  protein_g NUMERIC(10,3),
  carbohydrates_g NUMERIC(10,3),
  sugar_g NUMERIC(10,3),
  fat_g NUMERIC(10,3),
  saturated_fat_g NUMERIC(10,3),
  fibre_g NUMERIC(10,3),
  sodium_mg NUMERIC(12,3),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('verified','unverified','unavailable')),
  verified_at TIMESTAMPTZ,
  raw_nutrients JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(variant_id, source_id, basis_quantity, basis_unit)
);
CREATE INDEX IF NOT EXISTS idx_nutrition_variant ON nutrition_facts(variant_id);

CREATE TABLE IF NOT EXISTS nutrition_goals (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  target_calories_kcal NUMERIC(10,2),
  target_protein_g NUMERIC(10,2),
  max_sugar_g NUMERIC(10,2),
  max_sodium_mg NUMERIC(12,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS baskets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS basket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity_g NUMERIC(10,2) NOT NULL CHECK (quantity_g > 0),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(basket_id, variant_id)
);
CREATE TABLE IF NOT EXISTS basket_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
