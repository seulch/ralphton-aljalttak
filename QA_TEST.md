# QA Test Results
**Date:** 2026-03-28T14:00:00Z
**QA Cycle:** 2
**Overall:** 35/52 tests passed

## Summary
- Total tests: 52
- Passed: 35
- Failed: 14
- Warnings: 3
- Critical failures: 2

## Critical Failures (blocks release)

### CRIT-001: SNS crawlers return 0 results (Reddit, TikTok, Instagram)
- **Story:** US-002
- **Test:** POST /api/crawl/sns → check textsCount > 0 for at least 2 of 3 sources
- **Expected:** At least 2 sources return texts
- **Actual:** All 3 return `textsCount: 0, urlsCount: 0`
- **Severity:** CRITICAL
- **Evidence:** `{"success":true,"data":[{"source":"reddit","textsCount":0},{"source":"tiktok","textsCount":0},{"source":"instagram","textsCount":0}]}`
- **Fix needed:** Apify crawlers silently returning empty results. Either Apify free credits exhausted, actor IDs incorrect, or input format wrong. Need to check Apify dashboard or add better error logging. The crawl_runs table shows `phase1_sns` completed with `items_found: 0`.

### CRIT-002: No real price data — product_link is "#" placeholder
- **Story:** US-005, US-010
- **Test:** POST /api/price-refresh → verify returns real store URLs
- **Expected:** 1-3 stores with real clickable URLs from SerpAPI
- **Actual:** Returns `{"store_name":"Estimated","price":3.49,"product_link":"#","rank":1}` — estimated fallback only, not real marketplace links
- **Evidence:** DB product_prices table is EMPTY after both single and batch price refresh. SerpAPI either returns no whitelisted results or the whitelist filtering is too strict.
- **Severity:** CRITICAL
- **Fix needed:** Debug SerpAPI integration. Check if SERPAPI_KEY is valid and has remaining credits. The `lookupPrice()` function returns `[]` when no whitelisted stores found, causing fallback to estimated prices. Try relaxing whitelist matching (e.g., "Amazon.com" vs "Amazon") or log raw SerpAPI response.

## Failures (should fix)

### FAIL-001: AI personalization not working — OPENAI_API_KEY empty
- **Story:** US-004, US-009
- **Test:** POST /api/recommend → check personalized=true, aiSuggestions.length > 0
- **Expected:** AI-personalized recommendations with ai_reason and aiSuggestions
- **Actual:** `"personalized":false`, `"aiSuggestions":[]`, no `ai_reason` on products
- **Severity:** HIGH
- **Fix needed:** Set OPENAI_API_KEY in .env. Without it, AI extraction (US-004) and AI recommendations (US-009) both fall back to non-personalized DB sort.

### FAIL-002: Results page missing tag badges in SSR (client-render concern)
- **Story:** US-010
- **Test:** curl /recommend page → check for sns_recommended, community_recommended, "Trending on SNS", "Community Pick" text
- **Expected:** Tag badges visible in page HTML
- **Actual:** Tags not found in curl output. Page may render client-side only — needs browser verification.
- **Severity:** MEDIUM
- **Fix needed:** Verify tags render in actual browser. If client-only, this is OK but SEO impact. If tags component is missing, implement it.

### FAIL-003: Results page missing "Add to List" button in SSR
- **Story:** US-010, US-012
- **Test:** curl /recommend → check for "Add to List" or similar
- **Expected:** Add-to-list button on product cards
- **Actual:** Not found in curl output — likely client-rendered
- **Severity:** MEDIUM
- **Fix needed:** Verify in actual browser. Ensure ProductCard component has add-to-list button wired to /api/list.

### FAIL-004: Results page missing price section in SSR
- **Story:** US-010
- **Test:** curl /recommend → check for buy/price/store elements
- **Expected:** Price comparison links on product cards
- **Actual:** Not found in curl output — likely client-rendered. Even if present, prices would show "#" links due to CRIT-002.
- **Severity:** MEDIUM (dependent on CRIT-002)
- **Fix needed:** Verify in browser. Fix CRIT-002 first to get real price data.

