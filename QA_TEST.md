# QA Test Results
**Date:** 2026-03-28T13:30:00Z
**QA Cycle:** 1
**Overall:** 8/28 tests passed

## Summary
- Total tests: 28
- Passed: 8
- Failed: 20
- Critical failures: 3

## Critical Failures (blocks release)

### CRIT-001: No API routes exist
- **Story:** US-002, US-003, US-004, US-005, US-006, US-009
- **Test:** POST /api/crawl/sns, /api/crawl/community, /api/crawl, /api/products, /api/recommend, /api/price-refresh, /api/exchange-rate, /api/crawl/prices
- **Expected:** Each endpoint returns 200 with JSON response
- **Actual:** ALL endpoints return HTTP 404
- **Severity:** CRITICAL
- **Fix needed:** Create all API route handlers under src/app/api/

### CRIT-002: No page routes beyond landing
- **Story:** US-008, US-010, US-012
- **Test:** GET /recommend, /list, /list/[token]
- **Expected:** Each page loads with HTTP 200
- **Actual:** ALL return HTTP 404
- **Severity:** CRITICAL
- **Fix needed:** Create page components: src/app/recommend/page.tsx, src/app/list/page.tsx, src/app/list/[token]/page.tsx

### CRIT-003: Landing page is a bare stub
- **Story:** US-007
- **Test:** Landing page has direction selector, stats, refresh button
- **Expected:** Two direction cards (US->KR, KR->US), live stats, refresh button
- **Actual:** Only `<h1>AJT-gift</h1>` — no direction cards, no stats, no refresh button, no anonymous UUID
- **Severity:** CRITICAL
- **Fix needed:** Implement full landing page with direction selector, live stats, and refresh trends button

## Failures (should fix)

### FAIL-001: No crawler implementations
- **Story:** US-002
- **Test:** Check src/lib/crawlers/ for reddit.ts, tiktok.ts, instagram.ts, apify-client.ts
- **Expected:** Crawler files exist with Apify integration
- **Actual:** src/lib/crawlers/ directory does not exist
- **Severity:** HIGH
- **Fix needed:** Implement all Phase 1 SNS crawlers

### FAIL-002: No community crawlers
- **Story:** US-003
- **Test:** Check src/lib/crawlers/ for youtube.ts, google-search.ts, naver.ts
- **Expected:** Community crawler files exist
- **Actual:** Missing — no crawlers directory at all
- **Severity:** HIGH
- **Fix needed:** Implement Phase 1 community crawlers

### FAIL-003: No AI extractor
- **Story:** US-004
- **Test:** Check src/lib/crawlers/ai-extractor.ts and pipeline.ts
- **Expected:** AI extraction module with country-exclusive focus prompt
- **Actual:** Missing
- **Severity:** HIGH
- **Fix needed:** Implement AI product extraction with GPT-4o

### FAIL-004: No price lookup
- **Story:** US-005
- **Test:** POST /api/price-refresh
- **Expected:** Returns marketplace prices from SerpAPI
- **Actual:** 404
- **Severity:** HIGH
- **Fix needed:** Implement Phase 2 price lookup with SerpAPI Google Shopping

### FAIL-005: No fallback seed data
- **Story:** US-006
- **Test:** Check src/data/fallback-products.ts
- **Expected:** 10-15 hardcoded country-exclusive products
- **Actual:** File does not exist
- **Severity:** HIGH
- **Fix needed:** Create fallback products dataset

### FAIL-006: No recipient profile page
- **Story:** US-008
- **Test:** GET /recommend?direction=us_to_kr
- **Expected:** Form with age/gender/relationship + free text + skip option
- **Actual:** 404
- **Severity:** HIGH
- **Fix needed:** Create /recommend page with profile input form

### FAIL-007: No recommendation results page
- **Story:** US-010
- **Test:** GET /recommend with query params showing results
- **Expected:** Product cards with filters, price links, country-exclusive badges
- **Actual:** 404
- **Severity:** HIGH
- **Fix needed:** Create results page with product cards, client-side filters, price comparison links

### FAIL-008: No shopping list feature
- **Story:** US-012
- **Test:** GET /list, add-to-list functionality
- **Expected:** Shopping list page with items, share link
- **Actual:** 404
- **Severity:** HIGH
- **Fix needed:** Implement shopping list with Supabase persistence and share links

