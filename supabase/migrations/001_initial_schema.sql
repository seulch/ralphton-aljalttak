-- AJT-gift: Initial schema
-- 5 tables: products, product_prices, crawl_runs, shopping_lists, shopping_list_items

-- ==================== PRODUCTS (Phase 1 output) ====================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_localized text,
  direction text NOT NULL CHECK (direction IN ('us_to_kr', 'kr_to_us')),
  category text NOT NULL CHECK (category IN ('food', 'beauty', 'health', 'tech', 'fashion', 'home')),
  estimated_us_price numeric,
  estimated_kr_price numeric,
  is_country_exclusive boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}',
  why_popular text NOT NULL DEFAULT '',
  trending_score int NOT NULL DEFAULT 0 CHECK (trending_score >= 1 AND trending_score <= 100),
  source text NOT NULL,
  source_url text,
  best_for_age text[] DEFAULT '{}',
  best_for_interests text[] DEFAULT '{}',
  best_for_relationship text[] DEFAULT '{}',
  image_url text,
  last_crawled_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, direction)
);

-- ==================== PRODUCT_PRICES (Phase 2 output) ====================
CREATE TABLE IF NOT EXISTS product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  country text NOT NULL CHECK (country IN ('us', 'kr')),
  store_name text NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  product_link text NOT NULL,
  rank int NOT NULL CHECK (rank >= 1 AND rank <= 3),
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(product_id, country, store_name)
);

-- ==================== CRAWL_RUNS ====================
CREATE TABLE IF NOT EXISTS crawl_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  phase text NOT NULL CHECK (phase IN ('phase1_sns', 'phase1_community', 'phase2_prices', 'pipeline')),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  items_found int DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error text
);

-- ==================== SHOPPING_LISTS ====================
CREATE TABLE IF NOT EXISTS shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id uuid NOT NULL,
  share_token text UNIQUE NOT NULL,
  name text DEFAULT 'My Gift List',
  direction text NOT NULL CHECK (direction IN ('us_to_kr', 'kr_to_us')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==================== SHOPPING_LIST_ITEMS ====================
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  custom_name text,
  quantity int NOT NULL DEFAULT 1,
  checked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_products_direction_score ON products(direction, trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_exclusive ON products(is_country_exclusive) WHERE is_country_exclusive = true;
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_id, country);
CREATE INDEX IF NOT EXISTS idx_product_prices_expiry ON product_prices(expires_at);
CREATE INDEX IF NOT EXISTS idx_crawl_runs_phase ON crawl_runs(phase, status);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_anon ON shopping_lists(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_token ON shopping_lists(share_token);

-- ==================== RLS ====================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Public SELECT on all tables
CREATE POLICY "public_select_products" ON products FOR SELECT USING (true);
CREATE POLICY "public_select_prices" ON product_prices FOR SELECT USING (true);
CREATE POLICY "public_select_crawl_runs" ON crawl_runs FOR SELECT USING (true);
CREATE POLICY "public_select_shopping_lists" ON shopping_lists FOR SELECT USING (true);
CREATE POLICY "public_select_shopping_list_items" ON shopping_list_items FOR SELECT USING (true);

-- Public INSERT/UPDATE on products, product_prices, crawl_runs
CREATE POLICY "public_insert_products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_products" ON products FOR UPDATE USING (true);
CREATE POLICY "public_insert_prices" ON product_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_prices" ON product_prices FOR UPDATE USING (true);
CREATE POLICY "public_insert_crawl_runs" ON crawl_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_crawl_runs" ON crawl_runs FOR UPDATE USING (true);

-- Public INSERT/UPDATE/DELETE on shopping_lists, shopping_list_items
CREATE POLICY "public_insert_shopping_lists" ON shopping_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_shopping_lists" ON shopping_lists FOR UPDATE USING (true);
CREATE POLICY "public_delete_shopping_lists" ON shopping_lists FOR DELETE USING (true);
CREATE POLICY "public_insert_shopping_list_items" ON shopping_list_items FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_shopping_list_items" ON shopping_list_items FOR UPDATE USING (true);
CREATE POLICY "public_delete_shopping_list_items" ON shopping_list_items FOR DELETE USING (true);