### FAIL-005: No loading skeleton detected
- **Story:** US-010, US-013
- **Test:** Check results page HTML for skeleton/loading/spinner components
- **Expected:** Loading skeleton while AI processes
- **Actual:** No skeleton-related text in HTML
- **Severity:** LOW
- **Fix needed:** May be client-rendered with JS. Verify in browser.

### FAIL-006: Crawl prices batch reports updated:12 but DB is empty
- **Story:** US-005
- **Test:** POST /api/crawl/prices → check product_prices table
- **Expected:** product_prices table has entries after batch crawl
- **Actual:** API returns `{"success":true,"data":{"updated":12}}` but product_prices table has 0 rows
- **Severity:** HIGH
- **Fix needed:** The batch endpoint may be calling `lookupPrice()` which returns `[]` (due to SerpAPI returning no whitelisted results), so `refreshProductPrices()` skips the DB insert. The "updated:12" count is misleading — it counts attempts, not successful inserts. Fix the metric or the underlying SerpAPI issue.

### FAIL-007: Products API returns 200 with no direction param
- **Story:** US-006
- **Test:** GET /api/products (no direction query param)
- **Expected:** Should require direction or return helpful error
- **Actual:** Returns 200 — unclear what data is returned
- **Severity:** LOW
- **Fix needed:** Consider requiring direction param or documenting that it returns all products.

## Warnings

### WARN-001: "error" text detected on landing page
- **Test:** Check page HTML for error/500/Internal text
- **Actual:** grep found match — likely a false positive from JS bundle or error boundary code, not an actual visible error
- **Severity:** INFO

### WARN-002: Recommend API falls back silently without OpenAI
- **Test:** No error message when OPENAI_API_KEY missing
- **Expected:** At minimum, meta should indicate fallback mode
- **Actual:** Returns `"personalized":false` but no warning about missing API key
- **Severity:** LOW

### WARN-003: product_prices DELETE policy missing
- **Test:** RLS check
- **Actual:** product_prices has INSERT/UPDATE/SELECT but no DELETE policy. `refreshProductPrices()` calls `.delete()` before insert — this will fail silently with RLS enabled.
- **Severity:** MEDIUM
- **Fix needed:** Add DELETE policy for product_prices table, or prices will never refresh.

## Passed Tests

### US-001: Project Scaffolding + Supabase Schema
- [x] pnpm install succeeds
- [x] pnpm dev starts → HTTP 200
- [x] pnpm build succeeds (production build clean)
- [x] pnpm typecheck passes (tsc --noEmit clean)
- [x] Migration SQL exists (supabase/migrations/001_initial_schema.sql)
- [x] All 5 Supabase tables accessible and responding
- [x] TypeScript types in src/types/database.ts match all 5 tables
- [x] .env.example has all 9 required env vars
- [x] RLS enabled on all 5 tables with appropriate policies

### US-003: Phase 1 Community Crawlers
- [x] POST /api/crawl/community returns 200
- [x] YouTube returns 62 texts
- [x] Google Search returns 43 texts
- [x] Naver returns 60 texts
- [x] Total: 165 texts from 3 sources (exceeds threshold)
- [x] Crawl run logged in DB: phase1_community, status=completed, items_found=137

### US-006: Fallback Seed Data
- [x] GET /api/products?direction=us_to_kr returns 6 products
- [x] GET /api/products?direction=kr_to_us returns 6 products
- [x] All 12 products are country-exclusive (is_country_exclusive=true)
- [x] No globally available products (no AirPods, Nike, Samsung)
- [x] Has Korean exclusive products (Olive Young, Korean Seaweed, Red Ginseng, Daiso Korea)
- [x] Products have sns_recommended and community_recommended tags
- [x] Products ordered by trending_score DESC

### US-007: Landing Page
- [x] Has AJT-gift title
- [x] Has US→KR direction card
- [x] Has KR→US direction card
- [x] Has stats/tagline about tracking gifts
- [x] Has refresh trends button
- [x] Has direction concept throughout

### US-008: Recipient Profile Input
- [x] /recommend page loads → HTTP 200
- [x] Has age field (20s/30s/40s)
- [x] Has gender field (male/female)
- [x] Has relationship field (parents/friends/coworkers)
- [x] Has free-text input ("Tell us about them")
- [x] Has skip option ("Show me everything")