### FAIL-009: No currency conversion
- **Story:** US-013
- **Test:** GET /api/exchange-rate
- **Expected:** Returns USD/KRW rate
- **Actual:** 404
- **Severity:** MEDIUM
- **Fix needed:** Implement exchange rate API with exchangerate-api.com

### FAIL-010: No visual polish / responsive design
- **Story:** US-013
- **Test:** Check for header, footer, responsive layout, smooth loading states
- **Expected:** Consistent theme, header with cart, footer with "Built at Ralphthon SF 2026"
- **Actual:** Bare page with no header/footer/navigation
- **Severity:** MEDIUM
- **Fix needed:** Add header, footer, navigation, loading skeletons

### FAIL-011: OPENAI_API_KEY is empty
- **Story:** US-004, US-009
- **Test:** Check .env for OPENAI_API_KEY
- **Expected:** Valid API key set
- **Actual:** OPENAI_API_KEY= (empty string)
- **Severity:** HIGH
- **Fix needed:** Set OPENAI_API_KEY in .env — AI extraction and recommendations will fail without it

### FAIL-012: Landing page missing KR->US direction
- **Story:** US-007
- **Test:** Check landing page HTML for both direction options
- **Expected:** Two cards: US->KR and KR->US
- **Actual:** Only "AJT-gift" heading, no direction cards at all
- **Severity:** HIGH (part of CRIT-003)
- **Fix needed:** Implement direction selector

## Passed Tests
- [x] US-001: pnpm install succeeds
- [x] US-001: pnpm dev starts without errors -> HTTP 200 on /
- [x] US-001: pnpm build succeeds (production build clean)
- [x] US-001: pnpm typecheck passes (tsc --noEmit clean)
- [x] US-001: Supabase migration SQL exists (supabase/migrations/001_initial_schema.sql)
- [x] US-001: All 5 Supabase tables accessible (products, product_prices, crawl_runs, shopping_lists, shopping_list_items)
- [x] US-001: TypeScript types in src/types/database.ts match all 5 tables
- [x] US-001: .env.example has all required env vars (9 vars listed)

## Story-by-Story Assessment

| Story | Title | Status | Notes |
|-------|-------|--------|-------|
| US-001 | Project scaffolding + Supabase schema | PARTIAL | Build/types/DB done, but missing serpapi dep, landing page is stub |
| US-002 | Phase 1 SNS crawlers | NOT STARTED | No crawler files exist |
| US-003 | Phase 1 community crawlers | NOT STARTED | No crawler files exist |
| US-004 | AI product extraction | NOT STARTED | No ai-extractor.ts, OPENAI_API_KEY empty |
| US-005 | Phase 2 price lookup | NOT STARTED | No API route |
| US-006 | Fallback seed data | NOT STARTED | No fallback-products.ts |
| US-007 | Landing page | PARTIAL | Title renders, but no direction cards/stats/refresh |
| US-008 | Recipient profile input | NOT STARTED | /recommend returns 404 |
| US-009 | AI recommendation API | NOT STARTED | /api/recommend returns 404 |
| US-010 | Results page with filters | NOT STARTED | No results UI |
| US-012 | Shopping list + share | NOT STARTED | /list returns 404 |
| US-013 | Currency + tags + polish | NOT STARTED | No exchange rate API, no header/footer |
| US-014 | E2E smoke test | BLOCKED | Cannot test — most features missing |

## New Test Cases Discovered
- [ ] Verify `serpapi` package is in package.json dependencies (currently missing — needed for US-005)
- [ ] Verify `globals.css` Tailwind custom theme tokens (bg-surface-primary, text-fg-primary) actually apply visible styling
- [ ] Test that Supabase RLS policies allow anonymous inserts (needed for shopping list)
- [ ] Verify products table UNIQUE(name, direction) constraint works with upsert
- [ ] Test trending_score CHECK constraint (1-100) rejects out-of-range values

## PRD Changes Required
- **PRD-WATCH-001:** `OPENAI_API_KEY` is empty in .env. Ralph needs to set this or US-004/US-009 will fail. **User action required.**
- **PRD-NOTE-001:** `serpapi` npm package is not in package.json dependencies. US-005 requires it.

## Next Steps
- Waiting for Ralph to implement US-001 fully (landing page) and US-002+ (crawlers, API routes, pages)
- Will re-run full QA cycle after next commit
