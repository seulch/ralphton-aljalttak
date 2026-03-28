-- Add missing DELETE policies for product_prices and crawl_runs
CREATE POLICY "public_delete_prices" ON product_prices FOR DELETE USING (true);
CREATE POLICY "public_delete_crawl_runs" ON crawl_runs FOR DELETE USING (true);