### US-009: AI Recommendation API (partial)
- [x] POST /api/recommend returns 200 with valid JSON
- [x] Returns recommendations array with products
- [x] Returns meta with totalProducts and direction
- [x] Handles Korean text input in freeText
- [x] Returns proper error for missing direction

### US-010: Results Page (partial)
- [x] /recommend page loads with query params → HTTP 200
- [x] Has category filter chips (food/beauty/health/tech/fashion/home)
- [x] Has budget filter
- [x] Has sort options

### US-012: Shopping List (partial)
- [x] /list page loads → HTTP 200
- [x] /list/[token] page loads → HTTP 200
- [x] Has list title concept
- [x] Has share concept
- [x] Has empty state message

### US-013: Currency + Polish (partial)
- [x] GET /api/exchange-rate returns `{"rate":1509.02,"currency":"KRW"}` — live rate from API
- [x] Has header/nav component
- [x] Has footer
- [x] Has viewport meta tag for responsive design

### Edge Cases
- [x] Invalid direction returns empty array (graceful)
- [x] Empty recommend body returns proper error message
- [x] Korean text input handled correctly (6 products returned)
- [x] Missing price-refresh fields returns validation error

## Story-by-Story Assessment

| Story | Title | Status | Score | Notes |
|-------|-------|--------|-------|-------|
| US-001 | Scaffolding + Schema | PASS | 9/9 | All infrastructure working |
| US-002 | SNS Crawlers (Apify) | FAIL | 1/5 | CRIT: All 3 return 0 results |
| US-003 | Community Crawlers | PASS | 5/5 | YouTube, Google, Naver all working |
| US-004 | AI Extraction | BLOCKED | 0/5 | OPENAI_API_KEY empty |
| US-005 | Price Lookup | FAIL | 2/6 | CRIT: No real prices, product_link="#" |
| US-006 | Fallback Seed Data | PASS | 7/7 | All 12 products excellent quality |
| US-007 | Landing Page | PASS | 6/6 | Direction cards, stats, refresh all present |
| US-008 | Profile Input | PASS | 6/6 | All fields present, skip option works |
| US-009 | AI Recommendations | PARTIAL | 5/8 | API works but no AI personalization |
| US-010 | Results Page | PARTIAL | 3/8 | Filters present, but tags/prices/add-to-list need browser verify |
| US-012 | Shopping List | PARTIAL | 5/7 | Pages load, need browser test for full flow |
| US-013 | Currency + Polish | PARTIAL | 4/7 | Exchange rate works, header/footer present |
| US-014 | E2E Smoke Test | PARTIAL | 3/7 | App runs, but price links broken |

## New Test Cases Discovered
- [ ] Verify product_prices RLS has DELETE policy (WARN-003)
- [ ] Test Apify actor runs directly via curl to isolate crawler failure
- [ ] Test SerpAPI directly to check if key is valid and has credits
- [ ] Browser test: verify client-rendered components (tags, add-to-list, price links, skeleton)
- [ ] Test crawl rate limiting (1h cooldown, 3x/day limit)
- [ ] Test shopping list full flow: create list → add item → get share token → view shared list
- [ ] Verify anonymous UUID cookie is set on first visit
- [ ] Test concurrent crawl requests (should they be queued?)

## PRD Changes Required
- **PRD-WATCH-001:** `OPENAI_API_KEY` is empty in .env. **User action required** — US-004 and US-009 blocked.
- **PRD-BUG-001:** product_prices table missing DELETE RLS policy. `refreshProductPrices()` will silently fail when trying to delete old prices before inserting new ones.
- **PRD-BUG-002:** /api/crawl/prices "updated" count is misleading — counts attempts not successful inserts. When SerpAPI returns no whitelisted results, shows updated:12 but DB has 0 rows.

## Next Steps
- **Priority 1:** Fix CRIT-001 (SNS crawlers) — debug Apify integration
- **Priority 2:** Fix CRIT-002 (price data) — debug SerpAPI, add DELETE RLS policy for product_prices
- **Priority 3:** Set OPENAI_API_KEY to unblock AI features
- **Priority 4:** Browser-verify client-rendered components (tags, add-to-list, prices)
- Will re-run full QA cycle after next commit
